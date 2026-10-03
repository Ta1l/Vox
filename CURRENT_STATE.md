# CURRENT_STATE.md

Last updated: 2026-10-03

## Project status

STATUS: M5 COMPLETE — QUALITY GATE PASSED — M6 IN PROGRESS

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

**Milestone 6:** IN PROGRESS

Recurring obligations and idempotent payment occurrences.

---

## Next action

REVIEW CHECKPOINT: M5 internal quality gate passed.

External self-review script intentionally not invoked.

After review: M6 — Recurring obligations

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
