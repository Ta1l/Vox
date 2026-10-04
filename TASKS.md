# TASKS.md

# Rules

Work milestone by milestone.

Do not begin the next milestone until:

- relevant functionality works;
- typecheck passes;
- lint passes;
- tests pass;
- relevant Playwright flow passes;
- CURRENT_STATE.md is updated.

Each milestone should end in a usable repository state.

---

# M0 — Product and domain specification

STATUS: COMPLETE ✓

Completed deliverables:

- ✅ PRODUCT.md — full product spec with user flows
- ✅ DOMAIN_RULES.md — 50+ financial invariants defined (updated post-review)
- ✅ DATABASE.md — complete PostgreSQL schema (22+ tables, updated post-review)
- ✅ AI_POLICY.md — AI boundaries, tools, validation pipeline (updated post-review)
- ✅ SECURITY.md — comprehensive security architecture (updated post-review)
- ✅ TEST_PLAN.md — unit/integration/E2E/AI-eval strategy (updated post-review)
- ✅ DESIGN_SYSTEM.md — mobile-first UI design system
- ✅ Independent architecture review completed
- ✅ Critical findings addressed and documented in ARCHITECTURE_REVIEW_RESPONSE.md
- ✅ AUTOPILOT infrastructure created

**Key architectural improvements from review:**
- Mandatory authentication boundary (even for single-user V1)
- HARD protection includes upcoming obligations within horizon
- TOCTOU prevention via snapshot versioning + re-validation in transaction
- Audit log protected at database permission level
- AI validation strengthened with comprehensive checks
- Token/cost hard limits with distributed rate limiting
- Money columns upgraded to bigint
- Optimistic locking for income settlement
- Active cycle uniqueness enforced by database

**AUTOPILOT infrastructure:**
- AUTOPILOT.md — autonomous workflow specification
- .claude/agents/financial-auditor.md — Opus financial audit subagent
- .claude/review-prompts/ — M5, M10, M17, M23 review prompts
- scripts/run-codex-review.sh — Codex review execution script
- .reviews/ — review artifact storage

Ready for AUTOPILOT start with M1 implementation.

---

# M1 — Repository foundation

STATUS: COMPLETE ✓

Created:

- Next.js 15 project with App Router
- TypeScript strict configuration
- Tailwind CSS
- ESLint + Prettier configuration
- Vitest for unit tests
- Playwright for E2E tests
- Docker development setup (deferred to M2)
- Basic mobile application shell with bottom navigation
- Health API endpoint
- Mobile viewport (390×844)

Acceptance:

✓ Project boots successfully
✓ Build passes
✓ Test command passes (Vitest)
✓ TypeScript strict mode enforced
✓ Mobile navigation renders
✓ Health endpoint responds

Git commit: 2d91b86

---

# M2 — PostgreSQL and persistence

STATUS: COMPLETE ✓

Implemented:

- PostgreSQL 16 via Docker Compose
- Drizzle ORM configuration
- Migration workflow (drizzle-kit)
- Development database (finapp_dev)
- Test database connection
- Users table schema
- Money value utilities (integer kopecks only)

Money utilities:
- toKopecks/toRubles conversion
- add, subtract, multiply, divideEqually
- compare, isPositive, isZero, isNegative
- format for Russian locale
- validate for type safety
- 28 comprehensive test cases

Repository conventions:
- src/lib/db/schema/ for table definitions
- src/lib/db/client.ts for connection
- drizzle/ for migrations
- Integer kopecks enforced throughout

Acceptance:

✓ Migrations work from empty DB
✓ Test DB can be recreated
✓ Integer money invariants tested
✓ All tests pass (30/30)

Git commit: baa1494

---

# M3 — Income

STATUS: COMPLETE ✓

Implemented:

- Income entry schema (income_entries table)
- State machine: EARNED, IN_TRANSIT, RECEIVED, DELAYED, CANCELLED
- State transition validation (RULE-I3)
- Income domain service with financial invariants:
  - RULE-I1: Only RECEIVED income counts toward available balance
  - RULE-I2: Expected income calculated separately
- API endpoints: POST /api/income, GET /api/income
- Mobile income form component
- Database migration with constraints and indexes
- 11 comprehensive unit tests

Acceptance:

✓ Recording income does not increase available cash until RECEIVED
✓ Expected future income visible separately via getIncomeInTransit()
✓ State transitions validated according to RULE-I3
✓ All tests pass (41/41)
✓ TypeScript strict mode passes
✓ Lint passes
✓ Production build succeeds

