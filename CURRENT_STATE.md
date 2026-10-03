# CURRENT_STATE.md

Last updated: 2026-10-03

## Project status

STATUS: M0 COMPLETE — ARCHITECTURE REVIEWED AND REFINED — AUTOPILOT READY

Milestone 0 завершён. Architectural documentation создана, независимый review проведён, критические находки исправлены.

AUTOPILOT infrastructure создана для автономной разработки M1→M23.

Ready to proceed to M1 (Repository foundation).

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

None yet.

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

Milestone 0: COMPLETE ✓

Deliverables:
- PRODUCT.md — product requirements and user flows
- DOMAIN_RULES.md — financial invariants and business rules (updated with HARD horizon protection, snapshot transactions, approval re-validation)
- DATABASE.md — complete schema design (updated: bigint for money, timestamptz, audit protection, active cycle constraint, optimistic locking)
- AI_POLICY.md — AI integration boundaries and tools (updated: validation strengthening, token limits, rate limiting, circuit breaker)
- SECURITY.md — security architecture (updated: mandatory authentication, audit protection)
- TEST_PLAN.md — comprehensive testing strategy (updated: concurrency and failure mode tests)
- DESIGN_SYSTEM.md — UI/UX specifications and components

**Architecture Review:** Complete
- Independent audit conducted
- 5 CRITICAL findings → fixed
- 13 HIGH findings → fixed
- 4 MEDIUM findings → fixed/documented
- See ARCHITECTURE_REVIEW_RESPONSE.md for detailed analysis

---

## Next action

**READY FOR AUTOPILOT START**

Primary implementation agent (Claude Sonnet 5.5) should:

1. Read AUTOPILOT.md
2. Read TASKS.md
3. Identify first incomplete milestone (M1)
4. Begin autonomous implementation workflow
5. Proceed through M1→M23 with mandatory review checkpoints at M5, M10, M12, M17, M23

User initiates AUTOPILOT with:
```
Continue with AUTOPILOT workflow. Start with first incomplete milestone in TASKS.md.
```

Agent will:
- Implement each milestone autonomously
- Run verification (typecheck, lint, tests, Playwright)
- Update documentation
- Create git commits
- Execute review checkpoints automatically
- Process findings and fix BLOCKER/CRITICAL/HIGH issues
- Proceed to next milestone without waiting for user

See AUTOPILOT.md for complete workflow specification.

Manual alternative (if not using AUTOPILOT):
- Proceed to M1: Repository foundation
- Next.js + TypeScript setup
- Docker Compose dev environment
- PostgreSQL + Drizzle ORM
- Tailwind + shadcn/ui
- Vitest + Playwright
- Authentication setup (NextAuth.js)
- Mobile application shell

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
