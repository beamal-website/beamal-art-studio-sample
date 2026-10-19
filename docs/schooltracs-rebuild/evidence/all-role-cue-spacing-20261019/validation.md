# Public website and all portal cue spacing — 2026-10-19

## Change

- Increased the common single-select arrow inset from 16px to 24px and reserved 52px for its text/cue area. This applies to the public website, Admin, Teacher, Student and their dialogs, including native size=1 selects. Multiple/list selects retain native behavior; forced-colors fallback is preserved.
- The timetable's separate SVG cue now uses the same 24px inset, with one cue only. Wide layouts reserve 176px for its label; compact controls retain adequate width.
- Resource picker, course-slot, staff task and lesson-date disclosure rows receive a 24px trailing gutter. Display groups combine their existing 14px parent gutter with 10px summary padding. Icon-only account and overflow menus retain centered icons.
- Admin Settings category chevrons now sit 24px from the button's edge on desktop; mobile categories keep their existing horizontal navigation without a trailing cue.
- The compact Add Schedule label may wrap, preserving space beside its cue rather than squeezing it against the edge. At 390px its measured cue inset is about 15.5px, and the timetable toolbar has no horizontal overflow.
- Catalogue status filters are widened to 132px so the larger cue area does not clip their labels. Images, permissions, records and existing filter behavior are unchanged.

## Coverage

Shared source inventory covers every select and summary markup site in src.js and client modules (source-inventory.json). Appearance/background-image overrides, right-positioned SVGs, trailing summary cues and settings navigation were reviewed across stylesheets.

Actual browser checks (cue-audit.json contains 45 observations, including intermediate measurements before compact-width/settings corrections):

| Surface | Checked views/components |
| --- | --- |
| Public website | Home/course directory, course information and trial application dialog, Public Timetable, FAQ, News; Public Timetable desktop and 390px mobile |
| Admin | Course/Fee filters, Students, Leads, Accounting, Reports, Staff, Roster, Leave, Clock records, Payroll, Settings; timetable/custom range at desktop and 1600px; Add Schedule and custom teacher/room disclosures on desktop/mobile |
| Teacher | Actual Teacher login; To-do, My classes, Roster, Clock, Leave, Payroll, Courses, Fees, Settings, timetable/custom range; 390px toolbar and Chinese controls |
| Student | Actual Student login; calendar/custom range, Calendar View Settings desktop/mobile, My classes, Payment History, Profile/family, requests, courses/events, rescheduling dialog; Chinese calendar |

Empty or unavailable-data views were inspected as rendered. Unpopulated staff-task and legacy lesson-date accordion variants were checked through their shared source styles, rather than inserting fixture records to manufacture screenshots.

- Every measured native select uses 24px arrow inset / 52px reserved right padding. Custom resource disclosures measured 24px; settings category chevrons were rechecked at 24px after correction. The separate timetable SVG measured 24px at 1600px width.
- Public Time type and timetable view controls were changed and restored to confirm operation. Editor/dialogs were opened and canceled without saves or submissions. Original admin identity and default viewport restored; final tab left on Public Timetable.
- Full current working-tree npm test --prefix sample: 2,010 passed, zero failed. Isolated final staged CSS npm run build --prefix sample passed.
- Screenshots include public, admin resource dialogs/settings, teacher timetable and student calendar settings at desktop/mobile sizes.
- Only this shared CSS patch and evidence are staged. Concurrent source, server, operations and other workspace edits are excluded.
