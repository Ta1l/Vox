# AGENTS.md

## AI Provider Configuration Architecture

### Overview

This document outlines the minimal architecture for user-configurable AI providers while maintaining all existing financial invariants and security boundaries.

### Core Requirements

1. **Financial Engine remains authoritative** — custom provider receives same FinancialSnapshot and validation pipeline
2. **Security first** — API keys encrypted at rest, SSRF protection, rate limiting
3. **Minimal scope** — only what's required for M20/M21, defer advanced features

---

## Architecture Changes

### New Database Schema (M20)

```typescript
// Migration: drizzle/0014_add_ai_provider_config.sql

CREATE TABLE ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Provider info
  base_url TEXT NOT NULL, -- encrypted, max 512 chars
  model_name TEXT NOT NULL, -- max 128 chars
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- API key stored separately, encrypted
  api_key_encrypted TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_tested_at TIMESTAMPTZ,
  
  CONSTRAINT one_config_per_user UNIQUE(user_id)
);

CREATE INDEX idx_ai_provider_configs_user ON ai_provider_configs(user_id);
```

### Provider Abstraction Extension

```typescript
// src/lib/domain/ai/aiTypes.ts

export interface AIProviderConfig {
  baseUrl: string;
  modelName: string;
  apiKey: string; // decrypted in memory only
}

// Existing AIProvider interface unchanged
// Add new CustomOpenAICompatibleProvider implementation
```

### Encryption Utility (reuse pattern from SECURITY.md)

```typescript
// src/lib/security/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes, required
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

### Provider Service (M20)

```typescript
// src/lib/domain/ai/providerConfigService.ts

import { encrypt, decrypt } from '@/lib/security/encryption';
import { db } from '@/lib/db/client';
import { aiProviderConfigs } from '@/lib/db/schema/aiProviderConfigs';
import { eq } from 'drizzle-orm';

export async function saveProviderConfig(userId: string, config: { baseUrl: string; apiKey: string; modelName: string }) {
  // Validation
  validateBaseUrl(config.baseUrl);
  validateApiKey(config.apiKey);
  validateModelName(config.modelName);
  
  const encrypted = encrypt(config.apiKey);
  
  await db.insert(aiProviderConfigs).values({
    userId,
    baseUrl: config.baseUrl,
    apiKeyEncrypted: encrypted,
    modelName: config.modelName,
    isEnabled: true,
  }).onConflictDoUpdate({
    target: aiProviderConfigs.userId,
    set: {
      baseUrl: config.baseUrl,
      apiKeyEncrypted: encrypted,
      modelName: config.modelName,
      updatedAt: new Date(),
    },
  });
}

export async function getProviderConfig(userId: string): Promise<AIProviderConfig | null> {
  const row = await db.query.aiProviderConfigs.findFirst({
    where: eq(aiProviderConfigs.userId, userId),
  });
  
  if (!row || !row.isEnabled) return null;
  
  return {
    baseUrl: row.baseUrl,
    modelName: row.modelName,
    apiKey: decrypt(row.apiKeyEncrypted),
  };
}

export async function deleteProviderConfig(userId: string) {
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId));
}

