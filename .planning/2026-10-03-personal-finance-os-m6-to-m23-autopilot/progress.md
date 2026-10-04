# Progress Log

## Session: 2026-10-04
- Recovered clean M13 HEAD `492de29`; M14 is first unfinished milestone. Restored selected planning files and requirements.
- M14 plan: persist user-scoped conversations/messages and optional structured summary; bound prompt to last ten messages; provide read-only snapshot context and draft-only structured advice; add mobile API/UI, tests, and migration.

### M14 completion
- Added migration 0012 and user-scoped conversation/message/summary persistence.
- Added bounded latest-10 context, current FinancialSnapshot, strict draft-only advice schema, and usage logging.
- Added mobile `/chat`, APIs, ownership/length/invalid-output tests, and navigation coverage.
- Gate: typecheck and lint passed; 91 unit/integration tests passed; production build passed; mobile adviser Playwright passed. Full navigation suite had 7 prior passes plus adviser pass.
- Critical review fixed failed-conversation UI and sanitized API errors; no AI financial writes.
- Local dev DB's legacy migration journal was empty despite existing schema: applied 0012 and reconciled its latest journal entry after verifying required tables; next CLI migrations can proceed.
- Next milestone: M15 weekly budgeting.

### M15 implementation
- Added strict BudgetProposal schema, snapshot-version/ownership/amount validation, deterministic totals, draft generation, and explicit approval through existing planning allocation transactions.
- Added proposal API and planning UI draft display; targeted proposal/chat tests (6 passed), typecheck/lint/build passed.
- Full regression and Playwright rerun remains before final M15 release gate.

### M15 quality gate and review
- Full suite passed: 19 files / 94 tests; typecheck, lint, and production build passed; Playwright passed 8/8.
- Critical review found AI proposal approvals were individually committed and snapshot-only idempotency keys could collide across alternate drafts. Added transactional batch allocations and proposal-specific SHA-256 keys; added regression coverage for atomic rejection and idempotent retry.
- Added explicit approve/reject/edit/discuss actions to planning proposal UI. M15 docs now reflect completed gate; milestone commit pending.
- Note: a parallel typecheck/build invocation temporarily caused missing generated `.next/types`; reran typecheck after build sequentially and it passed. No source issue.
- Next milestone: M16 automatic durable conversation compression and measured context size/token usage.

### M16 implementation
- Existing chat already bounds requests to the latest 10 messages and records provider-reported token usage. Added automatic structured summary generation once the conversation exceeds 20 messages or approximately 15K historical tokens.
- Compression processes only obsolete messages, in batches of at most 10 messages / 20K characters; the most recent 10 remain verbatim context. Summary excludes financial arithmetic and is treated as untrusted preference context.
- Added monotonic summary coverage updates under conversation row lock, provider-usage logging for compression calls, an input-token estimate in chat responses, and integration coverage for long-running conversations.
- Targeted M16 test, typecheck, and lint pass. Full gate and critical hostile review pending.
- Full M16 gate: 19 files / 96 unit-integration tests, typecheck, lint, production build, and 8/8 mobile Playwright tests passed. Targeted final chat suite passed 6 tests after adding prompt-injection/stale-summary and graceful-failure assertions.
- Critical review found no remaining BLOCKER/CRITICAL/HIGH findings. No external LLM API was required; all provider calls in tests are mocked.
- M16 complete; milestone commit pending. Next: M17 AI evaluation suite (40+ realistic adversarial scenarios).

### M17 implementation
- Centralized the existing financial-adviser, proposal, and summary system policies so prompt-contract tests exercise the exact runtime text.
- Added 45 deterministic financial scenarios across all nine required categories (HARD, partial debts, deadlines, insufficient cash, future income, overdue debt, negotiable costs, goals, contradictory priorities), plus safe-integer and policy contract checks.
- Added explicit ownership rejection coverage for foreign proposal entity IDs. AI proposal arithmetic now rejects unsafe integers, not just fractional/negative amounts.
- Targeted suite passed 55 tests. Full gate is running; no external model/API calls are made by evals.
- M17 quality gate passed: 20 files / 145 unit-integration tests, typecheck, lint, production build, and 8/8 Playwright tests. Targeted eval/ownership/provider checks: 55 passed.
- Critical review confirmed model output amounts and available limits are safe integers; future income is never added to free cash; target ownership is checked; policy text changes fail the eval contract tests. No BLOCKER/CRITICAL/HIGH findings remain.
- Live model scoring was not run without an API key; deterministic policy/financial evaluation is complete. M17 commit pending; next milestone M18 notifications.

### M17 documentation recovery
- M17 quality-gate commit confirmed as `8963d28`.

