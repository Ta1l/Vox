# SECURITY.md

Last updated: 2026-10-03

---

## Security principles

1. **Defense in depth:** Multiple layers of protection;
2. **Least privilege:** Minimal access by default;
3. **Fail secure:** Errors don't expose sensitive data;
4. **Audit everything financial:** Complete trail for forensics;
5. **No secrets in code:** Environment variables only;
6. **Validate all inputs:** Trust nothing from outside;
7. **Encrypt sensitive data:** At rest and in transit.

---

## Authentication and authorization

### V1: Single-user mode with authentication boundary

**CRITICAL:** Даже для single-user V1 приложение ДОЛЖНО иметь application-level authentication.

**Implementation:**

```typescript
// Session-based authentication
import { getServerSession } from 'next-auth';

export async function getCurrentUser(): Promise<User> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('Not authenticated');
  }
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

// All API routes and server actions require authentication
export async function withAuth<T>(
  handler: (user: User) => Promise<T>
): Promise<T> {
  const user = await getCurrentUser();
  return handler(user);
}
```

**Access control layers:**

1. **Primary:** Application-level session authentication (NextAuth.js or similar);
2. **Secondary:** Caddy reverse proxy с HTTPS + optional basic auth;
3. **Tertiary:** VPN или IP whitelist на network level;
4. **CSRF protection:** Built-in via server actions + session validation.

**Rationale:** VPN/IP whitelist alone не является достаточной защитой. Misconfiguration может expose финансовые данные без authentication boundary.

### Current M21 implementation

The repository currently has a single-user development seed. In production, `middleware.ts` fails closed unless `APP_AUTH_TOKEN` (at least 32 characters) is configured. `/api/auth/login` exchanges that operator-held token for an HttpOnly, Secure, SameSite=Strict `fin_session` cookie; protected API/page requests require the cookie. Development and tests intentionally keep the fixed seed user so financial tests remain deterministic. A full multi-user identity provider remains a post-V1 migration.

### Future: Multi-user authentication

Когда добавляется multi-user support:

1. **Session-based auth** (NextAuth.js или Lucia);
2. **Row-level security** проверяет `user_id` на каждый query;
3. **Password hashing** (bcrypt или Argon2);
4. **Email verification** для registration;
5. **2FA** для production accounts;
6. **Session tokens** с secure cookies (httpOnly, sameSite=strict).

---

## Secrets management

### Environment variables

**NEVER commit secrets to git.**

`.env.local`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finapp

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com

# Application
APP_URL=https://fin.example.com
SESSION_SECRET=...

# Optional
SENTRY_DSN=...
```

### Secret rotation

1. Rotate secrets quarterly;
2. Использовать отдельные keys для dev/staging/production;
3. Revoke compromised keys немедленно;
4. Log secret access attempts для audit.

### Storage

Production secrets:

- Docker secrets (для Docker Compose);
- Environment variables через systemd;
- Vault (для advanced setup).

**DO NOT:**

- Store secrets in database unencrypted;
- Log secrets in application logs;
- Echo secrets in error messages;
- Expose secrets через API responses.

---

## Database security

### Connection security

```typescript
// DATABASE_URL structure
postgresql://user:password@host:5432/database?sslmode=require

// Connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Network isolation

PostgreSQL доступен только:

- Через internal Docker network (web/worker containers);
- NOT exposed publicly;
- Administration только через SSH tunnel.

**Docker Compose:**

```yaml
services:
  postgres:
    image: postgres:16
    networks:
      - internal
    # NO ports exposed to host
```

### Database user permissions

```sql
-- Application user (minimal privileges)
CREATE USER finapp_app WITH PASSWORD '...';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE finapp TO finapp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO finapp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finapp_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM finapp_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM finapp_app;

-- Migration user (elevated privileges)
CREATE USER finapp_admin WITH PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE finapp TO finapp_admin;
```

### SQL injection protection

