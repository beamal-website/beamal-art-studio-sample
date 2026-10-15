# Timetable custom filters and realistic registration data checkpoint

2026-10-15. This is a limited implementation checkpoint, not a change to the Goal or a declaration that Course/Timetable or the entire system is complete. The current phase remains UI first. Keep the preexisting Goal/register files and collaborator work intact.

## Requirement and source boundary

The user explicitly reaffirmed the Notion extensions: personal named conditions, eye visibility, student, gender, age and course-price conditions must be implemented rather than left permanently disabled because data was absent. The user then required believable names, birthdays, families and the information commonly collected at registration for the same 300 students and four teachers. These are sample-data quality requirements, not new production mandatory-field or family-size policies.

SchoolTracs was revisited in Chrome at `/v4/web/timetable?b=2&o=yausiuhei07`: the left button opens calendar/Rooms/Teachers, with search, selection counts, unassigned and Hide Empty. The settings slider opens calendar view preferences; its Category option controls visible record elements. No named conditions or eye controls were observed in those inspected surfaces. Their Beamal implementation is the user/Notion extension, not a claim about all SchoolTracs screens. The research tab was closed; the user's original Sales tab was preserved. No source record or preference was saved.

## C-02 implemented scope

- Named all/any filters, explicit Save versus Save and only show, edit, remove and Undo, positive-only view and eye-off exclusions. Clearing display filters restores visibility without altering lessons. Existing checkbox behavior remains separate.
- Course, teacher, room, class type, activity kind, category, level, date, start time, student, gender, age at the lesson and current fee in HKD. Price requires per-lesson/fixed-monthly/package basis; it does not mean a historical amount charged to a student.
- Multiple person conditions must match the same student; multiple price conditions the same fee offer. IDs, not matching names, identify records. Unknown or unavailable positive-source facts do not match another person's data.
- Read-only `/api/timetable/filter-facts` derives authorized effective occurrences and paid rosters, exact student IDs, source gender and age as of that lesson. No birth date/contact/payment fields are exposed by this endpoint. Student accounts cannot access it; teacher scope is enforced by the service.
- Saved display preferences are scoped to identity/permissions; late window/identity responses are ignored. Role changes clear drafts and private candidates. This local preference is not a second business database.
- The editor supports scrolling, fixed footer, keyboard focus trap and return. Cancelling restores both grids in a 14-day layout. These controls do not add an attendance/payment write.

## Staff personal data scope

Four profiles are provisioned only when creating a new explicitly owned demo. They reference the same scheduling resource IDs as Maya, Leo, Ava and Ethan. No fourth login is added. Personal profiles and contact emails are separate from login accounts and payroll.

`/api/staff/personal-profiles` is read-only: Admin sees the records, a teacher sees only explicitly self-linked records, Student is denied. Course/resource teaching grants do not expose someone else's personal details. Initial creation rejects an existing record and audit failure rolls back creation. The DTO excludes salary, bank, identity-document and account fields, including malformed nested values.

The existing Staff directory/profile receives source position, employment, contact, birth date and age. Unknown/loading/error/empty states remain distinct. The current final profile Save remains disabled in the UI phase. Birth date is read-only. Background unchanged reads no longer remount an active editor; real failures retain the draft and correct return context.

## Verification evidence so far

Earlier C-02 freeze before the later family/staff work: workspace `npm test --prefix sample` 1216/1216, build successful. These are historical results, not the final test result for the subsequent changes.

- Pure filter module: 21 formal tests; independent Root host 10 cases and independent HTTP 3 cases, plus 36 SDK/HTTP formal checks.
- Multi-grid cancel regression: formal RED then GREEN and original independent reproduction rerun GREEN.
- Root Staff source cache: three RED/GREEN cases plus unchanged-background regression RED/GREEN; independent host six cases all GREEN after fixing editor remount. Logs `/tmp/beamal-staff-profile-host-independent-final.log` and `/tmp/beamal-staff-profile-poll-host-{red,green}.log`.
- Staff source maker formal 14 related server cases and SDK 28; Root independent exact-link/read-only/whitelist case GREEN (`/tmp/beamal-realism-staff-source-root-review.log`).
- New-demo linkage test first failed (0 personal records instead of 4); after wiring the new stage, 17 local-demo/launcher cases passed (`/tmp/beamal-realism-staff-stage-green.log`).
- Admin actual browser: student + Female + age 9 + current per-lesson HK$300 selected exactly Chloe's creative drawing lesson; reload/reopen preserved the filter. Eye hiding its room excluded the lesson. At 390px the editor body scrolls and its actions remain reachable. The actual Chloe lesson showed 9 years 5 months as of 2026-10-16. These initial screenshots used the earlier profile factory, and do not certify the later family realism revision.

