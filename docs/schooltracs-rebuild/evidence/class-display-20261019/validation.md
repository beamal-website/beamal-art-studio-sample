# Fixed Display heading with a course visibility group

2026-10-19 local admin preview, existing database unchanged. Temporary course visibility toggles were restored after verification.

Display is a permanent heading rather than a disclosure. Room, Teacher and Class type remain independently collapsible; a new Class group follows Class type and lists active courses from the same live catalogue source. New courses are included even when they have no lessons yet; deleted courses are omitted. The Class group uses the existing transparent visibility-eye treatment and has its own retained disclosure state.

Course visibility uses stable course IDs, independently of Class type, rooms and teachers. Hidden course IDs are saved in the account's existing local filter preference, included in status/count/clear behavior and respected by the shared timetable matching function for scheduled lessons and availability items. Empty/new preference fields retain the existing default state shape. Opening a specific course's timetable clears hidden-course restrictions for that navigation, while the existing return preferences retain their earlier state.

Browser verification:
- Display is a SECTION with an H2, with no summary or collapse control.
- Class lists all six existing active courses.
- Hiding 創意繪畫 changes its visible lesson count from 1 to 0; restoring it returns the count to 1. Class type remains unchanged and the other groups retain their collapsed state.
- Keyboard Enter collapses and expands Class.
- English and Chinese labels checked. At 390px, document width remains 390px; Display remains visible when Class is collapsed.

Regression checks cover additive preference normalization, stable course-ID matching, new/deleted courses, rename behavior, saved local preference, clear behavior, class-type independence and fixed Display/group disclosure behavior. All three changed/new cases failed before implementation and passed after. The isolated staged snapshot passes all 22 filter-model tests and five focused flow regressions. Working-tree production build passed.

`class-en.png` shows the fixed Display heading and the new Class list, with Room and Teacher collapsed to keep the whole set visible.

The full current-working-tree run reported 1,882 passes and 115 failures out of 1,997. The failures began after a separate, unstaged sidebar click-wave listener replaced the click handler in the lightweight flow-test DOM harness and accessed its absent querySelectorAll; this listener is not part of the staged change. A full test run of the isolated staged snapshot is used to validate the exact submitted code independently of that concurrent work.

Final isolated full verification: `npm test --prefix <staged-snapshot>/sample -- --test-concurrency=4` passed all 1,958 tests with zero failures (211 seconds). The isolated staged production build also passed.
