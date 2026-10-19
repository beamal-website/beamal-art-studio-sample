# Compact default Display filters

2026-10-19, local existing admin workspace and database. No records created or removed.

The sidebar now shows Display, then Room, Teacher and Class type in one continuous column, followed by Advanced filters. Room/Teacher tabs, resource search and selection-count/select-all rows are removed. The hide-empty-days option lives inside Advanced filters. Resource checkboxes and visibility eyes retain their distinct existing behavior. Unassigned entries remain available for finding lessons that lack an assignment.

Both resource groups use their own resource kind rather than whichever old tab was selected. This also prevents teacher IDs being mistaken for room IDs when building both groups. Resource lists continue to use existing staff authorization/active-state and resource sources.

Browser verification:
- Both existing rooms and all four eligible teachers appear together, with no QA or legacy teacher names.
- Checking a teacher does not select a room. Changing a checkbox at sidebar scrollTop 247 retains 247 after redraw.
- Class type Unspecified and All types work and retain the sidebar position.
- Both languages show the new hierarchy; resource search is absent.
- Mobile timetable widths of 390px and 320px have no horizontal document overflow; existing responsive mini-calendar layout is preserved.
- Desktop independent portal scrolling and timetable internal scrolling remain active.

Validation: new layout/independent-selection regression cases failed before implementation and passed after. Full suite passed 1,989 tests. After adding position preservation, all 513 flow tests and the final production build passed. A clean staged snapshot independently passed five focused tests and its build. Existing large-chunk advisory remains unchanged.

`display-en.png` shows the default groups and Advanced filters, with the mini calendar scrolled out of the sidebar viewport.
