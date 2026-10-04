# CURRENT_STATE.md

Last updated: 2026-10-04

## Project status

STATUS: M15 COMPLETE — QUALITY GATE PASSED — M16 IN PROGRESS

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
- Next.js 15 with App Router
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

---

## Current database state

No finalized schema yet.

---

## Current AI state

No AI integration yet.

---

## Current deployment state

Not deployed.

---

## Current tests

None yet.

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

**Milestone 16:** IN PROGRESS

AI conversation compression with durable summaries.

---

## Next action

M15 review checkpoint passed: 94 unit/integration tests, typecheck, lint, production build, and 8 Playwright tests; critical review fixed batch atomicity and idempotency risks. Independent Opus financial audit remains recommended before production release.

External self-review script intentionally not invoked.

Continue M16 — AI conversation compression

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
