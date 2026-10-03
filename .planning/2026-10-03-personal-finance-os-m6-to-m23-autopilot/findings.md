# Findings & Decisions

## Requirements
- M5 is committed as `c019fc0`; current unfinished work is M6.
- M6 requires one-time/weekly/monthly/custom obligations, HARD/NEGOTIABLE/FLEXIBLE protection, occurrences, paid/overdue states, idempotent generation, future payments in calendar, and preserved HARD classification.
- Existing uncommitted M6 files include schema, migration, domain service, APIs, and unit tests.
- Financial invariants: integer kopecks, date-only due dates, ownership scoping, unique `(obligationId,dueDate)`, PAID immutable, no duplicate generation.

## Research Findings
- Planning files did not exist; initialized selected autonomous plan `2026-10-03-personal-finance-os-m6-to-m23-autopilot`.
- Git worktree contains only M6 changes plus untracked `AGENTS.md`; do not discard them.
- `TASKS.md` still says M5 quality-gate commit pending, which is stale and should be corrected when updating status docs.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
- Keep M6 implementation minimal and reuse existing API/calendar patterns. | Avoid architecture rewrite and unnecessary dependencies. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
-

## M10 Dashboard discovery (2026-10-03)
- Existing financial snapshot correctly excludes IN_TRANSIT from available cash and reports it separately.
- Dashboard needs one deterministic server response combining snapshot, earned/expense period totals, pending/overdue occurrences, active debts, goals, and alerts.
- Period boundaries will be UTC date-only boundaries derived from an explicit `today` (for deterministic tests), with income grouped by `earnedAt` and expenses by `expenseDate`.
- API routes use the existing development user id pattern; no authentication architecture changes in M10.

## M12 Financial simulation (2026-10-03)
- M11 is committed as `e78673f`; the first unfinished milestone is M12.
- The Claude/Opus auditor instructions exist in `.claude/agents/financial-auditor.md`, but this environment offers no callable Claude/Opus integration. Independent audit must remain a pre-production caveat; deterministic adversarial tests are required now.
- Simulation is read-only: DB-backed snapshot and owned entity IDs are authoritative; inputs are validated in integer kopecks; model-provided arithmetic is never trusted.
- Need distinguish cash-spending debt payments from goal reservations to avoid falsely counting savings transfer twice.
