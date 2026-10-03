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

Git commit: pending

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

Git commit: pending

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

Git commit: pending

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

Git commit: pending

---

# M10 — Dashboard

STATUS: IN PROGRESS

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

---

# M11 — Planning cycles

STATUS: TODO

Implement:

- current planning cycle;
- opening balance;
- expected inflows;
- obligations;
- allocations;
- remaining money.

Do not hardcode Thursday.

User can define cycle boundaries/payment cadence.

---

# M12 — Financial simulation engine

STATUS: TODO

Implement deterministic simulation.

Examples:

simulate paying Debt A
simulate closing Debt B
simulate funding goal
simulate reducing negotiable expense
compare resulting free balance

AI must consume this engine instead of performing authoritative arithmetic itself.

Extensive unit tests required.

---

# M13 — AI infrastructure

STATUS: TODO

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

---

# M14 — AI adviser/chat

STATUS: TODO

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

---

# M15 — AI weekly budgeting

STATUS: TODO

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

---

# M16 — AI conversation compression

STATUS: TODO

Implement structured summaries.

Avoid infinite chat history in prompts.

Measure token usage.

Acceptance:

long-running conversation remains useful without resending entire history.

---

# M17 — AI eval suite

STATUS: TODO

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

---

# M18 — Notifications

STATUS: TODO

Implement PWA and Web Push.

Notifications:

- upcoming HARD obligation;
- insufficient reserve;
- overdue payment;
- expected incoming payment;
- delayed payment;
- weekly budget warning.

---

# M19 — Transaction import

STATUS: TODO

Start with:

CSV
manual statement import

Implement:

normalization
deduplication
matching
classification

AI categorization only when deterministic matching is insufficient.

---

# M20 — Bank provider architecture

STATUS: TODO

Implement BankProvider interface.

Do not tightly couple financial domain to any individual Russian bank API.

Add direct providers only after verifying practical API availability and authorization requirements.

---

# M21 — Security hardening

STATUS: TODO

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

---

# M22 — Reliability

STATUS: TODO

Add:

- backup automation;
- restore procedure;
- health checks;
- structured logging;
- error monitoring;
- job monitoring.

Test restore from backup.

---

# M23 — Production deployment

STATUS: TODO

Deploy to VPS.

Docker Compose:

caddy
web
worker
postgres

Verify HTTPS.

Protect initial single-user deployment from public access.

Run production smoke tests.

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
