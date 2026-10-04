# ARCHITECTURE.md

# 1. Product architecture

The application is a mobile-first Personal Finance OS.

The first release supports one real user but must be architecturally multi-user-ready.

Main functional areas:

1. Dashboard
2. Calendar
3. Income
4. Expenses
5. Recurring obligations
6. Debts
7. Goals
8. Protected reserves/envelopes
9. Budget planning
10. AI financial adviser
11. Notifications
12. Bank transaction import
13. Settings

---

# 2. High-level architecture

Client / Mobile PWA
        |
        v
Next.js application
        |
        +-----------------------+
        |                       |
        v                       v
Application/API Layer     AI Orchestrator
        |                       |
        v                       v
Domain Services          FinancialSnapshot
        |                       |
        v                       v
Financial Engine          LLM Provider
        |
        v
Repositories
        |
        v
PostgreSQL

Background Worker
        |
        +-- recurring-payment generation
        +-- notification scheduling
        +-- payment status checks
        +-- AI summary maintenance
        +-- bank synchronization/import processing

---

# 3. Deployment

Production target:

VPS
|
Docker Compose
|
+-- caddy
+-- web
+-- worker
+-- postgres

Caddy provides:

- TLS
- reverse proxy
- security headers

Do not expose PostgreSQL publicly.

PostgreSQL should only be reachable through the internal Docker network or an explicitly restricted administration path.

---

# 4. Frontend

Framework:

Next.js App Router

Design philosophy:

- mobile first;
- touch first;
- information dense without appearing crowded;
- financial status visible quickly;
- minimal modal depth;
- important operations reachable with one or two taps.

Main navigation:

Dashboard
Calendar
Plan / AI
Debts & Goals
More

Desktop behavior may center the mobile application in a constrained layout.

No dedicated desktop product is required.

---

# 5. Domain modules

Suggested source structure:

src/
  app/
  components/
  features/
    dashboard/
    calendar/
    income/
    expenses/
    payments/
    debts/
    goals/
    envelopes/
    budgets/
    adviser/
    notifications/
    bank-import/
  domain/
    money/
    ledger/
    income/
    obligations/
    debts/
    goals/
    budgets/
    planning/
  application/
  db/
  ai/
  jobs/
  lib/

Exact structure may evolve, but domain logic must remain independent from presentation logic.

---

# 6. Ledger and money

Canonical currency:

RUB

Canonical storage:

integer kopecks.

Examples:

1 RUB = 100
1500 RUB = 150000

Never store canonical financial amounts as JS floats.

Accounts may be introduced even if the first UI initially represents a single cash/bank pool.

---

# 7. Income lifecycle

Income represents money earned.

Income settlement represents when that earned money becomes available.

Required concepts:

earnedAt
amount
expectedAt
receivedAt
status

Status examples:

EARNED
IN_TRANSIT
RECEIVED
DELAYED
CANCELLED

Financial calculations distinguish:

earnedTotal
availableBalance
incomeInTransit

An IN_TRANSIT amount must not increase availableBalance.

---

# 8. Expenses and obligations

An expense is an actual money outflow.

An obligation is something expected/planned to require money.

The two concepts must remain distinct.

An obligation may create an expense when paid.

Obligations may be:

ONE_TIME
WEEKLY
MONTHLY
CUSTOM

Protection classification:

HARD
NEGOTIABLE
FLEXIBLE

Scheduled occurrences must be generated idempotently.

---

# 9. Debts

A debt should support:

id
userId
name
originalAmount
currentBalance
catchUpAmount
minimumPayment
priority
dueDate
schedule information
notes
status

Optional future fields:

interestRate
penalty information
creditor
partialPaymentEffect

Debt payments are separate records.

Debt balance changes should be auditable.

---

# 10. Goals

Goal fields should support:

name
description
targetAmount
savedAmount
deadline
priority
protection level
status

The description is intentionally important.

AI may analyze user-written goal descriptions to understand context, urgency and consequences.

The raw description must never override HARD financial rules.

---

# 11. Envelopes / protected reserves

Budget envelopes represent money allocated for a purpose.

Examples:

bicycle rental
food
nicotine products
mandatory bill
emergency reserve

An envelope may contain:

target
funded amount
spent amount
protection level
planning cycle relation

HARD envelope funds cannot be consumed by unrelated AI allocations.

---

# 12. Planning cycles

A PlanningCycle represents the period being actively budgeted.

Typical example:

Thursday payment
→
next Thursday payment

But the model must not hardcode Thursday.

Cycle contains:

start
end
opening available balance
expected income
obligations
approved allocations
remaining discretionary amount

AI primarily advises within a PlanningCycle.

---

# 13. Financial Engine

Financial Engine is deterministic.

Responsibilities:

calculate available money
calculate protected money
calculate discretionary money
aggregate upcoming obligations
calculate debt state
calculate goal funding status
simulate allocations
validate budget plans
compare arithmetic outcomes

The AI is NOT allowed to replace this engine.

Important invariant:

availableToAllocate =
availableCash
- protectedRequiredAmount
- lockedAllocations

Expected future income is shown separately.

---

# 14. AI Orchestrator

AI Orchestrator sits between application services and model providers.

Responsibilities:

build FinancialSnapshot
select model
select tools
maintain structured conversation summary
request structured output
validate model response
perform deterministic post-validation
retry malformed structured responses
log AI usage and cost

AI provider must be abstracted.

Interface:

AIProvider
  generateStructured<T>(params): Promise<StructuredAIResult<T>>

