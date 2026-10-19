# Timetable consolidated actions and sidebar class type

2026-10-19 local preview, existing database unchanged.

- The timetable toolbar's Add Schedule disclosure contains Add Schedule, Add Available Time and Preview Public Timetable, in that order.
- The former separate action/filter row is removed. Availability loading, denied and error messages remain visible when needed. Course-detail availability controls are preserved.
- Class type appears below the mini calendar in the date/resource sidebar; changing Unspecified and restoring All types works.
- Actual browser checks opened all three destinations and cancelled/closed them without writing records. The action menu closes when choosing an action, clicking outside, or pressing Escape; Escape returns focus to the trigger.
- Both English and Chinese labels were checked. At 390px, the menu fits within the viewport (left 78px, right 338px), document width stays 390px and the trigger has no horizontal overflow.
- Existing availability permission checks are preserved; automated coverage verifies management actions are absent for a teacher account.

Validation: the two new regression cases failed before implementation and passed after. The full working-tree suite passed all 1,987 tests (`npm test --prefix sample -- --test-concurrency=4`). Final production build passed. A clean snapshot of the staged changes separately passed nine focused scheduling/settings tests and its production build.
