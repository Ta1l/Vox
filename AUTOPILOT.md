# AUTOPILOT.md

Last updated: 2026-10-03

---

## Overview

AUTOPILOT — это автономный workflow для разработки Personal Finance OS от M1 до M23.

После завершения M0 основной implementation agent (Claude Sonnet 5.5) должен:

1. Читать `TASKS.md`;
2. Определять первый незавершённый milestone;
3. Реализовывать его полностью;
4. Запускать проверки (typecheck, lint, tests, Playwright);
5. Обновлять документацию;
6. Создавать git commit;
7. Автоматически переходить к следующему milestone.

Agent НЕ должен ждать explicit user message между milestones.

---

## Execution model

### Primary implementation agent

**Model:** Claude Sonnet 5.5

**Role:** Implementation orchestrator

**Responsibilities:**
- Read `TASKS.md` to identify current milestone
- Implement milestone according to specifications in `CLAUDE.md`, `PRODUCT.md`, `DOMAIN_RULES.md`, `DATABASE.md`
- Use Context7 for framework/library documentation
- Use Playwright for UI validation
- Run verification (typecheck, lint, tests)
- Fix errors autonomously
- Update `CURRENT_STATE.md` and `TASKS.md`
- Create git commit when milestone complete
- Proceed to next milestone automatically

**Does NOT require user approval for:**
- Implementation decisions within documented architecture
- Bug fixes
- Test additions
- Refactoring that preserves behavior
- Framework/library selection when consistent with existing stack

**MUST stop and ask user for:**
- Architectural BLOCKER that cannot be safely resolved from documentation
- Production secrets
- Destructive production actions
- Changes to user requirements
- Actions outside project directory

---

## Review checkpoints

### M5: First implementation checkpoint

**Trigger:** After M5 complete

**Reviewer:** Codex (independent static analyzer)

**Prompt:** `.claude/review-prompts/m5-checkpoint.txt`

**Focus:**
- Database migration correctness
- TypeScript type safety
- Financial calculation accuracy
- Test coverage for core domain logic

**Script:** `./scripts/run-codex-review.sh m5 .claude/review-prompts/m5-checkpoint.txt`

**Output:** `.reviews/m5-codex-review.md`

---

### M10: Mid-implementation checkpoint

**Trigger:** After M10 complete

**Reviewer:** Codex

**Prompt:** `.claude/review-prompts/m10-checkpoint.txt`

**Focus:**
- API endpoint security
- Input validation completeness
- Transaction isolation correctness
- Background job idempotency

**Script:** `./scripts/run-codex-review.sh m10 .claude/review-prompts/m10-checkpoint.txt`

**Output:** `.reviews/m10-codex-review.md`

---

### M12: Financial invariants audit

**Trigger:** After M12 complete

**Reviewer:** Claude Opus 5 (financial-auditor subagent)

**Agent:** `.claude/agents/financial-auditor.md`

**Focus:**
- Money arithmetic correctness
- HARD protection enforcement
- Debt payment audit trail
- Income lifecycle state machine
- Allocation invariants
- Recurrence generation idempotency

**Invocation:**
```bash
# Agent spawned by primary Sonnet automatically
claude agent .claude/agents/financial-auditor.md
```

**Output:** `.reviews/m12-financial-audit.md`

---

### M17: Security & hostile AI review

**Trigger:** After M17 complete

**Reviewer:** Codex (adversarial mode)

**Prompt:** `.claude/review-prompts/m17-security.txt`

**Focus:**
- Prompt injection vulnerabilities
- Authentication bypass attempts
- SQL injection vectors
- XSS/CSRF protections
- Rate limiting effectiveness
- Audit trail tampering

**Script:** `./scripts/run-codex-review.sh m17 .claude/review-prompts/m17-security.txt`

**Output:** `.reviews/m17-security-review.md`

---

### M23: Production readiness review

**Trigger:** After M23 complete

**Reviewer:** Codex (comprehensive)

**Prompt:** `.claude/review-prompts/m23-production.txt`

**Focus:**
- All previous checkpoint areas
- Performance characteristics
- Error handling completeness
- Monitoring readiness
- Deployment checklist
- Backup/restore procedures

**Script:** `./scripts/run-codex-review.sh m23 .claude/review-prompts/m23-production.txt`

**Output:** `.reviews/m23-production-review.md`

---

## Review processing workflow

After each review checkpoint, primary Sonnet MUST:

