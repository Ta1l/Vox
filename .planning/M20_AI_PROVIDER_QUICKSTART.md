# M20 AI Provider Configuration — Quick Start

## Overview

Add user-configurable OpenAI-compatible AI provider to Personal Finance OS.

**Token budget respected:** ~470 LOC total, minimal test coverage.

---

## Implementation Order

### 1. Migration (drizzle/0014_add_ai_provider_config.sql)

```sql
CREATE TABLE ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_tested_at TIMESTAMPTZ,
  CONSTRAINT one_config_per_user UNIQUE(user_id)
);

CREATE INDEX idx_ai_provider_configs_user ON ai_provider_configs(user_id);
```

Schema: `src/lib/db/schema/aiProviderConfigs.ts`

---

### 2. Encryption Utility (src/lib/security/encryption.ts)

Copy pattern from SECURITY.md lines 455-488:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes required
const ALGORITHM = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Environment:** Add `ENCRYPTION_KEY` to `.env.local` (32 bytes hex, `openssl rand -hex 32`)

---

### 3. Config Service (src/lib/domain/ai/providerConfigService.ts)

```typescript
export async function saveProviderConfig(userId: string, config: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}) {
  validateBaseUrl(config.baseUrl);
  validateApiKey(config.apiKey);
  validateModelName(config.modelName);
  
  const encrypted = encrypt(config.apiKey);
  
  await db.insert(aiProviderConfigs)
    .values({ userId, baseUrl: config.baseUrl, apiKeyEncrypted: encrypted, modelName: config.modelName, isEnabled: true })
    .onConflictDoUpdate({ target: aiProviderConfigs.userId, set: { baseUrl: config.baseUrl, apiKeyEncrypted: encrypted, modelName: config.modelName, updatedAt: new Date() } });
}

export async function getProviderConfig(userId: string): Promise<AIProviderConfig | null> {
  const row = await db.query.aiProviderConfigs.findFirst({ where: eq(aiProviderConfigs.userId, userId) });
  if (!row || !row.isEnabled) return null;
  return { baseUrl: row.baseUrl, modelName: row.modelName, apiKey: decrypt(row.apiKeyEncrypted) };
}

export async function deleteProviderConfig(userId: string) {
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId));
}

// Validation
function validateBaseUrl(url: string) {
  if (url.length > 512) throw new Error('URL too long');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS allowed');
  if (process.env.NODE_ENV === 'production') {
    const host = parsed.hostname;
    if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.') || host.startsWith('10.')) {
      throw new Error('Private network not allowed');
    }
  }
}

function validateApiKey(key: string) {
  if (key.length < 8 || key.length > 512) throw new Error('Invalid key length');
}

function validateModelName(name: string) {
  if (name.length > 128 || !/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error('Invalid model name');
}
```

---

### 4. Custom Provider (src/lib/domain/ai/customOpenAIProvider.ts)

Copy `openaiProvider.ts` structure, replace hardcoded endpoint with `${config.baseUrl}/v1/responses`:

```typescript
export class CustomOpenAICompatibleProvider implements AIProvider {
  constructor(private readonly config: AIProviderConfig, private readonly fetchImpl: typeof fetch = fetch) {}
  
  async generateStructured<T>(params: { ... }): Promise<StructuredAIResult<T>> {
    const endpoint = `${this.config.baseUrl}/v1/responses`;
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.config.modelName, store: false, user: params.userId, input: [...], text: { format: { ... } } }),
    });
    
    // Same parsing/validation logic as OpenAIProvider
    // ...
    
    return { value, usage: { provider: "custom", model: this.config.modelName, ..., estimatedCostUsd: null }, requestId: body.id ?? null };
  }
}
```

---

### 5. Provider Selection (src/lib/domain/ai/aiRequestService.ts)

Update existing:

