# Review checkpoint placeholder

This directory stores independent code review reports and responses.

## Structure

After each review checkpoint, two files are created:

1. `{checkpoint}-codex-review.md` or `{checkpoint}-financial-audit.md` — review report
2. `{checkpoint}-response.md` — primary agent's analysis and fix documentation

## Review checkpoints

- **M5:** Database, TypeScript, financial calculations, test coverage
- **M10:** API security, input validation, transactions, idempotency
- **M12:** Financial invariants audit (Opus agent)
- **M17:** Security vulnerabilities, prompt injection, authorization
- **M23:** Production readiness (comprehensive)

## Files in this directory

```
.reviews/
├── m5-codex-review.md
├── m5-response.md
├── m10-codex-review.md
├── m10-response.md
├── m12-financial-audit.md
├── m12-response.md
├── m17-security-review.md
├── m17-response.md
├── m23-production-review.md
└── m23-response.md
```

## Review artifacts are permanent

Review reports are never deleted, even after fixes applied.

They serve as:
- Historical record of issues found and resolved
- Reference for similar issues in future
- Audit trail of architectural decisions
- Evidence of due diligence

## Response format

Each `{checkpoint}-response.md` should contain:

1. Summary of findings
2. Classification: ACCEPT / REJECT / DEFER
3. Fix implementation details
4. Verification steps taken
5. Regression tests added
6. Remaining risks documented

See `ARCHITECTURE_REVIEW_RESPONSE.md` in project root for example format.