1. **Read review report** from `.reviews/`
2. **Analyze each finding independently:**
   - Verify finding is real (not false positive)
   - Assess severity (BLOCKER/CRITICAL/HIGH/MEDIUM/LOW)
   - Determine action: ACCEPT / REJECT / DEFER
3. **Fix verified issues:**
   - BLOCKER: Must fix before proceeding
   - CRITICAL: Must fix before proceeding
   - HIGH: Must fix before proceeding
   - MEDIUM: Fix or document reason to defer
   - LOW: Can defer to future milestone
4. **Add regression tests** for fixed issues
5. **Run verification** (typecheck, lint, tests)
6. **Document decisions** in review response file
7. **Save review artifacts** to `.reviews/`
8. **Continue to next milestone**

**CRITICAL:** Review checkpoints are MANDATORY, not optional.

If external reviewer (Codex) is unavailable:
- Attempt retry (up to 3 times with exponential backoff)
- Check if `codex` executable exists
- Check if review prompt file exists
- If still failing: STOP and report to user
- Do NOT silently skip checkpoint

---

## Git workflow

### Commit strategy

After each successfully completed milestone:

1. Run final verification
2. Check `git status`
3. Stage relevant files
4. Create commit with conventional format

**Commit format:**

```
feat(m1): initialize repository foundation

- Next.js 15 with App Router
- PostgreSQL + Drizzle ORM
- Docker Compose dev environment
- Tailwind CSS + shadcn/ui
- Vitest + Playwright setup

Definition of Done:
✓ Application starts successfully
✓ Database migrations run
✓ Health endpoint responds
✓ Mobile viewport renders correctly
```

**Commit prefix conventions:**
- `feat(m1)`, `feat(m2)`, etc. — feature implementation
- `fix(m5)` — bug fix discovered during milestone
- `test(m7)` — test additions
- `refactor(m10)` — code refactoring
- `docs(m15)` — documentation updates

### When NOT to commit

Do NOT create commit if:
- Tests are failing
- Typecheck fails
- Lint fails (unless explicitly documented as deferred)
- Definition of Done not met
- Review checkpoint BLOCKER not resolved

### Push policy

**NEVER push to remote automatically.**

User will push manually after reviewing commit history.

---

## Definition of Done

Each milestone is complete ONLY when:

1. **Implementation exists** — all specified features working
2. **Types correct** — TypeScript strict mode passes
3. **Validation exists** — Input validation with Zod at boundaries
4. **Domain invariants preserved** — Financial rules enforced
5. **Tests pass** — Unit, integration, and relevant E2E tests green
6. **UI validated** (if applicable) — Playwright exercises flow in mobile viewport
7. **Documentation updated** — `CURRENT_STATE.md` and `TASKS.md` reflect reality
8. **Lint passes** — No errors, warnings documented or fixed
9. **Build succeeds** — Production build completes without errors

**Compilation alone is NOT Definition of Done.**

---

## Error recovery

### Test failures

If tests fail after implementation:

