# Advanced custom filter list — 2026-10-19

- Expanded Advanced filters now contains only saved custom filter rows and one trailing + button. Empty state is just +, with an accessible Create filter name. Existing 20-filter storage limit is retained.
- Rows show an editable name on the left and an icon-only transparent eye on the right. Clicking a name opens the existing condition editor; Save remains a normal save (no implicit Only view). Save is the primary action.
- Delete moved into the edit dialog and keeps the existing Undo path. A successful deletion closes its editor; failed storage keeps the draft and prior preferences.
- Existing presets and standalone Class type dropdown removed from the Advanced list. Class type and activity kind remain conditions in the editor; saved custom filters are retained.
- Hide-empty dates moved to Calendar View Settings as a switch. It uses a draft and changes the calendar only after OK; closing preserves the prior state. Month view keeps every date.

## Browser verification

- Created two temporary course filters through + and Save. Both appeared as name / eye rows with a trailing +. Eye state persisted across a full reload.
- Opened each via its name and removed both after checking. No temporary saved filters remain; original unassigned-teacher hidden preference retained.
- Checked mobile 390×844 create/cancel, English and Chinese empty lists, desktop saved rows, and calendar setting cancel behavior.
- Screenshots: two-filters.png shows temporary examples before cleanup; empty.png and mobile-empty.png show the cleaned state. No lesson, course, staff or student data was created or modified.

## Automated verification

- Shared working tree full suite: 2,002 passed, zero failures (before final calendar switch markup adjustment). Latest focused flows: 10 passed; filter model/presentation tests: 22 passed.
- Shared output build collided with another simultaneous build while copying PDF assets (EEXIST); isolated builds avoid writing to the shared dist directory.
- Final exact staged snapshot: npm test --prefix sample passed 1,959/1,959; npm run build --prefix sample passed (3.58s).

Only this filter patch and its evidence are committed; concurrent workspace edits are excluded.