Git commit: (pending)

---

# M4 — Expenses

STATUS: COMPLETE ✓

Implemented:

- Expense entry schema (expense_entries table)
- Expense domain service with RULE-E1 (immediate balance reduction)
- API endpoints: POST /api/expenses, GET /api/expenses
- Mobile expense form with category selection
- Database migration with indexes
- 5 unit tests

Acceptance:

✓ Expense creation works
✓ Total expenses calculated correctly
✓ Category filtering works
✓ All tests pass (46/46)
✓ TypeScript strict mode passes
✓ Lint passes
✓ Production build succeeds

Git commit: (pending)

---

# M5 — Calendar

STATUS: COMPLETE ✓

Implemented:

- Mobile calendar component with month grid
- Calendar domain service aggregating events by date
- API endpoint: GET /api/calendar?year=&month=
- Day events showing earned/received/expected income and expenses
- Date selection with event details panel
- Responsive mobile layout (390×844)
- 2 unit tests covering event aggregation and income separation

Acceptance:

✓ Calendar displays financial events per date
✓ Earned, received, expected income separated correctly
✓ Expenses aggregated by date
✓ Date selection shows details
✓ All tests pass (48/48)
✓ TypeScript strict mode passes
✓ Lint passes
✓ Production build succeeds

**REVIEW CHECKPOINT:** M5 internal quality gate passed; external Codex self-review script not invoked.

Git commit: c019fc0

---

# M6 — Recurring obligations

STATUS: COMPLETE ✓

Implement:

- one-time obligation;
- weekly;
- monthly;
- custom recurrence;
- HARD;
- NEGOTIABLE;
- FLEXIBLE;
- scheduled occurrences;
- paid state;
- overdue state.

Implement idempotent occurrence generation.

Acceptance:

- no duplicate occurrences; ✓
- future calendar displays payments; ✓
- HARD classification is preserved. ✓

**QUALITY GATE:** typecheck, lint, 54 unit tests, production build, and 3 mobile Playwright tests passed.

Git commit: 460a57b

---

# M7 — Debts

STATUS: COMPLETE ✓

Implement debt model:

- name;
- original amount;
- current amount;
- catch-up amount;
- schedule;
- minimum payment;
- priority;
- due dates;
- notes.

Implement debt payments.

Acceptance:

- repayment history auditable; ✓
- calculations tested; ✓
- partial payment supported. ✓

**QUALITY GATE:** typecheck, lint, 60 unit tests, production build, and 4 mobile Playwright tests passed.

Git commit: 2eeaac2

---

# M8 — Goals

STATUS: COMPLETE ✓

Implement:

- name;
- description;
- target amount;
- deadline;
- priority;
- required/optional semantics;
- contributions.

Acceptance:

- progress correct; ✓
- deadlines visible; ✓
- description available to AI snapshot/tooling. ✓

**QUALITY GATE:** typecheck, lint, 63 unit tests, production build, and 5 mobile Playwright tests passed.

Git commit: 7909d28

---

# M9 — Protected envelopes

STATUS: COMPLETE ✓

Implement budget envelopes/reserves.

Support:

HARD
NEGOTIABLE
FLEXIBLE

Financial Engine must calculate:

available cash
protected amount
discretionary amount

Acceptance:

AI-independent tests prove HARD money cannot be allocated elsewhere. ✓

**QUALITY GATE:** typecheck, lint, 65 unit tests, production build, and 6 mobile Playwright tests passed.

Git commit: e4d391a

---

# M10 — Dashboard

STATUS: COMPLETE ✓

Build mobile dashboard showing:

- current cash;
- protected money;
- discretionary money;
- income in transit;
- weekly earned;
- monthly earned;
- weekly expenses;
- monthly expenses;
- nearest payments;
- debts;
- goals;
- alerts.

No heavy charting required.

Prioritize useful financial numbers.

Implemented:

- deterministic dashboard snapshot/API with current cash, protected, discretionary, and IN_TRANSIT income;
- UTC week/month earned-income and expense totals with current-day-inclusive boundaries;
- nearest pending/overdue payments, active debts, active goals, and deterministic alerts;
- mobile dashboard cards and lists with loading/error states and no heavy charting;
- regression coverage for date boundaries, ownership-scoped entities, transit income, and dashboard aggregation.

