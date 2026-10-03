# Task Plan: Personal Finance OS M6–M23 Autopilot

## Goal
Complete the remaining milestones from the recovered M6 implementation through M23, with tests, quality gates, documentation, and one commit per milestone.

## Next Step
Read M14 AI adviser/chat requirements and implement bounded server-side conversation context with draft-only AI responses.

## Current Phase
Phase 4 — M14 AI adviser/chat

## Phases

### Phase 1: M6 requirements & recovery
- [x] Restore planning state and repository status
- [x] Identify M6 implementation already present
- [x] Record constraints and acceptance criteria
- **Status:** complete

### Phase 2: M6 implementation
- [x] Finish obligations domain/API/calendar flow
- [x] Add regression and integration/E2E coverage
- **Status:** complete

### Phase 3: M6 quality gate and commit
- [x] Run typecheck, lint, unit/integration, build, Playwright
- [x] Critical diff review; fix BLOCKER/CRITICAL/HIGH
- [x] Update project status docs and commit M6 (`460a57b`)
- **Status:** complete

### Phase 4: M7–M23 autonomous milestones
- [x] Implement M7 debt model and payment flow
- [x] Implement M8 goals and contributions
- [x] Implement M9 protected envelopes and financial snapshot
- [x] Implement M10 deterministic mobile dashboard
- [x] Implement M11 planning cycles and allocations
- [x] Implement M12 deterministic financial simulation and financial audit
- [x] Implement M13 AI infrastructure with structured output and usage logging
- [ ] Implement each remaining unfinished milestone in TASKS.md
- [ ] Apply M10/M12/M17/M23 quality gates
- [ ] Commit every completed milestone separately
- **Status:** in_progress

### Phase 5: Final production gate
- [ ] Run full production/security/financial verification
- [ ] Record any required independent audit caveat
- **Status:** pending

## Decisions Made
| Decision | Rationale |
| Continue existing M6 code | Recovery shows M6 is partially implemented and must not be restarted. |
| Use deterministic DB/domain validation | Financial truth remains PostgreSQL + Financial Engine; AI is not involved in M6. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Vitest rejected unsupported `--runInBand` option | Use the repository's `npm test` command without Jest-only flags. |
| Playwright run overlapped with a second invocation and one server was refused | Terminate overlapping run and execute a single E2E invocation. |
| M9 test expected IN_TRANSIT total to be zero | Corrected regression expectation to 50,000 while keeping available cash at 100,000. |
| M10 E2E initially could not find the legacy `Баланс` heading | Restored the heading in the loading shell while keeping the live dashboard cards. |
| M10 targeted dashboard test expected only same-week dates | Monday-based week correctly includes 30 September; updated expected weekly expense total. |