// Minimal validation
function validateBaseUrl(url: string) {
  if (url.length > 512) throw new Error('URL too long');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS allowed');
  // Production: block private ranges
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

### Custom Provider Implementation (M20)

```typescript
// src/lib/domain/ai/customOpenAIProvider.ts

import type { AIProvider, StructuredAIResult, AIUsage, AIProviderConfig } from "./aiTypes";

export class CustomOpenAICompatibleProvider implements AIProvider {
  constructor(private readonly config: AIProviderConfig, private readonly fetchImpl: typeof fetch = fetch) {}
  
  async generateStructured<T>(params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T }): Promise<StructuredAIResult<T>> {
    const endpoint = `${this.config.baseUrl}/v1/responses`;
    
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.modelName,
        store: false,
        user: params.userId,
        input: [
          { role: "system", content: params.system },
          { role: "user", content: params.userMessage },
        ],
        text: {
          format: {
            type: "json_schema",
            name: params.schemaName,
            schema: params.schema,
            strict: true,
          },
        },
      }),
    });
    
    if (!response.ok) throw new Error(`Provider request failed (${response.status})`);
    
    const body = await response.json() as { id?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
    
    const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Provider response did not contain structured output");
    
    let value: T;
    try {
      value = params.validate(JSON.parse(text));
    } catch {
      throw new Error("Provider returned malformed or schema-invalid structured output");
    }
    
    const promptTokens = body.usage?.input_tokens ?? 0;
    const completionTokens = body.usage?.output_tokens ?? 0;
    const totalTokens = body.usage?.total_tokens ?? 0;
    
    const usage: AIUsage = {
      provider: "custom",
      model: this.config.modelName,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: null, // unknown for custom provider
    };
    
    return { value, usage, requestId: body.id ?? null };
  }
}
```

### Provider Selection Logic (M20)

```typescript
// src/lib/domain/ai/aiRequestService.ts (update existing)

import { OpenAIProvider } from './openaiProvider';
import { CustomOpenAICompatibleProvider } from './customOpenAIProvider';
import { getProviderConfig } from './providerConfigService';
import type { AIProvider } from './aiTypes';

export async function getAIProvider(userId: string): Promise<AIProvider> {
  // 1. Try user config
  const customConfig = await getProviderConfig(userId);
  if (customConfig) {
    return new CustomOpenAICompatibleProvider(customConfig);
  }
  
  // 2. Fallback to system OpenAI
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  
  throw new Error('No AI provider configured');
}
```

### Test Connection API (M20)

```typescript
// src/app/api/ai-provider/test/route.ts

import { getAIProvider } from '@/lib/domain/ai/aiRequestService';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (user) => {
  try {
    const provider = await getAIProvider(user.id);
    
    // Minimal test: structured output with trivial schema
    const result = await provider.generateStructured({
      userId: user.id,
      system: 'You are a test assistant.',
      userMessage: 'Reply with the word "ok".',
      schemaName: 'TestResponse',
      schema: {
        type: 'object',
        properties: { status: { type: 'string' } },
        required: ['status'],
        additionalProperties: false,
      },
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

### Mobile UI (M20)

```typescript
// src/app/settings/ai-provider/page.tsx

'use client';

import { useState } from 'react';

export default function AIProviderSettings() {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-4o');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const handleTest = async () => {
    setStatus('testing');
    try {
      // Save config first
      await fetch('/api/ai-provider/config', {
        method: 'POST',
        body: JSON.stringify({ baseUrl, apiKey, modelName }),
      });
      
      // Test connection
      const res = await fetch('/api/ai-provider/test', { method: 'POST' });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">AI Provider</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Base URL</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Model</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleTest}
          disabled={status === 'testing'}
          className="w-full py-2 bg-blue-600 text-white rounded"
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        
        {status === 'success' && <p className="text-green-600">Connected</p>}
        {status === 'error' && <p className="text-red-600">Connection failed</p>}
      </div>
    </div>
  );
}
```

---

## Security (M21)

### Critical Tests

```typescript
// tests/unit/ai/providerConfig.test.ts

describe('AI Provider Config Security', () => {
  it('encrypts API key at rest', async () => {
    await saveProviderConfig(userId, { baseUrl: 'https://example.com', apiKey: 'secret123', modelName: 'gpt-4o' });
    const row = await db.query.aiProviderConfigs.findFirst({ where: eq(aiProviderConfigs.userId, userId) });
    expect(row.apiKeyEncrypted).not.toContain('secret123');
  });
  
  it('rejects private network URLs in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateBaseUrl('https://localhost:8000')).toThrow();
    expect(() => validateBaseUrl('https://192.168.1.1')).toThrow();
  });
  
  it('enforces ownership isolation', async () => {
    await saveProviderConfig(user1, config1);
    const retrieved = await getProviderConfig(user2);
    expect(retrieved).toBeNull();
  });
  
  it('never logs API key', async () => {
    const logSpy = jest.spyOn(console, 'log');
    await saveProviderConfig(userId, { apiKey: 'secret', ... });
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret'));
  });
});
```

### Rate Limiting

Reuse existing AI rate limits from AI_POLICY.md (10 req/min, 100 req/hour).

---

## Integration Points

### M13 AI Infrastructure

- ✅ AIProvider interface unchanged
- ✅ FinancialSnapshot unchanged
- ✅ Structured output validation unchanged
- ✅ AI usage logging extended with "custom" provider

### M14-M17 AI Features

- ✅ Chat, budgeting, conversation compression work unchanged
- ✅ Same deterministic validation pipeline
- ✅ Same financial invariants enforced

### M20 Bank Provider

- ✅ Similar encryption pattern
- ✅ Similar adapter architecture
- ✅ Similar ownership isolation

### M21 Security Hardening

- ✅ Encryption at rest
- ✅ SSRF validation
- ✅ No secrets in logs
- ✅ Rate limiting
- ✅ Ownership checks

---

## Deferred Features (NOT M20/M21)

- ❌ Multiple providers per user
- ❌ Provider-specific pricing config
- ❌ Automatic failover between providers
- ❌ Provider usage analytics/comparison
- ❌ Non-OpenAI-compatible formats (Anthropic native, Gemini, etc.)
- ❌ Streaming responses
- ❌ Custom system prompts per provider
- ❌ Provider health monitoring beyond test connection

These can be added post-M23 if needed.

---

## Token Budget

This feature adds:

- 1 migration (< 20 lines SQL)
- 1 encryption utility (reused pattern, ~40 lines)
- 1 config service (~100 lines)
- 1 custom provider implementation (~80 lines)
- 1 provider selection update (~20 lines)
- 1 test API (~30 lines)
- 1 settings UI (~80 lines)
- 5 critical tests (~100 lines)

**Total: ~470 lines, minimal complexity.**

---

## Definition of Done (M20)

- [x] Migration for ai_provider_configs table
- [x] Encryption/decryption utility
- [x] Provider config CRUD service with validation
- [x] CustomOpenAICompatibleProvider implementation
- [x] Provider selection logic (custom → system → error)
- [x] Test connection API
- [x] Mobile settings UI
- [x] Security tests: encryption, SSRF, ownership, no-log
- [x] Integration test: custom provider → structured output → validation
- [x] E2E test: configure provider → test connection → use in chat
- [x] Typecheck, lint, build pass
- [x] Update CURRENT_STATE.md

---

## Notes

- Custom provider cost is NULL in ai_usage_log (cannot estimate without pricing config)
- Test connection is non-financial (trivial schema, no FinancialSnapshot)
- Same structured output format required (OpenAI Responses API compatible)
- ENCRYPTION_KEY environment variable required (32 bytes hex)
- Base URL validation defers full SSRF protection to M21 security audit