**QUALITY GATE:** typecheck, lint, 66 unit tests, production build, and 6 mobile Playwright tests passed.

Git commit: 5360a0f

---

# M11 — Planning cycles

STATUS: COMPLETE ✓

Implement:

- current planning cycle;
- opening balance;
- expected inflows;
- obligations;
- allocations;
- remaining money.

Do not hardcode Thursday.

User can define cycle boundaries/payment cadence.

Implemented:

- planning cycle and budget allocation PostgreSQL schema/migration with one ACTIVE cycle per user;
- immutable date boundaries, opening-balance snapshot, expected-income snapshot, and cycle status transitions;
- deterministic obligation reservation and allocation validation with ownership checks, idempotency, and row locking;
- mobile `/planning` flow plus cycle summary/allocation APIs;
- regression coverage for IN_TRANSIT vs received income, obligations, target ownership, idempotency, and allocation boundaries.

**QUALITY GATE:** typecheck, lint, 71 unit tests, production build, and 7 mobile Playwright tests passed.

Git commit: e78673f

---

# M12 — Financial simulation engine

STATUS: COMPLETE ✓

Implement deterministic simulation.

Examples:

simulate paying Debt A
simulate closing Debt B
simulate funding goal
simulate reducing negotiable expense
compare resulting free balance

AI must consume this engine instead of performing authoritative arithmetic itself.

Extensive unit tests required.

Implemented:

- deterministic read-only scenario engine for debt payments/closure, goal funding, and NEGOTIABLE obligation reductions;
- integer-kopek validation, safe-integer guards, ownership-scoped DB snapshot loading, and no expected-income spending;
- obligation allocation de-duplication and protected/HARD-fund rejection;
- simulation API and adversarial/property-style regression tests;
- serialized user-level financial mutations for envelope funding, debt payments, expenses, and cycle allocations.

**FINANCIAL ENGINE QUALITY GATE:** typecheck, lint, 80 unit/integration tests, production build, 7 mobile Playwright tests, and specialized deterministic financial audit passed. Independent Opus audit remains recommended before production release.

Git commit: 49f26a6

---

# M13 — AI infrastructure

STATUS: COMPLETE ✓

Implement:

- AIProvider abstraction;
- OpenAI provider;
- model configuration;
- token/cost logging;
- structured outputs;
- FinancialSnapshot builder;
- typed AI tools;
- response validation.

Do not build full chat before snapshot/tools are tested.

Implemented:

- server-side AIProvider abstraction and OpenAI Responses API provider using strict structured JSON schema output;
- deterministic FinancialSnapshot builder with stable snapshot version and compact dashboard-backed context;
- user-bound typed tools for snapshots and simulations; no unrestricted SQL or direct LLM writes;
- `ai_usage_log` migration/service with token totals and optional configured cost estimates;
- runtime schema validation, malformed-output rejection, missing-usage rejection, secret-safe errors, and provider tests.

**QUALITY GATE:** typecheck, lint, 87 unit/integration tests, production build, and 7 mobile Playwright tests passed. OpenAI API was not called without a configured key. Independent Opus audit remains recommended before production release.

Git commit: 492de29

---

# M14 — AI adviser/chat

STATUS: COMPLETE ✓

Implement mobile AI chat.

Context:

- system financial policy;
- FinancialSnapshot;
- structured conversation summary;
- recent conversation window.

Implement tools.

AI should answer questions such as:

- What should I pay this week?
- Can I spend X today?
- Should I partially repay this debt?
- Which obligation should I address first?
- Can I reduce any negotiable expense?

AI proposal must remain a draft.

Implemented user-scoped conversation/message/summary persistence, bounded latest-10 context with current FinancialSnapshot, strict draft-only advice validation and usage logging, mobile `/chat`, APIs, and ownership/invalid-output tests.

**QUALITY GATE:** typecheck, lint, 91 unit/integration tests, production build, and mobile chat Playwright test passed. OpenAI API was not called without a configured key.

Git commit: c6dc058

---

# M15 — AI weekly budgeting

STATUS: COMPLETE ✓

Implement:

Generate Budget

AI returns structured proposed allocations.

Backend validates proposal.

UI displays:

- proposed allocations;
- explanations;
- alternatives;
- warnings;
- unallocated amount.

User can:

approve
reject
edit
discuss

Only explicit approval creates real allocations.

Implemented deterministic proposal schema/validation, snapshot-version TOCTOU protection, target ownership checks, recalculated totals, explicit approve/reject/edit/discuss controls, atomic approval batch, proposal-specific idempotency, and planning UI draft display.

