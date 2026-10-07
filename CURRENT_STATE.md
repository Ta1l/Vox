# CURRENT_STATE.md

Last updated: 2026-10-08

## Project status

STATUS: M23 COMPLETE — QUALITY GATE PASSED — M24 FINAL AUDIT PENDING

Dependency audit: Next.js 16.4.0 and Tailwind CSS 4.3.3; production Docker runner installs only production dependencies. Production audit has 0 advisories. Nine dev-only advisory nodes remain through stable Drizzle Kit and matching Next ESLint config; see `DEPENDENCY_AUDIT_REPORT.md`. VPS deployment has not been performed.

Milestone 5 завершён. Calendar с financial events реализован.

M5 internal quality gate passed. The external Codex review script was not invoked because Codex is the implementation agent.

---

## Confirmed product requirements

The application is:

- mobile-first;
- RUB-only;
- initially single-user;
- architecturally multi-user-ready;
- hosted on a private VPS;
- production-oriented.

Confirmed major functionality:

- daily income recording;
- expected payout date;
- income-in-transit state;
- daily expenses;
- expense comments;
- scheduled/recurring obligations;
- mandatory vs negotiable obligations;
- debts;
- goals;
- protected reserves;
- weekly budget planning;
- AI financial adviser/chat;
- AI scenario comparison;
- push notifications;
- future bank transaction integration/import.

---

## Confirmed architecture

Frontend/API:
Next.js modular monolith

Database:
PostgreSQL

ORM:
Drizzle

Validation:
Zod

Background jobs:
pg-boss

Tests:
Vitest + Playwright

Deployment:
Docker Compose + Caddy + VPS

AI:
provider abstraction with deterministic Financial Engine

---

## Current implementation

**M1 - Repository foundation:** COMPLETE ✓
- Next.js 16 with App Router
- TypeScript strict mode
- Tailwind CSS
- Mobile-first UI shell (390×844 viewport)
- Bottom navigation
- Health API endpoint
- Vitest + Playwright configured

**M2 - PostgreSQL and persistence:** COMPLETE ✓
- Docker Compose with PostgreSQL 16
- Drizzle ORM
- Money utilities (integer kopecks)
- Users table migration
- Database connection tested

**M3 - Income tracking:** COMPLETE ✓
- Income entry schema with state machine (EARNED/IN_TRANSIT/RECEIVED/DELAYED/CANCELLED)
- State transition validation (RULE-I3)
- Income domain service
- Financial invariants: RULE-I1 (received only counts), RULE-I2 (in-transit separate)
- API endpoints (POST /api/income, GET /api/income)
- Mobile income form
- 11 comprehensive tests covering state transitions and financial rules
- Database migration with constraints and indexes

**M4 - Expenses:** COMPLETE ✓
- Expense entry schema
- Expense domain service
- API endpoints (POST /api/expenses, GET /api/expenses)
- Mobile expense form with categories
- RULE-E1: Expense immediately reduces available balance
- 5 unit tests covering expense creation and totals
- Database migration with indexes

**M5 - Calendar:** COMPLETE ✓
- Mobile calendar component with month grid
- Calendar service aggregating income/expenses by date
- API endpoint (GET /api/calendar?year=&month=)
- Day events showing earned/received/expected income and expenses
- Date selection with event details
- 2 unit tests covering event aggregation

**M6 - Recurring obligations:** COMPLETE ✓
- Recurring obligation schema and migration (`drizzle/0003_third_steve_rogers.sql`)
- ONE_TIME, DAILY, WEEKLY, BIWEEKLY, MONTHLY, and CUSTOM date generation
- HARD, NEGOTIABLE, and FLEXIBLE protection inheritance
- Idempotent occurrence generation with unique obligation/date constraint
- PAID and OVERDUE transitions with immutable paid state
- Calendar integration for scheduled payments
- API endpoints for obligation creation, occurrence listing, and generation
- 5 obligation tests plus calendar regression coverage
- Quality gate passed: typecheck, lint, 54 unit tests, production build, 3 mobile Playwright tests