Drizzle ORM использует parameterized queries автоматически:

```typescript
// SAFE (parameterized)
const user = await db.query.users.findFirst({
  where: eq(users.email, userEmail),
});

// SAFE (with sql template)
const result = await db.execute(sql`
  SELECT * FROM users WHERE email = ${userEmail}
`);

// UNSAFE (never do this)
const result = await db.execute(`
  SELECT * FROM users WHERE email = '${userEmail}'
`);
```

**Rule:** NEVER concatenate user input into SQL strings.

---

## API security

### Input validation

Все API inputs проходят Zod validation:

```typescript
import { z } from 'zod';

const CreateIncomeSchema = z.object({
  amountKopecks: z.number().int().positive().max(100_000_000), // max 1M RUB
  source: z.string().max(256).optional(),
  description: z.string().max(1000).optional(),
  earnedAt: z.coerce.date(),
  expectedAt: z.coerce.date(),
});

export async function createIncome(
  req: Request
): Promise<Response> {
  const body = await req.json();
  
  // Validate input
  const validation = CreateIncomeSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Invalid input', details: validation.error.errors },
      { status: 400 }
    );
  }
  
  const data = validation.data;
  
  // ... proceed with validated data
}
```

### Rate limiting

```typescript
// Simple in-memory rate limiter for V1
import { RateLimiter } from '@/lib/rate-limiter';

const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

export async function middleware(req: Request) {
  const identifier = getClientIdentifier(req); // IP or user ID
  
  if (!limiter.checkLimit(identifier)) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // Continue
}
```

**Limits:**

- General API: 60 requests/minute;
- AI endpoints: 10 requests/minute;
- Bank import: 5 requests/minute.

### CORS configuration

```typescript
// Next.js middleware
export function middleware(req: Request) {
  const origin = req.headers.get('origin');
  
  // V1: same-origin only
  if (origin && origin !== process.env.APP_URL) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Set security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

---

## Caddy security configuration

```caddyfile
fin.example.com {
    # TLS
    tls {
        protocols tls1.3
    }
    
    # Security headers
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        
        # Other headers
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        
        # Remove server information
        -Server
    }
    
    # Rate limiting (Caddy level)
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    
    # Reverse proxy to Next.js
    reverse_proxy web:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Optional: Basic auth for V1
    basicauth * {
        admin $2a$14$...hashed_password...
    }
}
```

---

## AI provider security

### API key management

```typescript
// Separate keys per environment
const OPENAI_API_KEY = 
  process.env.NODE_ENV === 'production'
    ? process.env.OPENAI_API_KEY_PROD
    : process.env.OPENAI_API_KEY_DEV;