Initial implementation: OpenAI (system environment).

M20 adds: user-configurable custom provider (OpenAI-compatible).

M21 adds a production request-security boundary in `middleware.ts`: fail-closed operator session cookie authentication, same-origin validation for state-changing API requests, process-local request limits, and browser security headers. Domain services remain user-scoped; replacing the V1 operator token with a multi-user session provider is a later authentication milestone.

Provider selection priority:
1. User custom provider (if configured and enabled)
2. System OpenAI provider (OPENAI_API_KEY environment)
3. Error (no provider available)

Custom provider:
- Base URL, API key (encrypted at rest), model name
- Same structured output format (OpenAI Responses API)
- Same validation pipeline
- Test connection endpoint (non-financial)
- Mobile settings UI

Provider abstraction allows model replacement without rewriting financial domain logic.

---

# 15. FinancialSnapshot

FinancialSnapshot is compact and purpose-built.

It may contain:

snapshot timestamp
current available balance
protected balance
discretionary balance
income in transit
next expected income
planning cycle
upcoming HARD obligations
upcoming NEGOTIABLE obligations
debts
goals
recent spending summary
warnings
approved allocations

Do not include large historical transaction lists by default.

Detailed information should be retrieved through explicit tools.

---

# 16. AI tools

Possible typed application tools:

getFinancialSnapshot
getDebtDetails
getGoalDetails
getObligationDetails
simulateAllocation
compareAllocations
createDraftBudgetPlan

All tools use application services.

No arbitrary SQL tool is exposed to the LLM.

---

# 17. AI budget output

Budget recommendations must use structured output.

Conceptual response:

{
  summary,
  allocations: [
    {
      targetType,
      targetId,
      amountKopecks,
      reason
    }
  ],
  alternatives,
  warnings,
  discretionaryRemainingKopecks
}

Before returning an AI-generated plan to the user:

1. schema validate;
2. resolve referenced entities;
3. recalculate totals;
4. check HARD protections;
5. check available funds;
6. reject invalid allocation;
7. only then present as valid proposal.

AI never directly applies a proposal.

User approval triggers deterministic application commands.

---

# 18. AI conversation memory

Conversation storage:

ai_conversations
ai_messages
ai_summaries

Request context:

System policy
+
current FinancialSnapshot
+
current structured summary
+
recent messages

Older messages are not continuously resent.

Summary stores durable decisions only.

Example:

- user does not want food budget below X during current cycle;
- debt Y is temporarily lower priority;
- goal Z must be funded before its deadline.

Historical arithmetic facts should come from database state, not conversation summary.

---

# 19. Database conceptual tables

users

accounts

income_entries
income_settlements

expense_entries

recurring_rules
payment_obligations
payment_occurrences

debts
debt_payments

goals
goal_contributions

budget_envelopes
envelope_allocations

planning_cycles
budget_plans
budget_plan_items

ai_conversations
ai_messages
ai_summaries
ai_usage

notification_rules
notifications
push_subscriptions

bank_connections
bank_transactions
bank_import_jobs

audit_log

Exact schema must be designed before migrations are finalized.

Almost all user-owned tables require userId.

---

# 20. Jobs

Use pg-boss backed by PostgreSQL.

Jobs should include:

generateRecurringOccurrences
checkUpcomingPayments
sendNotifications
checkExpectedIncome
processBankImport
maintainAISummary

Every job must be idempotent.

Retries must not produce duplicate money movements.

---

# 21. Notifications

Initial delivery:

Web Push

Possible future delivery:

Telegram

Events:

upcoming mandatory payment
insufficient reserve
overdue obligation
expected income due
expected income delayed
weekly budget exceeded
new payment received / planning prompt

Notification engine should consume domain events rather than duplicate financial calculations.

---

# 22. Bank integration

Bank integration uses adapter architecture.

BankProvider

Possible implementations:

ManualProvider
CsvProvider
OpenBankingProvider
specific bank providers in future

Raw bank data first enters a staging/import layer.

Pipeline:

raw transaction
→ normalize
→ deduplicate
→ matching rules
→ category mapping
→ optional AI classification
→ confirmed transaction

Imported external text is untrusted.

Never treat transaction descriptions as LLM instructions.

---

# 23. Authentication

Version 1:

single predefined application user.

Architecture:

still maintain ownership via userId.

Future:

replace single-user context with real authentication/session context.

Do not design tables that assume only one user globally.

---

# 24. Auditability

Important financial mutations should be traceable.

Audit examples:

budget approved
debt balance modified
income marked received
obligation marked paid
bank transaction imported
AI budget accepted

AI chat content itself is not a substitute for an audit trail.

---

# 25. Testing architecture

Unit tests:

money
financial engine
debt calculations
recurrence rules
allocation validation

Integration tests:

repositories
transactions
worker jobs
budget persistence
imports

E2E:

daily income
expense
income in transit
recurring payment
debt creation
goal creation
weekly budget planning
AI advice workflow
notification settings

AI Evals:

separate scenario-driven evaluation suite.

---

# 26. Operational requirements

Production must eventually include:

automated PostgreSQL backups
restore documentation
health checks
structured logs
error monitoring
AI usage logging
API rate limits
migration procedure
environment validation

Secrets are supplied using environment variables or secret management.

---

# 27. Architecture decision principle

Optimize for:

correctness
clarity
auditability
safe AI integration
low token consumption
maintainability

Do not optimize prematurely for:

microservices
extreme scale
desktop UI
multiple currencies
distributed infrastructure

A modular monolith is the preferred initial architecture.