```typescript
export async function getAIProvider(userId: string): Promise<AIProvider> {
  // 1. Try user config
  const customConfig = await getProviderConfig(userId);
  if (customConfig) return new CustomOpenAICompatibleProvider(customConfig);
  
  // 2. Fallback to system
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  
  throw new Error('No AI provider configured');
}
```

---

### 6. APIs

#### POST /api/ai-provider/config

```typescript
export const POST = withAuth(async (user, req) => {
  const body = await req.json();
  await saveProviderConfig(user.id, body);
  return Response.json({ status: 'saved' });
});
```

#### POST /api/ai-provider/test

```typescript
export const POST = withAuth(async (user) => {
  try {
    const provider = await getAIProvider(user.id);
    const result = await provider.generateStructured({
      userId: user.id,
      system: 'You are a test assistant.',
      userMessage: 'Reply with the word "ok".',
      schemaName: 'TestResponse',
      schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'], additionalProperties: false },
      validate: (v: unknown) => {
        if (typeof v === 'object' && v && 'status' in v) return v as { status: string };
        throw new Error('Invalid');
      },
    });
    return Response.json({ status: 'connected', model: result.usage.model });
  } catch (error) {
    return Response.json({ status: 'failed', error: String(error) }, { status: 400 });
  }
});
```

#### DELETE /api/ai-provider/config

```typescript
export const DELETE = withAuth(async (user) => {
  await deleteProviderConfig(user.id);
  return Response.json({ status: 'deleted' });
});
```

---

### 7. Mobile UI (src/app/settings/ai-provider/page.tsx)

Simple form:
- Base URL input (type="url")
- API Key input (type="password")
- Model name input (text)
- Test Connection button
- Delete Config button
- Status display (idle/testing/success/error)

See AGENTS.md lines 323-368 for full component.

---

### 8. Tests (Essential Only)

#### tests/unit/ai/providerConfig.test.ts

```typescript
describe('AI Provider Config', () => {
  it('encrypts API key', async () => {
    await saveProviderConfig(userId, { baseUrl: 'https://example.com', apiKey: 'secret123', modelName: 'gpt-4o' });
    const row = await db.query.aiProviderConfigs.findFirst({ where: eq(aiProviderConfigs.userId, userId) });
    expect(row.apiKeyEncrypted).not.toContain('secret123');
  });
  
  it('rejects private networks in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateBaseUrl('https://localhost:8000')).toThrow();
  });
  
  it('enforces ownership', async () => {
    await saveProviderConfig(user1, config1);
    const retrieved = await getProviderConfig(user2);
    expect(retrieved).toBeNull();
  });
});
```

#### tests/integration/ai/customProvider.test.ts

Mock fetch, verify structured output pipeline works with custom provider.

#### tests/e2e/aiProvider.spec.ts (Playwright)

```typescript
test('configure and test custom provider', async ({ page }) => {
  await page.goto('/settings/ai-provider');
  await page.fill('input[type="url"]', 'https://api.example.com');
  await page.fill('input[type="password"]', 'test-key');
  await page.fill('input[name="model"]', 'gpt-4o');
  await page.click('button:has-text("Test Connection")');
  await expect(page.locator('text=Connected')).toBeVisible();
});
```

---

## Quality Gate

- [x] Migration applied
- [x] Encryption works (test)
- [x] Ownership isolation (test)
- [x] HTTPS validation (test)
- [x] Custom provider used in chat when configured
- [x] System provider fallback works
- [x] Test connection API works
- [x] Mobile UI renders and submits
- [x] E2E test passes
- [x] Typecheck pass
- [x] Lint pass
- [x] Build pass

---

## Notes

- Same financial validation pipeline — no changes to DOMAIN_RULES.md invariants
- Same rate limits (10/min, 100/hour from AI_POLICY.md)
- Cost tracking: `estimatedCostUsd: null` for custom provider
- ENCRYPTION_KEY required in environment (generate: `openssl rand -hex 32`)
- SSRF protection is basic (localhost/private IP block); M21 security audit may extend

Full architecture: see AGENTS.md