### M18 implementation
- Added migration 0013, notification/push-subscription schema, deterministic candidate scheduling, idempotent persistence, read transitions, claim locking, and strict push endpoint allow-list validation.
- Added ownership-scoped APIs, mobile notifications page, navigation entry, manifest, and service-worker click handling.
- Notification messages remain generic and exclude amounts and sensitive details.
- Quality gate passed: typecheck, lint, 146 unit/integration tests, production build, and 9 Playwright tests. Vitest required the supported `--pool=threads` mode under constrained memory.
- Critical review found no BLOCKER/CRITICAL/HIGH findings: generic payloads prevent sensitive lock-screen leakage, user ownership is enforced, global notification dedupe uses a stable user entity key, and push endpoints are origin allow-listed.
- M18 complete; next milestone M19 transaction import.

### M18 completion
- Committed as `84a4045`.

### M19 start
- Requirements recovery in progress: CSV/manual statement import must normalize, deduplicate, match, and classify transactions deterministically before any optional AI categorization.

### M19 completion
- Added migration 0014 for staging transactions and per-user manual CSV connections; local development migration applied successfully.
- Implemented strict CSV parsing/normalization, safe integer kopecks, deterministic hash fallback IDs, PostgreSQL deduplication, matching existing income/expense entries, sanitized descriptions, deterministic category hints, and explicit confirmation.
- Added mobile import/review UI, APIs, unit/integration tests, and navigation coverage.
- Full quality gate passed: typecheck, lint, 150 unit/integration tests, production build, and 10 Playwright tests.
- Critical review found no BLOCKER/CRITICAL/HIGH findings; imported rows do not affect financial balance until explicit confirmation, and confirmed rows are idempotent under row lock.

### M20 start
- Bank provider architecture will expose a narrow provider interface returning normalized raw transactions; providers remain adapters and cannot write financial records directly.

### M20 completion
- Added migration 0015 and user-scoped AI provider configuration with AES-256-GCM key encryption, validation, enable/disable/delete APIs, OpenAI-compatible structured-output adapter, provider fallback selection, connection test, settings UI, and mobile navigation coverage.
- Added narrow BankProvider/CsvProvider/ManualProvider adapters and kept transaction confirmation as the only financial write path.
- Added process-local 10/minute and 100/hour AI rate limits with explicit M21 shared-storage follow-up.
- Quality gate passed: typecheck, lint, 156 unit/integration tests, production build, and 11 Playwright tests. Critical diff review found no BLOCKER/CRITICAL/HIGH findings.
- M20 is ready for milestone commit; next milestone is M21 security hardening.

### M21 completion
- Added production fail-closed operator authentication (`APP_AUTH_TOKEN`, HttpOnly `fin_session`, `/login`, `/api/auth/login`), same-origin enforcement requiring `APP_URL`, general/import middleware limits, CSP/security headers, and localhost-only PostgreSQL development binding.
- Added production DNS-resolution SSRF revalidation for custom AI provider URLs and recursive sanitization of untrusted AI context before model calls.
- Quality gate passed: typecheck, lint, 160 unit/integration tests, production build, and 11 Playwright tests; `git diff --check` passed.
- Critical review: no BLOCKER/CRITICAL/HIGH findings. Distributed limiter storage and append-only audit-log wiring are explicit M22/M23 deployment follow-ups.
- M21 is ready for milestone commit; next milestone is M22 reliability.

### M22 completion
- Added migration 0016 `job_runs`, generic start/complete/fail/monitored-job helpers, and redacted structured JSON logging.
- Replaced static health response with a DB readiness check returning healthy/degraded status without connection details.
- Added encrypted custom-format `pg_dump` backup, explicit restore, and non-mutating archive verification scripts; shell syntax and an actual local encrypted archive verification passed.
- Quality gate passed: typecheck, lint, 163 unit/integration tests, production build, 11 Playwright tests in a single worker, and `git diff --check`.
- Critical review found no BLOCKER/CRITICAL/HIGH findings. pg-boss worker composition remains M23 scope.
- M22 is ready for milestone commit; next milestone is M23 production deployment.

## Session: 2026-10-03

### Current Status
- **Phase:** 1 - Requirements & Discovery
- **Started:** 2026-10-03

### Actions Taken
- Restored repository: HEAD is M5 quality-gate commit lineage; M6 code is uncommitted.
- Initialized autonomous planning files and recorded M6 recovery scope.
- Added calendar aggregation and mobile display for scheduled payment occurrences.
- Added DB checks for positive obligation/occurrence amounts, valid obligation date ranges, and paid timestamps.
- Added overdue transition regression coverage.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `git diff --check` | no whitespace errors | pending after implementation | pending |
| `npm run typecheck` | pass | pass | complete |
| `npm run lint` | pass | pass | complete |
| `npm test -- --runInBand` | pass | Vitest CLI rejected unsupported flag | failed; corrected approach |
| `npm test` | pass | 7 files, 54 tests passed with local PostgreSQL | complete |
| `npm run build` | pass | production build completed | complete |
| `npm run test:e2e` (overlapped) | pass | 2 passed, navigation test hit connection refusal | failed due to concurrent invocation |
| `npm run test:e2e` (single run) | pass | 3 passed | complete |
| M6 targeted tests | pass | 9 passed | complete |
| final typecheck/lint/diff check | pass | pass | complete |

