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
| Vitest target paths under `src/lib` returned no test files | Tests live under `tests/unit`; rerun with `tests/unit/ai/...` paths. |
| Batch-allocation regression initially expected 80,000 to exceed the 100,000 cycle balance | The test was wrong; raised the over-limit case to 120,000. |
| Typecheck raced with production build while both regenerated `.next/types` | Run typecheck/build sequentially; no source defect. |
| First M16 patch context assumed a different declaration order than source | Re-read current conversation schema and applied the focused patch against actual structure. |

## M16 conversation compression
- Existing `buildConversationContext` already sends only the latest 10 messages and includes a validated optional summary; actual provider usage is logged by `requestValidatedAI`.
- Auto-compression triggers at 20 stored messages or an approximate 15K historical token threshold (characters / 4), summarizes only the prefix older than the latest 10, and caps each request to 10 messages / 20K characters.
- Summary coverage is a message-prefix count; writes lock the owned conversation and reject stale/lower-coverage updates. Current financial facts and arithmetic remain excluded from conversational summaries.

## M17 AI evaluations
- Initial competing-deadline fixture said only 59,999 kopecks remained while defining 60,000; the eval correctly exposed the fixture arithmetic error. Corrected protected funds to 20,001 so the expected boundary matches.
- Foreign-target regression initially used a UUID with a zero version nibble, which Zod correctly rejects before ownership lookup; changed it to a valid v4-format UUID to exercise the actual foreign-entity check.

## Resources
-

## M19 transaction import
- Existing financial records use positive integer kopecks; imported bank rows preserve signed direction in staging and only create positive income/expense records after explicit confirmation.
- Manual CSV imports use a per-user `manual-csv` bank connection so `(connectionId, externalId)` deduplication is enforced by PostgreSQL; rows without an external ID receive a deterministic SHA-256 fingerprint.
- Imported descriptions are bounded and strip HTML-like delimiters before storage. No AI classification is invoked; deterministic keyword mapping supplies category hints and uncertain rows remain REVIEW.
- Confirmation is the only import path that creates income/expense records; matching existing records avoids duplicate financial entries.

## GitHub connectivity check (2026-10-04)
- Local repository has no `origin` remote configured; `git remote -v` is empty, so commits cannot appear on GitHub automatically.
- `https://github.com/Ta1l/Vox` is reachable and public, but its API reports `default_branch: main`, `size: 0`, and no branches/commits. It is currently an empty repository and does not contain the local Personal Finance OS history.
- Local HEAD is `a2ced44` (`feat(m19): implement transaction import`); M20 BankProvider changes are currently uncommitted. No push was performed.

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

## M20 user-configurable AI provider (2026-10-04)
- Migration 0015 adds one encrypted-key provider configuration per user. The custom adapter calls `POST {baseUrl}/v1/responses` with strict JSON-schema output and feeds responses through the existing validator and usage logger.
- Provider selection is custom enabled config, then system `OPENAI_API_KEY`, then a safe no-provider error. Chat, budget proposals, and connection tests use the same boundary.
- Base URL validation requires HTTPS, rejects credentials/query/fragment/non-443 ports, and blocks literal private hosts in production. DNS-aware SSRF protection remains a M21 hardening item.
- The AI limiter enforces 10 requests/minute and 100/hour per user in-process; shared/distributed storage is required before multi-instance production deployment.
- Quality gate passed with 26 files/156 unit-integration tests and 11 Playwright tests, plus typecheck, lint, build, and `git diff --check`. No BLOCKER/CRITICAL/HIGH findings remain.

## M21 security hardening (2026-10-04)
- The previous repository had no middleware/auth boundary: every API route used the fixed development user and Docker published PostgreSQL on all interfaces. M21 adds a production-only fail-closed `APP_AUTH_TOKEN` session cookie, login/logout endpoint, same-origin checks, security headers/CSP, general/import request limits, and localhost-only database binding.
- Custom provider URLs are revalidated immediately before requests. In production, DNS results are checked and private/loopback/link-local/mapped addresses are rejected to reduce DNS-rebinding SSRF risk.
- User messages, summaries, financial labels, and imported external descriptions are treated as untrusted AI context and sanitized before model prompts; structured validation remains mandatory.
- The V1 limiter remains process-local because no shared cache is present. Distributed enforcement and append-only audit-log wiring are production follow-ups; these are documented rather than hidden.
- M21 gate classification: BLOCKER 0, CRITICAL 0, HIGH 0, MEDIUM 2 (shared limiter and audit-log persistence before multi-instance/public deployment), LOW 0. Local single-user development remains safe and deterministic; M22/M23 must close the MEDIUM deployment items before production release.

## M22 reliability start (2026-10-04)
- The repository had only a static health response, no structured logger, no worker/job-run persistence, and no backup scripts. PostgreSQL is available through the existing `DATABASE_URL`; pg-boss is documented but not yet installed or used by current milestones.
- M22 will add encrypted `pg_dump`/restore/verification scripts, a database-backed `job_runs` monitor usable by future workers, structured redacted logging, and a readiness health check that reports database status without leaking connection details.

## M22 reliability completion (2026-10-04)
- Migration 0016 is applied locally and records generic job attempts without coupling domain services to a queue vendor. Failed job messages are capped and redacted.
- Backup verification was exercised against the live local development database using a temporary encrypted archive; `pg_restore --list` succeeded and the script removed its temporary plaintext dump.
- The first parallel E2E run had one calendar navigation timeout marked flaky; a single-worker rerun passed all 11 tests. No source regression was reproduced.

## M14 recovery (2026-10-04)
- HEAD `492de29` completes M13; no tracked changes. User `AGENTS.md` and planning controls are untracked and must be preserved.
- M14 requires stored mobile adviser conversation, current deterministic snapshot, structured summary plus bounded last-10 window, and draft-only answers. M16 owns generation/compression of durable summaries.
- OpenAI Responses structured JSON schema message input confirmed via current Context7 API documentation; no external API key for local tests.