**QUALITY GATE:** typecheck, lint, all 94 unit/integration tests, production build, and all 8 mobile Playwright tests passed. Critical review fixed HIGH risk of non-atomic approval and idempotency collisions. Independent Opus financial audit remains recommended before production release.

Git commit: 066e109

---

# M16 — AI conversation compression

STATUS: COMPLETE ✓

Implement structured summaries.

Avoid infinite chat history in prompts.

Measure token usage.

Acceptance:

long-running conversation remains useful without resending entire history.

Implemented automatic structured summaries when a conversation reaches 20 messages or approximately 15K tokens; only older messages are compressed in bounded 10-message/20K-character batches while the latest 10 remain in context. Provider token usage is logged; request prompt size is estimated and returned. Summary updates are monotonic and concurrency-safe.

**QUALITY GATE:** typecheck, lint, 96 unit/integration tests, production build, and 8 Playwright tests passed. Critical review verified bounded DB reads, prompt-injection handling, no financial arithmetic in summary policy, stale-summary protection, and graceful handling of summary provider failure.

Git commit: 8c17ea8

---

# M17 — AI eval suite

STATUS: COMPLETE ✓

Create at least 40 realistic scenarios.

Must include:

- HARD expenses;
- debt partial payments;
- competing deadlines;
- insufficient money;
- future income;
- overdue debts;
- negotiable expenses;
- goals;
- contradictory priorities.

Add deterministic assertions where possible.

Prompt/policy changes must run against evals.

Implemented 45 deterministic financial scenarios covering the nine required domains, centralized runtime prompt policies with regression contracts, safe-integer arithmetic checks, malformed provider output coverage, and foreign target ownership checks. The suite is deterministic and does not call an external model.

**QUALITY GATE:** typecheck, lint, 145 unit/integration tests, production build, and 8 Playwright tests passed. Targeted AI eval/ownership/provider suite passed 55 tests. Live model-quality scoring was not run because no OpenAI API key is configured; policy and deterministic financial invariants are covered offline. Independent Opus audit remains recommended before production release.

Git commit: 8963d28

---

# M18 — Notifications

STATUS: COMPLETE ✓

Implement PWA and Web Push.

Notifications:

- upcoming HARD obligation;
- insufficient reserve;
- overdue payment;
- expected incoming payment;
- delayed payment;
- weekly budget warning.

Implemented notification persistence, deterministic scheduling, ownership-scoped APIs, generic mobile UI, PWA manifest/service worker, and strict Web Push endpoint validation.

**QUALITY GATE:** typecheck, lint, 146 unit/integration tests, production build, and 9 Playwright tests passed. Web Push delivery remains safely disabled without VAPID/web-push configuration.

---

# M19 — Transaction import

STATUS: COMPLETE ✓

Start with:

CSV
manual statement import

Implement:

normalization
deduplication
matching
classification

AI categorization only when deterministic matching is insufficient.

Implemented manual CSV staging, strict integer-kopeck normalization, PostgreSQL deduplication, user-scoped existing-entry matching, deterministic category hints, explicit confirmation, and mobile review flow. Untrusted descriptions are bounded and sanitized; no AI categorization is invoked.

**QUALITY GATE:** typecheck, lint, 150 unit/integration tests, production build, and 10 Playwright tests passed. One integration test verifies deduplication and confirmation idempotency.

---

# M20 — Bank provider architecture + AI provider configuration

STATUS: COMPLETE ✓

## Bank Provider

Implement BankProvider interface.

Do not tightly couple financial domain to any individual Russian bank API.

Add direct providers only after verifying practical API availability and authorization requirements.

## User-Configurable AI Provider

Implement user-configurable OpenAI-compatible AI provider.

**Scope:**

- Database schema: `ai_provider_configs` table with encrypted API keys
- Encryption utility: AES-256-GCM for API key storage (reuse SECURITY.md pattern)
- Provider config service: save/get/delete with validation (HTTPS only, max lengths, SSRF protection)
- Custom provider implementation: `CustomOpenAICompatibleProvider` using same structured output format
- Provider selection: custom → system → error fallback
- Test connection API: non-financial minimal schema test
- Mobile settings UI: Base URL, API key (masked), model name, test button
- Security tests: encryption, ownership, SSRF, no-log
- Integration test: custom provider → structured output → validation
- E2E test: configure → test → use in chat