**M7 - Debts:** COMPLETE ✓
- Debt and debt-payment schemas/migrations (`drizzle/0005`–`0007`)
- Original/current balance, minimum payment, schedule, priority, due date, notes, status
- Transactional partial payments with optimistic version guard
- Auditable previous/new balances, optional idempotency key, and ownership checks
- Catch-up amount calculation from missed minimum-payment intervals
- Debt APIs and mobile `/debts` creation/list flow
- Quality gate passed: typecheck, lint, 60 unit tests, production build, 4 mobile Playwright tests

**M8 - Goals:** COMPLETE ✓
- Goals and contribution schemas/migration (`drizzle/0008_tiresome_jack_power.sql`)
- Target, saved progress, deadline, priority, protection level, description, and status
- Transactional contribution history with target-overflow and optimistic concurrency checks
- Ownership-scoped goals/contributions APIs and mobile `/goals` flow
- Quality gate passed: typecheck, lint, 63 unit tests, production build, 5 mobile Playwright tests

**M9 - Protected envelopes:** COMPLETE ✓
- Envelope schema/migration (`drizzle/0009_useful_loa.sql`) with HARD/NEGOTIABLE/FLEXIBLE protection
- Deterministic financial snapshot: available cash, in-transit income, protected, HARD-protected, discretionary
- Funding constrained by discretionary balance; envelope spending cannot exceed funded amount
- Financial tests prove IN_TRANSIT is excluded and HARD reserves cannot be allocated elsewhere
- `/api/envelopes`, `/api/financial-summary`, and mobile `/envelopes` flow
- Quality gate passed: typecheck, lint, 65 unit tests, production build, 6 mobile Playwright tests

**M10 - Dashboard:** COMPLETE ✓
- Deterministic dashboard service/API combines financial snapshot, weekly/monthly earned income and expenses, nearest payments, active debts, active goals, and alerts
- Mobile dashboard renders current cash, protected/discretionary funds, income in transit, period totals, obligations, debts, goals, and loading/error states
- UTC date boundaries include the full current day; all queries remain user-scoped
- Quality gate passed: typecheck, lint, 66 unit tests, production build, 6 mobile Playwright tests

**M11 - Planning cycles:** COMPLETE ✓
- Added `planning_cycles` and `budget_allocations` schema/migration with one ACTIVE cycle per user
- Cycle creation snapshots available balance and expected income without making IN_TRANSIT spendable
- Allocation validation reserves pending/overdue obligations, checks target ownership, supports idempotency, and locks the cycle row for concurrent writes
- Mobile `/planning` page and cycle/allocation APIs are available
- Quality gate passed: typecheck, lint, 71 unit tests, production build, 7 mobile Playwright tests

**M12 - Financial simulation engine:** COMPLETE ✓
- Added read-only deterministic scenario simulation for debt, goal, and negotiable-obligation decisions
- Simulation validates integer/safe kopecks, rejects foreign entities and protected-fund spending, preserves IN_TRANSIT separation, and never writes financial records
- Added DB-backed integration and adversarial/property-style tests, plus concurrency audit coverage for user-level financial mutations
- Quality gate passed: typecheck, lint, 80 unit/integration tests, production build, 7 mobile Playwright tests, specialized financial audit

**M13 - AI infrastructure:** COMPLETE ✓
- Added server-only AIProvider/OpenAI Responses implementation with strict structured output and runtime schema validation
- Added compact deterministic FinancialSnapshot with stable version hash and user-bound typed tools for snapshot/simulation
- Added `ai_usage_log` schema/migration, token/cost recording, and no-key/no-secret tests
- OpenAI API was not called in this environment because no API key was provided
- Quality gate passed: typecheck, lint, 87 unit/integration tests, production build, 7 mobile Playwright tests

