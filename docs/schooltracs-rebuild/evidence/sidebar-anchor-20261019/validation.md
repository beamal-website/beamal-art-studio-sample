# Keep the sidebar bottom aligned when display status changes

2026-10-19 local timetable preview; no database changes. Existing hidden unassigned-teacher preference was restored after browser verification.

Before the fix, the resource sidebar was scrolled to its bottom at scrollTop/max 174px. Hiding a resource inserted the status block and increased the maximum to 250px, but scrollTop stayed 174px. Advanced filters moved from y=903 to y=979 and left the visible area.

The display redraw now recognizes a sidebar within 2px of its scrollable bottom and restores it to the new bottom after the content changes. Otherwise it preserves the existing absolute scroll position. The portal content and timetable grid retain their own independent scroll positions.

After the fix:
- Before status: sidebar scrollTop/max 174/174px; Advanced filters y=903.
- Status inserted: sidebar scrollTop/max 250/250px; Advanced filters remains y=903.
- Status removed: sidebar scrollTop/max 174/174px; Advanced filters remains y=903.

Two regression cases cover status growth/removal, independent grid positions and a sidebar that is not at the bottom. The bottom-growth case failed before implementation; both pass after implementation.

`bottom-pinned.png` shows the status block present while Class type and Advanced filters remain visible at the bottom.

Validation: both new regression tests pass. An isolated snapshot of the staged change passed four focused Display/scroll tests and its production build; the final working-tree production build also passed.

Final full working-tree verification: `npm test --prefix sample -- --test-concurrency=4` passed all 1,994 tests with zero failures (248 seconds).
