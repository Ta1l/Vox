# CURRENT_STATE.md

Last updated: 2026-10-03

## Project status

STATUS: M2 COMPLETE — DATABASE AND MONEY UTILITIES READY

Milestone 2 завершён. PostgreSQL database с Money utilities реализованы.

Ready to proceed to M3 (Income tracking).

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

**Milestone 2:** COMPLETE ✓

PostgreSQL database with Drizzle ORM and Money utilities.

---

## Next action

Proceed to M3: Income tracking
- Income entry schema
- IN_TRANSIT state lifecycle
- Mobile income form
- Income does not increase balance until RECEIVED

See TASKS.md.

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
