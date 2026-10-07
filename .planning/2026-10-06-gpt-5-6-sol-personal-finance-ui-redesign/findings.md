# Findings & Decisions

## Requirements
- `promtui.md` is a 4,159-line presentation-layer UI specification.

## Research Findings
- `src/app/page.tsx` already contains current-money dashboard, calendar projection, Day View, Quick Add, and local loading/error/offline states.
- `src/app/calendar/page.tsx` and `src/components/Calendar.tsx` contain a second calendar implementation; consolidation must be deliberate and minimal.
- The worktree has user changes in `src/app/page.tsx`, `src/app/globals.css`, and `src/components/BottomNav.tsx`; preserve them.
- `package.json` has React 19, Next 15, Tailwind 3, Vitest, and Playwright, but no icon or animation dependency. CSS/native features are sufficient.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Use `gpt-taste` for anti-slop critique only | Its landing-page/AIDA/GSAP rules conflict with a restrained financial UI. |
| Track open-source references | Record URL, author, license, and verification date; do not copy a full third-party UI. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
-
