# Dropdown spacing and advanced timetable filters — 2026-10-19

- Single-value native selects across the shared stylesheet now reserve 44px for their cue and inset its 16px SVG by 16px from the right. Field colors, labels and native select interactions stay intact. Multiple/list selects are excluded. The timetable view switch keeps its existing separate SVG. Forced-colors mode uses the native control cue.
- Audited select markup in src.js and client modules, plus appearance/background-image overrides and disclosure padding. Existing course, resource, staff and lesson disclosure controls already have 12–20px outer padding. Timetable resource disclosures get an additional 8px inset.
- Class type moved into Advanced filters; Display retains Room, Teacher and Class. Existing selection and independent disclosure states are reused.
- All timetable filter eye controls share transparent backgrounds, with 44px minimum hit targets and existing keyboard focus outlines.

## Verification

- Exact staged source export: npm test --prefix sample: 1,958 passed, zero failed; npm run build --prefix sample passed.
- Current shared working tree: npm test --prefix sample: 2,001 passed, one attachment file-type identification failure (INVALID_ATTACHMENT). The failing attachment test passed when rerun alone (1/1). Current working-tree build passed.
- Focused placement/disclosure/course filter flows: 4/4 passed.
- Browser: desktop 1092×952 and mobile 390×844; Chinese and English labels; course-page selects and public preview dialog selects have 16px right arrow inset / 44px right text padding. Timetable view switch has only its existing SVG cue.
- Browser: Class type selection applied and restored to All types; Regular classes eye toggled off/on and original preferences retained. Advanced preset eyes have transparent computed background, zero border and 44×44px hit area.
- Screenshots: desktop.png and mobile.png. No database records were added, edited or removed.

Concurrent workspace changes outside this patch are deliberately excluded from the commit.