**Financial invariants unchanged:**

- Same FinancialSnapshot
- Same structured output validation pipeline
- Same deterministic validation
- Same financial engine authority
- Same HARD protection enforcement

**Security requirements:**

- API keys encrypted at rest (AES-256-GCM)
- Never return decrypted key to client
- Never log API keys
- HTTPS-only base URLs
- Block localhost/private networks in production
- Rate limiting: same as system provider (10/min, 100/hour)
- Ownership isolation: one config per user

**Acceptance:**

- Migration applied successfully
- User can save custom provider config
- API key encrypted in database
- Test connection works with OpenAI-compatible endpoint
- Custom provider used in chat when configured
- System provider used as fallback
- Security tests pass (encryption, SSRF, ownership, no-log)
- Integration test passes
- E2E test passes
- Typecheck, lint, build pass

**QUALITY GATE:** typecheck, lint, 156 unit/integration tests, production build, and 11 Playwright tests passed. Critical review found no BLOCKER/CRITICAL/HIGH findings. Process-local rate limiting and DNS-rebinding SSRF protection are explicitly deferred to M21 deployment hardening.

Git commit: eb0696e

See AGENTS.md for full architecture.

---

# M21 — Security hardening

STATUS: COMPLETE ✓

Review:

- secrets;
- permissions;
- API routes;
- rate limiting;
- prompt injection;
- external transaction text;
- database exposure;
- Caddy configuration;
- headers;
- audit log.

Run independent security review.

M21 implementation scope: production fail-closed session boundary using `APP_AUTH_TOKEN`, same-origin checks, security headers/CSP, general and import request limits, DNS-aware custom-provider SSRF revalidation, hostile AI/external-text sanitization, and localhost-only development database binding. Audit-log persistence and distributed limiter storage remain required follow-ups before public multi-instance deployment.

**QUALITY GATE:** typecheck, lint, 160 unit/integration tests, production build, 11 Playwright tests, and `git diff --check` passed. Critical review found no BLOCKER/CRITICAL/HIGH findings. The remaining audit-log and distributed-limiter items are documented production follow-ups for M22/M23.

Git commit: 159feab

---

# M22 — Reliability

STATUS: COMPLETE ✓

Add:

- backup automation;
- restore procedure;
- health checks;
- structured logging;
- error monitoring;
- job monitoring.

Test restore from backup.

M22 implementation scope: encrypted custom-format PostgreSQL backup/restore/verification scripts, database-backed job-run monitoring primitives, redacted JSON structured logging, and a database readiness health endpoint. pg-boss worker wiring remains deferred until M23 deployment composition.

**QUALITY GATE:** typecheck, lint, 163 unit/integration tests, production build, 11 Playwright tests (single worker), `git diff --check`, shell syntax checks, and an encrypted local backup plus `pg_restore --list` verification passed. Critical review found no BLOCKER/CRITICAL/HIGH findings.

Git commit: 52b9b13

---

# M23 — Production deployment

STATUS: COMPLETE ✓

Deploy to VPS.

Docker Compose:

caddy
web
worker
postgres

Verify HTTPS.

Protect initial single-user deployment from public access.

Run production smoke tests.

Implemented production Dockerfile, `.dockerignore`, Caddy TLS reverse-proxy config, Compose topology with internal PostgreSQL, migration gate, worker, web, and health checks, production env template, and authenticated smoke script. No VPS deployment or production secret use was performed in this environment.

**QUALITY GATE:** typecheck, lint, 163 unit/integration tests, production build, 11 Playwright tests (single worker), `git diff --check`, `docker compose config`, Docker image build, Caddy config validation, worker heartbeat/shutdown smoke, backup verification, and shell syntax checks passed. Critical review found no BLOCKER/CRITICAL/HIGH architecture findings. `npm audit --omit=dev` reports two nested PostCSS advisories requiring a breaking Next.js 16 upgrade; this must be resolved before public production release. The worker currently provides a supervised heartbeat and job-monitoring integration point; no domain job queue is enabled until pg-boss is introduced.

Git commit: pending

---

# M24 — Final product audit

STATUS: TODO

Perform independent architecture and code review.

Review:

- financial correctness;
- AI safety;
- UX;
- database integrity;
- security;
- test gaps;
- dead code;
- token cost;
- error handling.

Fix Critical and High findings.

Run entire suite.

Declare v1 only after final audit succeeds.