**M14 - AI adviser/chat:** COMPLETE ✓
- Added user-scoped conversation/message/structured-summary persistence in migration 0012
- Bounded latest-10 message context with current deterministic FinancialSnapshot
- Runtime-validated draft-only AI advice, server-side usage logging, and mobile `/chat` flow
- Quality gate passed: typecheck, lint, 91 unit/integration tests, build, mobile Playwright chat coverage
- OpenAI API was not called without a configured key; independent Opus audit remains recommended before production release

**M15 - AI weekly budgeting:** COMPLETE ✓
- Added strict BudgetProposal schema, snapshot-version validation, ownership checks, deterministic totals, and explicit approve/reject/edit/discuss UI
- Approval now uses atomic planning allocation batch writes and proposal-specific idempotency keys
- Full gate passed: typecheck, lint, 94 unit/integration tests, production build, 8 Playwright tests
- Independent Opus financial audit remains recommended before production release

**M16 - AI conversation compression:** COMPLETE ✓
- Automatically stores strict structured summaries after 20 messages or an estimated 15K-token history threshold
- Compresses only the prefix older than the latest 10 messages, in bounded batches; provider token use is logged and current prompt size is estimated
- Summary writes are monotonic under a conversation row lock; summary failure does not discard a successful advice reply
- Quality gate passed: typecheck, lint, 96 unit/integration tests, production build, 8 Playwright tests
- Independent Opus audit remains recommended before production release

**M17 - AI eval suite:** COMPLETE ✓
- Added 45 realistic deterministic scenarios across all required financial/adversarial categories and locked runtime prompt contracts into the eval suite
- Added safe-integer proposal arithmetic and foreign target ownership regression checks; existing provider tests cover malformed structured output
- Full gate passed: typecheck, lint, 145 unit/integration tests, production build, 8 Playwright tests
- Live model scoring was not run because `OPENAI_API_KEY` is not configured; deterministic tests need no external model. Independent Opus audit remains recommended before production release

---

## Current database state

PostgreSQL schema and migrations are implemented through migration 0016 (transaction imports, user AI provider configuration, and job-run monitoring).

M18 notification scheduling, ownership-scoped APIs, generic mobile UI, manifest, and service-worker click handling are complete. Quality gate passed: typecheck, lint, 146 unit/integration tests, production build, and 9 Playwright tests. Push delivery is deferred when VAPID/web-push infrastructure is not configured; independent Opus audit remains recommended before production release.

M19 manual CSV transaction import is complete: staging, normalization, deduplication, deterministic category hints, existing-entry matching, and explicit confirmation. Quality gate passed: typecheck, lint, 150 unit/integration tests, production build, and 10 Playwright tests.

M20 bank-provider architecture and user-configurable OpenAI-compatible provider are complete. Bank adapters return normalized rows without writing financial records; custom provider keys are AES-256-GCM encrypted, provider selection is custom → system → error, and all responses use the existing structured-output validation pipeline. Quality gate passed: typecheck, lint, 156 unit/integration tests, production build, and 11 Playwright tests. The limiter is process-local for V1 and must move to shared storage during M21 deployment hardening; DNS-based SSRF defenses also remain a M21 task.

M21 security hardening is complete. Production now fails closed unless `APP_AUTH_TOKEN` and `APP_URL` are configured and requests carry the HttpOnly `fin_session` cookie obtained from `/api/auth/login`; development remains seed-compatible. Middleware adds same-origin checks for state-changing API requests, general/import rate limits, CSP/security headers, and generic authentication errors. Custom provider requests re-check DNS resolution for private addresses in production, AI prompt text is sanitized as untrusted data, and PostgreSQL binds to localhost in the development compose file. Distributed limiter storage and append-only financial audit-log wiring remain pre-public-deployment follow-ups.

M22 reliability is complete: encrypted custom-format backup/restore/verification scripts, readiness health checks, redacted JSON logging, and migration 0016 `job_runs` monitoring primitives are available.

---

## Current AI state

AI infrastructure includes structured OpenAI provider, strict output validation, usage logging, read-only FinancialSnapshot context, bounded chat history, durable summaries, and draft-only advice/proposals. OPENAI_API_KEY is not configured in the local test environment; provider behavior is mocked in tests.

