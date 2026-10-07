# Findings

- Existing working-tree edits already start a calendar-first redesign in `src/app/page.tsx`, `src/app/globals.css`, and `src/components/BottomNav.tsx`; preserve intent and correct issues in place.
- Main data flow: `src/app/page.tsx` fetches `/api/dashboard` and `/api/calendar?year=&month=`; API routes call dashboard/calendar domain services with existing contracts.
- Calendar API events expose date, earned/received/expected income, expenses, and scheduled payment status/protection.
- Dashboard financial snapshot already owns available/protected/discretionary/in-transit calculations.
- `src/components/Calendar.tsx` is an older duplicate flow and has no current callers in the inspected entry point; keep untouched unless needed.
- Existing `page.tsx` duplicated calendar helpers and used one shared error state; this could clear dashboard errors during calendar fetches. Helpers are now centralized and errors are local to each fetch.
- Privacy mode is presentation-only and masks current/day amounts without changing API or domain values.
- Mobile CSS now covers tap highlight, overscroll, safe-area bottom navigation, control selection, and 16px form text.