## Remaining boundaries

Only Chloe currently has the preserved paid enrollment relations (two orders/seven enabled student sessions); the other 299 registration profiles are not 299 paid students. Do not inflate paid/seat counts to make filters look busy. The eventual representative enrollment/history distribution remains Goal work.

Family-plan/contact similarity does not grant guardian access or automatically merge families. Existing databases are not silently replaced or reset; blank enrichment is explicit and preserves nonempty human edits. New demo data and old user-data preservation must be reported separately.

The final revised-family evidence, full test/build result, bilingual 390/768/1280 actual screens, independent sample-data review and Git status are appended below when actually verified. Attendance saving, Trial, family activation, remaining Course/Timetable UI and the complete Goal remain open; no core requirement is reclassified as minor here.

## Final limited-slice evidence

The revised fresh demo at `http://127.0.0.1:55963` was inspected read-only: 300 distinct Chinese names and 300 distinct English full names; 239 contact-based sample family groups (193 single-child, 31 two-child, 15 three-child), maximum three; birthdays in all twelve months; all 300 have the common registration fields. Four staff personal records link to the same four teacher resources, and only the specified three logins exist. Paid students remain one and student sessions seven. Evidence: `/tmp/beamal-realism-actual-database-evidence.json`. These family groups describe the fictional cohort and are not guardian-account authorization links.

Independent sample-data verification passed nine cases against factory/new DB/preservation; twenty complete profiles were manually read, covering ages 3/6/12/18, a three-sibling household and Chloe. Names, dates, school grades, family contacts, adult teacher dates and age-appropriate interests were reviewed. A minor awkward generated remark was corrected; the related 32-case suite passed afterward. The independent report is `/tmp/beamal-demo-realism-independent-final.log`, sample `/tmp/beamal-demo-realism-sample.json`.

Actual GUI on the new demo:

- Admin: new 300-person directory, a five-year-old's birth date/K3/school/parents/contact information; Staff shows four teachers and one administrator, different positions/employment/contact information; Leo's profile shows 1993-03-21, age 33, joined 2022-09-01 and his own personal data.
- Teacher login: Leo has the same creative drawing and watercolour assignments; a saved four-condition filter (Chloe + Female + age 9 + per-lesson HK$300) shows his 2026-10-16 13:00 creative drawing lesson. Only authorized Chloe appears as a student choice in this window.
- Student login: Chloe retains 2017-04-18, age 9, P4 and the same school/Leo lessons. No other teacher's private profile or management custom-filter entry appears. Six enabled lessons are in the current month; this is not a claim that all seven sessions occur in that month.
- Desktop 1280, tablet 768 and mobile 390 were measured as actual CSS widths without page-wide horizontal overflow on the inspected directory/profile screens. English and Chinese were exercised; the mobile staff modal has an internally scrollable body and visible footer. Browser error/warning log was empty after the three-role review. A screenshot captured immediately while a viewport resize was painting was rejected; the settled replacement was inspected.
- Screenshot files: `/tmp/beamal-realism-students-1280-en.png`, `/tmp/beamal-realism-student-profile-390-zh-v2.png`, `/tmp/beamal-realism-student-birthday-390-zh.png`, `/tmp/beamal-realism-staff-1280-en.png`, `/tmp/beamal-realism-leo-profile-390-zh.png`, `/tmp/beamal-realism-leo-profile-768-zh.png`, `/tmp/beamal-realism-teacher-filter-1280-en.png`, `/tmp/beamal-realism-student-self-768-en.png`, `/tmp/beamal-realism-student-self-390-zh.png`.

Workspace full suite passed 1242/1242 (40.245s), followed by the server-only copy refinement and its 32/32 related check. A clean candidate exported exclusively from the Git index then installed successfully, passed **1227/1227** (35.54s, zero failures/skips) and built successfully (6.41s). The fifteen-test difference is an unrelated preexisting untracked Groups test file intentionally excluded from publication. All 290 relative imports resolved. No database, sidecar, `.env`, private data or unrelated untracked files were exported. Logs `/tmp/beamal-realism-clean-{install,tests,build}.log`; summary `/tmp/beamal-realism-clean-verification.json`. Existing Node SQLite experimental and Vite chunk-size warnings remain; build success is not a performance certification.

This completes this filter/registration-profile slice, not the entire C-02 requirement or Course/Timetable/Goal. Representative enrollment/history for the remaining students, final Staff editing and other core business workflows remain open. The original user databases and three credentials were not reset. Git publication status must be read from the actual commit/remote result, not inferred from this checkpoint.