### M6 completion
- M6 committed as `460a57b`.
- Planning files and user-provided `AGENTS.md` remain untracked intentionally.
- Next milestone is M7 debts.

### M7 completion
- Implemented debt/debt-payment schema, APIs, domain transaction, idempotency, and mobile flow.
- Added five debt tests covering partial payment, audit arithmetic, overpayment, catch-up, and concurrent version protection.
- Full suite: 8 files / 60 tests; E2E: 4 mobile tests; build/typecheck/lint passed.
- Next milestone is M8 goals.

### M8 completion
- Implemented goal/goal-contribution schema, transactional domain service, APIs, and mobile flow.
- Added target overflow, ownership, achievement, and concurrent update tests.
- Full suite: 9 files / 63 tests; E2E: 5 mobile tests; build/typecheck/lint passed.
- Next milestone is M9 protected envelopes.

### M9 implementation note
- Initial envelope test exposed an incorrect expectation, not a financial-engine defect: IN_TRANSIT is reported separately as 50,000 and excluded from available cash.

### Errors
| Error | Resolution |
|-------|------------|

### M10 implementation start
- Re-read active plan and project docs; confirmed dashboard is the first unfinished milestone.
- Chosen minimal scope: deterministic dashboard service/API plus mobile dashboard UI and regression/E2E coverage.

### M10 completion
- Implemented `dashboardService`, `/api/dashboard`, and mobile dashboard cards/lists.
- Added deterministic date-boundary, transit-income, payments, debts, goals, and alert coverage.
- Quality gate passed: typecheck, lint, 66 unit tests, production build, 6 Playwright tests.
- Critical review found no BLOCKER/CRITICAL/HIGH issues; independent Opus financial audit remains recommended before production release.
- Updated `TASKS.md` and `CURRENT_STATE.md`; ready for M11.

### M11 completion
- Added planning cycle/allocation schema and migration 0010.
- Implemented deterministic cycle snapshots, expected income, obligation reservation, target ownership, idempotency, and row-locked allocation writes.
- Added `/planning` UI, planning APIs, and regression/E2E coverage.
- Quality gate passed: typecheck, lint, 71 unit tests, production build, 7 Playwright tests.
- Critical review fixed opening-balance misuse and obligation double counting; no remaining BLOCKER/CRITICAL/HIGH findings.
- Independent Opus financial audit remains recommended before production release.

### M12 implementation start
- Recovered M11 commit and clean code tree (only user `AGENTS.md` and planning control files remain untracked).
- Read architecture and available financial-auditor instructions; no callable Claude/Opus integration found.
- Plan: pure typed simulation with DB-backed user-scoped input, adversarial/property-style tests, full quality gate, then specialized financial audit.

### M12 completion
- Implemented read-only deterministic simulation API/service for debt, goal, and negotiable-obligation scenarios.
- Added safe integer validation, ownership-scoped snapshot loading, no-write integration coverage, and 80-test full suite.
- Specialized audit found and fixed concurrent envelope-funding oversubscription by serializing user-level mutations; added regression coverage.
- Final gate passed: lint, typecheck, 80 tests, build, and 7 Playwright tests.
- No BLOCKER/CRITICAL/HIGH findings remain. External Claude/Opus audit is unavailable in this environment and remains recommended before production release.

### M23 completion
- Added non-root multi-stage Dockerfile, `.dockerignore`, production env template, Caddy TLS reverse proxy, and Compose services for PostgreSQL, one-shot migrations, web, worker, and Caddy with internal network isolation and health-gated startup.
- Added worker heartbeat/shutdown smoke and authenticated `scripts/production-smoke.sh`; Docker build initially exposed a missing build-time `DATABASE_URL`, fixed with a build-only dummy value. Runtime secrets remain Compose-provided.
- `docker compose config`, Docker image build, worker container smoke, typecheck, lint, production build, 163 tests, 11 single-worker Playwright tests, backup verification, and shell syntax checks passed.
- Critical review found no BLOCKER/CRITICAL/HIGH architecture findings. Remaining release caveat: two nested PostCSS advisories require a planned breaking Next.js 16 upgrade before public production release; no real VPS or production secrets were touched.

### Final production gate
- M23 is complete in the local repository. No production VPS or real secrets were accessed, and no `git push` was performed.
- Deterministic financial, AI safety, security, database, migration, backup verification, Docker, Compose, Caddy, worker, build, unit/integration, and Playwright checks passed.
- Independent Claude/Opus financial audit integration is unavailable in this environment; deterministic adversarial coverage passed, and independent audit remains recommended before release.
- Release blockers/caveats: public deployment must resolve the two nested PostCSS advisories through a reviewed Next.js 16 migration, replace process-local rate limiting with shared storage, and connect the worker to a real idempotent pg-boss job queue before multi-instance operation.