// NEVER expose to client
// AI requests are SERVER-SIDE ONLY
```

### Request isolation

```typescript
// All AI requests include user_id for tracking
async function callAI(userId: string, prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_POLICY },
      { role: 'user', content: prompt },
    ],
    user: userId, // OpenAI user identifier for abuse prevention
  });
  
  // Log for audit
  await logAIUsage({
    userId,
    provider: 'openai',
    model: 'gpt-4o',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
  });
  
  return response;
}
```

### Prompt injection mitigation

1. **Sanitize untrusted inputs:**

```typescript
function sanitizeForAI(text: string): string {
  return text
    .replace(/```/g, '')
    .replace(/\[INST\]/gi, '')
    .replace(/system:/gi, '')
    .replace(/assistant:/gi, '')
    .slice(0, 500);
}
```

2. **Structure context clearly:**

```typescript
// GOOD: structured JSON context
const snapshot = {
  goals: goals.map(g => ({
    id: g.id,
    name: g.name,
    description: sanitizeForAI(g.description),
  }))
};

// BAD: string interpolation
const prompt = `Goals: ${goals.map(g => g.description).join(', ')}`;
```

3. **Validate AI outputs:**

All AI responses проходят через schema validation перед использованием.

---

## Data encryption

### At rest

**Sensitive fields:**

```typescript
// Bank connection credentials
interface BankConnection {
  id: string;
  userId: string;
  providerName: string;
  connectionConfig: string; // ENCRYPTED JSON
}

// Encryption utility
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**What to encrypt:**

- Bank connection credentials;
- API tokens (если хранятся в DB);
- Sensitive personal data (если добавляется).

**What NOT to encrypt:**

- Financial amounts (нужны для queries);
- User names/emails (нужны для search);
- Transaction descriptions (нужны для classification).

### In transit

- **HTTPS only** (enforced by Caddy);
- **TLS 1.3** (минимальная версия);
- **HSTS** preload для browsers;
- **No mixed content** в frontend.

---

## Audit logging

### What to log

```typescript
interface AuditLogEntry {
  userId: string;
  action: string; // 'INCOME_RECEIVED', 'DEBT_PAYMENT', 'BUDGET_APPROVED'
  entityType: string; // 'INCOME', 'DEBT', 'BUDGET'
  entityId: string;
  previousState: object | null;
  newState: object | null;
  metadata: object;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: Date;
}
```

**Logged actions:**

- Income marked received;
- Expense created;
- Debt payment;
- Goal contribution;
- Budget approved;
- AI budget accepted;
- Planning cycle started/completed;
- Recurring obligation created/modified;
- Bank transaction imported/matched;
- Envelope allocated;
- Notification sent.

### Log retention

- Audit logs: **7 years** (financial compliance);
- AI usage logs: **1 year**;
- Application logs: **90 days**;
- Error logs: **180 days**.

### Log access

- Audit logs: **read-only** для application;
- Write access: **append-only**;
- Admin access: через separate admin tool;
- Export: для compliance audits.

---

## Backup and disaster recovery

### Automated backups

The repository implementation is `scripts/backup.sh`, `scripts/restore.sh`, and `scripts/verify-backup.sh`. Backups are encrypted before they leave the temporary file, and verification uses `pg_restore --list` without mutating a database.

```bash
#!/bin/bash
# /scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="finapp"

# Full database dump
pg_dump -U postgres -h localhost $DB_NAME | \
  gzip > $BACKUP_DIR/finapp_$DATE.sql.gz

# Encrypt backup
gpg --encrypt --recipient admin@example.com \
  $BACKUP_DIR/finapp_$DATE.sql.gz

# Upload to offsite storage
aws s3 cp $BACKUP_DIR/finapp_$DATE.sql.gz.gpg \
  s3://backups/finapp/

# Cleanup old local backups (keep 7 days)
find $BACKUP_DIR -name "finapp_*.sql.gz*" -mtime +7 -delete
```

**Backup schedule:**

- Daily full backups (3 AM);
- WAL archiving for point-in-time recovery;
- Offsite storage (S3 or equivalent);
- Encrypted at rest;
- Retention: 30 days daily, 12 months monthly.

### Restore procedure

```bash
# 1. Stop application
docker compose down

# 2. Restore database
gunzip < backup_YYYYMMDD.sql.gz | \
  psql -U postgres -h localhost finapp

# 3. Verify data integrity
psql -U postgres -h localhost finapp -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
docker compose up -d

# 5. Verify application health
curl https://fin.example.com/api/health
```

**Test restores quarterly.**

---

## Dependency security

### Regular updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Update major versions carefully
npm outdated
npm install package@latest
```

### Dependency scanning

GitHub Dependabot alerts включены.

Auto-merge minor security patches.

Review major security updates manually.

### Minimal dependencies

- Avoid unnecessary packages;
- Prefer well-maintained libraries;
- Review dependencies of dependencies;
- Pin versions в package.json;
- Use lock file (package-lock.json).

---

## Client-side security

### XSS protection

React автоматически escapes content:

```tsx
// SAFE (React escapes by default)
<div>{userInput}</div>

// UNSAFE (dangerouslySetInnerHTML)
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFE (sanitize before dangerouslySetInnerHTML)
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### CSRF protection

Next.js Server Actions используют POST requests с CSRF tokens автоматически.

**Custom API routes:**

```typescript
// Verify origin header
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  
  if (origin !== process.env.APP_URL) {
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  }
  
  // ... proceed
}
```

### Content Security Policy

Через Caddy headers (см. выше).

**Inline scripts:**

Избегать где возможно. Если необходимо, использовать nonce:

```tsx
// _document.tsx
<script nonce={nonce}>
  // inline script
</script>
```

---

## Error handling and information disclosure

### Safe error messages

```typescript
try {
  await db.transaction(async (tx) => {
    // ... financial operations
  });
} catch (error) {
  // Log full error server-side
  logger.error('Transaction failed', { error, userId, context });
  
  // Return safe error to client
  return Response.json(
    { 
      error: 'Transaction failed. Please try again.',
      // NO stack traces, NO database details, NO internal paths
    },
    { status: 500 }
  );
}
```

**NEVER expose:**

- Stack traces;
- Database schema details;
- Internal file paths;
- Environment variables;
- Cryptographic keys;
- User IDs в error messages (use generic "User not found").

---

## Notification security

### Web Push

```typescript
// Push subscription verification
async function verifyPushSubscription(
  subscription: PushSubscription,
  userId: string
): Promise<boolean> {
  // 1. Verify endpoint is from legitimate push service
  const allowedOrigins = [
    'https://fcm.googleapis.com',
    'https://updates.push.services.mozilla.com',
  ];
  
  const url = new URL(subscription.endpoint);
  const isAllowed = allowedOrigins.some(origin => 
    url.origin.startsWith(origin)
  );
  
  if (!isAllowed) {
    return false;
  }
  
  // 2. Verify keys are present
  if (!subscription.keys.auth || !subscription.keys.p256dh) {
    return false;
  }
  
  return true;
}
```

### Notification content

```typescript
// GOOD: generic notification
{
  title: 'Upcoming payment',
  body: 'You have a payment due tomorrow',
  data: { type: 'PAYMENT_DUE', entityId: '...' }
}

// BAD: sensitive details in notification
{
  title: 'Credit card payment',
  body: 'Pay 15000₽ to Sberbank by tomorrow or face penalty',
  // Visible on lock screen!
}
```

**Rules:**

- Generic titles/bodies;
- Sensitive details только после unlock/authentication;
- Data payload для app routing, not display.

---

## Bank integration security

### Future bank API connections

```typescript
interface BankConnection {
  id: string;
  userId: string;
  providerName: string;
  
  // ENCRYPTED
  connectionConfig: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

// Token refresh
async function refreshBankToken(connectionId: string) {
  const connection = await getBankConnection(connectionId);
  
  // Decrypt credentials
  const config = decrypt(connection.connectionConfig);
  
  // Refresh token via bank API
  const newTokens = await bankProvider.refreshToken(config.refreshToken);
  
  // Re-encrypt and save
  await updateConnection(connectionId, {
    connectionConfig: encrypt(JSON.stringify(newTokens)),
  });
}
```

### Transaction import security

```typescript
// Imported transaction description is UNTRUSTED
interface BankTransaction {
  externalId: string;
  amount: number;
  date: Date;
  description: string; // ⚠️ UNTRUSTED
}

// Sanitize before storage
function sanitizeTransactionDescription(desc: string): string {
  return desc
    .slice(0, 500) // max length
    .replace(/[<>]/g, '') // remove HTML-like chars
    .trim();
}

// NEVER use description as LLM instruction
function classifyTransaction(tx: BankTransaction) {
  // GOOD: structured context
  return ai.classify({
    amount: tx.amount,
    date: tx.date,
    description: sanitizeTransactionDescription(tx.description),
  });
  
  // BAD: string interpolation
  // const prompt = `Classify: ${tx.description}`; // INJECTION RISK
}
```

---

## Monitoring and alerting

### Health checks

```typescript
// /api/health
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkAIProvider(),
    checkDiskSpace(),
  ]);
  
  const allHealthy = checks.every(c => c.healthy);
  
  return Response.json(
    { 
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

### Security monitoring

**Alert on:**

- Failed login attempts (future multi-user);
- Rate limit violations;
- Unusual AI usage spikes;
- Database connection failures;
- Backup failures;
- Disk space < 10%;
- Invalid API requests patterns;
- Audit log anomalies.

**Tools:**

- Sentry для error tracking;
- Custom alerting script;
- Email notifications для critical events.

---

## Security checklist for deployment

Before production:

- [ ] All secrets в environment variables, NOT in code;
- [ ] HTTPS enforced, HTTP redirects to HTTPS;
- [ ] Database не exposed publicly;
- [ ] PostgreSQL user имеет minimal privileges;
- [ ] Rate limiting включён;
- [ ] Security headers configured (CSP, HSTS, etc);
- [ ] Input validation на всех API endpoints;
- [ ] Audit logging работает;
- [ ] Backups automated и tested;
- [ ] Error messages не expose internal details;
- [ ] AI provider keys secured;
- [ ] Bank credentials encrypted at rest;
- [ ] Dependency vulnerabilities checked;
- [ ] Firewall configured (только SSH, HTTPS);
- [ ] SSH key-based authentication (no passwords);
- [ ] Fail2ban или equivalent против brute force;
- [ ] Log rotation configured;
- [ ] Monitoring и alerting active.

---

## Incident response plan

### Detection

- Automated monitoring alerts;
- User reports;
- Audit log anomalies;
- External security reports.

### Response

1. **Assess severity:**
   - Critical: data breach, financial corruption;
   - High: service outage, vulnerability discovered;
   - Medium: suspicious activity, minor bug;
   - Low: performance degradation.

2. **Contain:**
   - Critical: shut down affected service immediately;
   - Revoke compromised credentials;
   - Block malicious IPs;
   - Enable maintenance mode if needed.

3. **Investigate:**
   - Review audit logs;
   - Check database integrity;
   - Analyze attack vector;
   - Document timeline.

4. **Remediate:**
   - Apply security patches;
   - Restore from clean backup if needed;
   - Update vulnerable dependencies;
   - Fix exploited vulnerability.

5. **Communicate:**
   - Notify affected users (future multi-user);
   - Document incident internally;
   - Update security procedures;
   - Post-mortem analysis.

6. **Prevent:**
   - Implement additional monitoring;
   - Update security policies;
   - Train on lessons learned;
   - Schedule security audit.

---

## Security contact

Security issues should be reported to: **security@example.com**

Do NOT disclose security vulnerabilities publicly before fix is deployed.

---

## Compliance

### Data protection

V1 single-user на private VPS:

- No GDPR compliance required (personal use);
- No data sharing with third parties;
- No cookies для tracking.

### Future multi-user considerations

When adding multiple users:

- GDPR compliance для EU users;
- Data portability (export functionality);
- Right to deletion;
- Privacy policy;
- Terms of service;
- Cookie consent;
- Data processing agreements для AI providers.

---

## Summary

Security — это ongoing process, not one-time task.

**Key takeaways:**

1. Defense in depth — multiple security layers;
2. Validate everything — trust no input;
3. Encrypt sensitive data — at rest and in transit;
4. Audit all financial operations — complete trail;
5. Minimize attack surface — least privilege principle;
6. Monitor actively — detect incidents early;
7. Test backups regularly — be ready for disaster;
8. Keep dependencies updated — patch vulnerabilities promptly;
9. Handle errors safely — no information disclosure;
10. Plan for incidents — have response procedure ready.

V1 должна быть secure by design, not as afterthought.