---

## Current deployment state

Deployment uses Docker Compose with PostgreSQL, the web app, worker, migrations, and Caddy. Configure the public domain and production environment privately; deployment-specific addresses, paths, and operational details are not published.

---

## Current tests

Unit/integration suite: 163 tests passed. Playwright mobile navigation suite: 11 tests passed in a single worker. Typecheck, lint, production build, Docker build, Compose validation, Caddy validation, and encrypted backup verification passed.

---

## Known architectural constraints

- Money stored as integer kopecks.
- Expected income is not current balance.
- HARD money cannot be reallocated by AI.
- AI cannot write directly to PostgreSQL.
- All AI financial allocations require deterministic validation.
- User ownership is included from the beginning.
- Mobile UX is the primary UX.

---

## Current milestone

**Milestone 24:** PENDING

Final independent product audit.

---

## Next action

M23 is complete locally; M24 independent audit remains pending.

External self-review script intentionally not invoked.

Continue M24 — final audit when an independent reviewer is available.

M23 deployment artifacts are implemented and locally validated: multi-stage Docker image, production Compose topology (`caddy`, `web`, one-shot `migrate`, `worker`, `postgres`), internal-only database network, health-gated startup, Caddy TLS reverse proxy, production env template, worker heartbeat, and authenticated production smoke script. No real VPS or production secrets were touched. `docker compose config`, Docker image build, worker startup/shutdown, Caddy validation, and all pre-existing test gates pass. `npm audit --omit=dev` still reports two nested PostCSS advisories requiring a breaking Next.js 16 upgrade; this remains a release-blocking dependency follow-up rather than an unsafe force upgrade. The worker currently provides a supervised heartbeat and job-monitoring integration point; no domain job queue is enabled until pg-boss is introduced.

See TASKS.md and AUTOPILOT.md.

---

## Updating this file

After every completed implementation milestone update:

- status;
- implemented modules;
- migrations;
- tests;
- known problems;
- deployment state;
- current milestone;
- next action.

Keep this file concise.

Do not turn it into a changelog.

## Main screen presentation redesign (2026-10-06)

- Calendar-first mobile home screen uses existing dashboard and calendar APIs.
- Current available cash remains tied to the dashboard financial snapshot; calendar net uses received income minus expenses.
- Added presentation calendar helpers/tests, privacy masking, month navigation, day view, action sheet, offline/error/loading states, and safe-area/touch accessibility polish.
- No domain, API, schema, auth, or mutation flow changes.

## Selected day implementation (2026-10-07)

- Day view now shows earned, in transit, received, and spent amounts; cash net is secondary. The inline form records positive ruble amounts for the selected past/present UTC date through `POST /api/income` as `EARNED`, then reloads calendar and dashboard. Future dates are read-only.
- RULE-FS2 now counts `EARNED + IN_TRANSIT` in both income and financial snapshots. Calendar `inTransitIncome` follows `earnedAt`; `expectedIncome` keeps its expected payment date. `CANCELLED` does not count as earned. Available and discretionary cash still require `RECEIVED`.
- No migration or new dependency. Server validation rejects unsafe kopeck integers. The form guards duplicate taps, preserves a failed draft, distinguishes unknown POST outcome from a saved POST with failed refresh, and keeps screenshot/AI blocks informational.
- Checks: 52 targeted unit tests (7 files), 4 day-view E2E tests and 3 affected navigation E2E tests pass; typecheck, lint and production build pass. A real API POST on a temporary development test user returned EARNED and GET calendar/dashboard confirmed earned and transit +500050 kopecks with available/discretionary unchanged; test records were removed.
- Before/after browser screenshots at 375×812 and 390×844 are in `.planning/2026-10-07-day-view-implementation/`; `day-after-baseline-*` uses the original planning fixture for direct comparison. Route mocks are visual/interaction evidence only. No physical phone was available; safe-area, keyboard and gesture behavior still need hardware verification.