1. Read test output carefully
2. Identify root cause (not just symptom)
3. Fix implementation or test (whichever is wrong)
4. Re-run tests
5. If still failing after 3 attempts: analyze pattern
6. If cannot resolve: STOP and report (don't proceed with broken tests)

### Playwright failures

If UI test fails:

1. Start application
2. Open Playwright in headed mode
3. Observe actual behavior
4. Compare with expected behavior from spec
5. Fix implementation or test
6. Re-run in mobile viewport (390×844)

### Database migration failures

If migration fails:

1. Check migration SQL syntax
2. Verify foreign key references exist
3. Check constraint definitions
4. Test migration on clean database
5. If data migration: verify data exists
6. Rollback and fix migration before proceeding

### TypeScript errors

If typecheck fails:

1. Read error messages (all of them)
2. Fix from most fundamental to derived errors
3. Do NOT use `any` or `@ts-ignore` without documented reason
4. Re-run typecheck
5. Only proceed when clean

---

## Context7 usage

Use Context7 MCP for current documentation:

- Next.js (App Router, Server Actions, Metadata API)
- React (hooks, Suspense, Server Components)
- Drizzle (schema definition, migrations, queries, transactions)
- OpenAI SDK (structured outputs, streaming)
- Anthropic SDK (tool use, structured outputs)
- Playwright (mobile testing, network interception)
- shadcn/ui (component API, theming)
- pg-boss (job scheduling, idempotency)
- Web Push (subscription, notification format)

Always verify API syntax with Context7 rather than assuming from training data.

---

## Playwright usage

For significant UI changes:

1. Start application (`npm run dev`)
2. Launch Playwright MCP
3. Set viewport to 390×844 (primary mobile target)
4. Navigate to changed screen
5. Exercise user flow
6. Verify behavior matches spec
7. Check at secondary viewports (360×800, 430×932)
8. Take screenshot if visual regression suspected
9. Fix issues found
10. Re-test

Do NOT consider UI feature complete only because it compiles.

---

## Autonomous decision-making

Agent SHOULD make autonomous decisions for:

### ✅ Safe autonomous decisions

- File structure within `src/`, `app/`, `lib/`, `components/`
- Component naming (as long as consistent with existing patterns)
- Utility function organization
- Test file location
- Import statement order
- Variable naming
- Code formatting
- Error message wording (non-user-facing)
- Log statement content
- Comment placement
- Refactoring that preserves behavior
- Adding tests
- Fixing bugs discovered during implementation
- Library version selection within documented stack

### ❌ Requires user approval

- Changing architecture documented in `ARCHITECTURE.md`
- Violating invariants in `DOMAIN_RULES.md`
- Changing database schema outside documented plan
- Adding new external dependencies not in documented stack
- Changing financial calculation logic in ways that affect correctness
- Modifying HARD/NEGOTIABLE/FLEXIBLE protection semantics
- Changing AI integration boundaries
- Skipping security controls
- Deploying to production
- Accessing production database
- Rotating production secrets
- Deleting user data
- Actions outside `/path/to/project/`

**When in doubt about decision authority: make the decision, document reasoning, and proceed.**

Asking user for every small decision breaks AUTOPILOT goal.

---

## Stopping conditions

AUTOPILOT MUST stop and report to user if:

### Blockers

- **Architectural contradiction:** Documentation contains conflicting requirements that cannot be resolved from context
- **Missing requirement:** Critical behavior not specified in any document and cannot be reasonably inferred
- **External dependency failure:** Required service (database, AI provider) unreachable and cannot be worked around

### Safety

- **Production secret required:** Real API key, production database password, etc.
- **Destructive action required:** Delete production data, drop production table, rotate production credentials
- **Security boundary violation:** Action would bypass documented security controls

### Technical

- **Tests fail persistently:** After 5 fix attempts, tests still red and root cause unclear
- **Review checkpoint unavailable:** Codex/financial-auditor cannot be invoked after reasonable retry
- **Model/API quota exhausted:** Cannot continue implementation without access
- **File system boundary:** Required action outside `/path/to/project/`

### Normal milestone completion is NOT a stopping condition

Agent should proceed to next milestone automatically after commit.

---

## Milestone transition

After completing milestone N:

1. Verify Definition of Done met
2. Run final checks (typecheck, lint, tests)
3. Create git commit
4. Update `CURRENT_STATE.md` (milestone N complete, N+1 current)
5. Update `TASKS.md` (mark N complete, ensure N+1 has clear spec)
6. Check if review checkpoint (M5, M10, M12, M17, M23)
7. If checkpoint: run review, process findings, fix blockers
8. Continue to milestone N+1 **without waiting for user message**

**Transition should be seamless and autonomous.**

---

## Usage

### Starting AUTOPILOT

User initiates AUTOPILOT after M0 complete:

```
# In conversation with Claude Sonnet 5.5
Continue with AUTOPILOT workflow. Start with first incomplete milestone in TASKS.md.
```

Agent will:
1. Read `TASKS.md`
2. Identify first milestone with status `TODO` or `IN PROGRESS`
3. Begin implementation
4. Proceed through all milestones autonomously

### Monitoring progress

User can check progress at any time:

```
# Files to check
cat CURRENT_STATE.md       # Current milestone and status
cat TASKS.md               # All milestones progress
git log --oneline          # Completed milestones (commits)
ls .reviews/               # Review reports
```

### Interrupting AUTOPILOT

If user needs to intervene:

```
STOP. Wait for my review before continuing.
```

Agent will complete current atomic operation (test run, file write) and stop.

### Resuming AUTOPILOT

After user review:

```
Continue with AUTOPILOT workflow.
```

Agent resumes from where it stopped.

---

## Review checkpoint scripts

### Codex review script

`scripts/run-codex-review.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

checkpoint_name="$1"
prompt_file="$2"

if [[ ! -f "$prompt_file" ]]; then
  echo "ERROR: Prompt file not found: $prompt_file"
  exit 1
fi

if ! command -v codex &> /dev/null; then
  echo "ERROR: codex executable not found. Install Codex or configure PATH."
  exit 1
fi

output_file=".reviews/${checkpoint_name}-codex-review.md"

echo "Running Codex review for checkpoint: $checkpoint_name"
echo "Prompt: $prompt_file"
echo "Output: $output_file"

# Run Codex in read-only mode (no --full-auto)
codex exec --prompt-file "$prompt_file" --output-file "$output_file" || {
  echo "ERROR: Codex review failed with exit code $?"
  exit 1
}

if [[ ! -s "$output_file" ]]; then
  echo "ERROR: Codex review produced empty output"
  exit 1
fi

echo "Codex review complete. Report saved to $output_file"
```

**Error handling:**
- Checks prompt file exists
- Checks `codex` executable available
- Captures non-zero exit code
- Checks output file non-empty
- All errors are fatal (exit 1)

### Financial auditor invocation

Primary Sonnet spawns financial-auditor subagent:

```typescript
// In implementation code (pseudo-code for agent workflow)
const auditReport = await spawnAgent({
  agentFile: '.claude/agents/financial-auditor.md',
  context: {
    milestone: 'M12',
    focus: ['Money', 'Debts', 'Goals', 'Obligations', 'Financial Engine'],
  },
});

// Agent returns structured report
const findings = auditReport.findings; // Array of audit findings
const blockers = findings.filter(f => f.severity === 'BLOCKER');

if (blockers.length > 0) {
  // Fix blockers before proceeding
  for (const blocker of blockers) {
    await fixFinancialIssue(blocker);
  }
  
  // Re-run audit to verify fixes
  const reaudit = await spawnAgent({...});
}
```

---

## Quality gates

### Before proceeding to next milestone

- [ ] All tests pass (unit + integration + E2E where applicable)
- [ ] TypeScript strict mode passes
- [ ] ESLint passes (or documented exceptions)
- [ ] Definition of Done checklist complete
- [ ] Documentation updated
- [ ] Git commit created
- [ ] Review checkpoint passed (if applicable)

### Before creating commit

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean or documented
- [ ] `npm run test` — all pass
- [ ] `npm run build` — succeeds
- [ ] Playwright tests pass (if UI changes)
- [ ] `CURRENT_STATE.md` updated
- [ ] `TASKS.md` updated

### Review checkpoint quality gate

- [ ] Review report exists in `.reviews/`
- [ ] All BLOCKER findings fixed
- [ ] All CRITICAL findings fixed or documented defer reason
- [ ] All HIGH findings fixed or documented defer reason
- [ ] Regression tests added for fixed issues
- [ ] Re-verification passed after fixes

---

## File structure

```
/path/to/project/
├── .claude/
│   ├── agents/
│   │   └── financial-auditor.md       # Opus financial audit subagent
│   └── review-prompts/
│       ├── m5-checkpoint.txt          # M5 Codex review prompt
│       ├── m10-checkpoint.txt         # M10 Codex review prompt
│       ├── m12-financial-audit.txt    # M12 audit focus (if needed)
│       ├── m17-security.txt           # M17 security review prompt
│       └── m23-production.txt         # M23 production readiness prompt
├── .reviews/
│   ├── m5-codex-review.md
│   ├── m5-response.md
│   ├── m10-codex-review.md
│   ├── m10-response.md
│   ├── m12-financial-audit.md
│   ├── m12-response.md
│   ├── m17-security-review.md
│   ├── m17-response.md
│   ├── m23-production-review.md
│   └── m23-response.md
├── scripts/
│   └── run-codex-review.sh            # Codex review runner
├── AUTOPILOT.md                        # This file
├── CLAUDE.md                           # Project instructions (updated)
├── TASKS.md                            # Milestone tracking (updated)
├── CURRENT_STATE.md                    # Current status
└── ...
```

---

## Success criteria

AUTOPILOT is successful if:

1. Agent proceeds through M1→M23 autonomously
2. Review checkpoints executed and findings addressed
3. Each milestone passes Definition of Done before commit
4. Agent stops only at documented stopping conditions
5. Agent does NOT ask user for normal implementation decisions
6. Git history shows clean milestone-by-milestone progression
7. Final application passes M23 production readiness review

---

## Limitations

AUTOPILOT does NOT:

- Deploy to production
- Access production database
- Rotate production secrets
- Make product requirement changes
- Override documented architecture
- Skip mandatory review checkpoints
- Proceed with persistently failing tests
- Create pull requests or push to remote

These remain manual user actions.

---

## Maintenance

This AUTOPILOT workflow is designed for M1→M23 implementation phase.

After M23 complete:

- AUTOPILOT workflow ends
- Agent returns to interactive mode
- Further development requires user direction per task

---

Last updated: 2026-10-03
