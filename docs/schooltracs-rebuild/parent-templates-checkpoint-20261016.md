# Personal parent-message templates — local checkpoint, 2026-10-16

Scope: reusable Preset Message to Parents for the exact Timetable/Courses student-lesson contact flow, after `9898959` on `test`. The whole Timetable/Courses goal remains incomplete. No unrelated module or Goal definition was changed.

## Requirement and adopted boundary

The original PDF page 3 locates Send Message to Parent at an individual student in a particular lesson. The **teacher-side Settings template manager**, reuse → fill → edit → Preview workflow is confirmed by local Notion section 6.4 line 121 and register P-02 lines 416–421, a conversation extension rather than original PDF field detail. See `evidence/parent-templates-20261016/source-contract.md`. No fresh live SchoolTracs/Notion observation is claimed this slice.

Each authenticated Admin or Teacher manages their own templates. This is an explicit bounded implementation choice because shared-library/cross-teacher modification rights were not specified; it does not grant schoolwide Settings authority. Admin cannot read another staff member's templates either. Title and plain-text body are copied literally; token-looking text is not interpolated, translated or filled from private student data. The same body can be used with either available contact channel without switching the channel automatically. Archive/restore is a reversible engineering choice; no hard deletion was introduced.

## Delivered workflow

- Admin and ordinary Teacher: Settings → Preset Message to Parents → search/paginate active or archived personal templates; create/edit title and body → Review → Save. Reopening and restarting read real saved IDs/versions. Duplicate names do not select another record. A Teacher's limited Settings page exposes only this personal tool, not school resources, access management or other global settings. The Admin entry is outside the Scheduling section.
- The exact paid student/lesson Contact parent editor offers Choose template. A fresh exact-ID read leads to a body review. With an existing draft, the old draft and replacement warning are shown; only explicit Use/Replace copies the reviewed text into the editable composer. It does not send, change child/lesson/recipient/channel, or create an arrangement.
- Cancel/X/Escape from the child chooser restores raw text, selected channel, focus and reading position in the existing composer; closing that composer returns to the original lesson/menu/session control. Background updates and language renders do not harvest the child form as the parent message.
- A copied body is a snapshot, not a live template binding. Later edits/archive do not alter the draft or sent message. The original source-revision/recipient review/send protection still applies, including when the recipient changes while the chooser is open.
- Current persisted role and owner are checked after the mutation body and before receipt replay. Independent template versions prevent overwriting another edit. Template, audit and idempotent receipt save transactionally; a lost acknowledgement retries the same raw payload/key. Conflicts keep the draft and explicitly reload the latest version for a new review. Late identity/navigation responses cannot reveal private templates or restore another person's composer.
- Loading, error, no matches and genuine empty lists are distinct. A last page removed by another edit recovers to a real page. Native fields and IME are not intercepted as review/save clicks.

## Verification on final source

- `npm test --prefix sample`: **1882/1882**, zero fail/cancelled/skipped, 49.13 seconds, `/tmp/beamal-template-acceptance-final.log`. This includes 15 pre-existing unrelated untracked staff-roster tests, which are not in this commit. Earlier 1882 passed before the final static Admin grouping correction; this final pass is after it.
- `npm run build --prefix sample`: passed in **6.07 seconds**, `/tmp/beamal-template-build-final.log`. The existing large-bundle warning remains. No source changed after these final commands.
- New formal coverage: 9 server, 2 SDK, 10 template-controller, 11 pure UI, 2 composer-controller and 1 optional composer-entry case; existing flows 480/480 passed. One old navigation expectation was deliberately updated because the confirmed Teacher Settings entry is newly supported; an explicit assertion now excludes schoolwide tools from that page. No security assertion was removed.
- Independent **23 semantic groups** passed: 7 real HTTP/server, 9 actual controller/default pure-renderer and 7 complete-src controlled-DOM integration. They cover own/cross-owner roles, exact same-name IDs, literal body, CAS/retry/concurrency, archive/restore, paused-body role revocation, audit rollback, restart, recipient drift, child-return, native form controls and no accidental send. The controlled DOM is not claimed as real browser rendering. The report separately records test-fixture mistakes rather than calling them product defects.
- Genuine RED/GREEN author evidence includes absent API/SDK methods, optional composer entry, raw child-draft return, legitimate long multi-resource identity and last-page recovery. The first attempted GUI build failed because the independent CSS writer was still working; after the files were ready, the real build passed. It was not a site-runtime failure.

## Actual browser and data evidence

Real IAB at isolated `127.0.0.1:64048/account`, using only authorized local mock accounts:

1. Leo's limited Settings opened a genuinely empty personal library. Created two different reminders, archived/restored the exact second one, then stopped/restarted the service retaining the same database. Both records reopened correctly. Updated the first template via actual Review/Save.
2. Courses → Creative Drawing → Timetable → Chloe's 2026-10-16 13:00 paid session → Send Message to Parent. Entered a raw draft containing leading/trailing spaces and a newline, selected WhatsApp, opened/cancelled the chooser. The exact raw value and WhatsApp choice remained; textarea focus returned.
3. Reviewed the saved reminder, explicitly replaced the draft, edited it for Chloe, explicitly chose App, previewed and sent through the actual local service. Closing restored the same `507b2478-5fc7-4ff2-8515-2c4ba6cf3ea3` row's open menu and contact-button focus.
4. Edited the reusable template after sending. Fresh Student login's Notifications showed Leo's original sent body, correct Chloe/course/date/time and the earlier message. The later extra template line did not alter that sent snapshot. Admin login showed its own empty library, with no Leo templates.
5. English/Chinese and 390×844, 768×900, 1280×900 layouts were inspected. Mobile edit and explicit replacement controls remained readable and reachable; longer lists scroll in the dialog body with the footer available. Width checks on the 390 and 1280 views matched document width to viewport. No captured console error/warning. Independent screenshot review passed four template images; the fifth Student inbox image is Root's separate actual receive evidence.

Before/after database comparison: all **52** original user-database tables stayed row-for-row unchanged; the two new template tables are empty there, integrity check `ok`. In the isolated GUI database, the only old-table differences were login sessions, six accepted request receipts, and one additional message/audit pair; two templates and five template audit rows were created. Existing people, account links, orders, attendance, quotas, seats, Pending and Trial/public data remained unchanged. See the count-only `data-preservation.json`. No reset/reseed or external send occurred.

Original service remains `127.0.0.1:5180`; the separate verification service/database is not a replacement for user data. Existing Beamal images and bilingual/mobile behavior were retained.

## Remaining narrowed-goal work

The confirmed personal-template workflow is implemented. Schoolwide template sharing, dynamic tokens and cross-owner edits were not silently invented; they are not claimed as source-confirmed completion requirements.

Timetable/Courses still require the complete Make Up This Class target-selection/final-confirmation path, Absent follow-up lifecycle and remaining joint acceptance. Existing unanswered Absent correction/reopening and public Trial minimum-field decisions remain unresolved. Composition scheduling/consumption policies remain separate from stored package segments. This slice does not close those tasks or complete the Goal.

Work is on `test`; no push or deployment is included.
