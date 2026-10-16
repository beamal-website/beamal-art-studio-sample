# Course package segments — local checkpoint, 2026-10-16

Scope: Courses and directly related package metadata only, after `091d835` on `test`. The Timetable/Courses goal remains incomplete. Other modules and the active Goal definition were not changed.

## Requirement and boundary

The original PDF pages 1 and 4 were visually rechecked by an independent researcher. Page 1 shows Class A 60 + Interview 30 = 90 minutes × 12, and 60 + 60 = 120 minutes × 8; page 4 also shows the combined package. These are examples supporting ordered components and segment durations, not approved deduction or rescheduling rules. The existing PDF/Notion comparison records the gap at lines 47 and 148; the active launch requires retaining composition without silently converting units.

This slice stores descriptive components against the existing exact Fee/package ID, separately from its linked courses, pricing and quota. Linked courses are not automatically interpreted as components. It does not decide whether components share one lesson, can be scheduled separately, consume separate balances, or permit partial make-up. It does not propagate changed composition into historical orders or public slots. This is not a claim of complete package business logic or SchoolTracs parity. Chrome reference-tab acquisition timed out during the separate Absent investigation; no new SchoolTracs package behavior is claimed from that attempt.

## Delivered behavior

- Admin opens Courses → the exact package fee → Package contents, reads the saved composition, edits names/minutes/order, reviews and saves; reopening prefills the same stable component IDs. Existing contents can be explicitly cleared after a clear-all review. First-time empty saves are rejected without creating a record.
- Up to 50 segments, names up to 200 characters, whole-number minutes 1–1440. Raw names and ordering are retained. The duration total and existing package quota are displayed separately.
- Teacher reads only a package linked to an active course in their current course scope. Teacher cannot write; Student/public cannot read this internal endpoint. Current persisted role/scope is checked again after the request body and before an accepted retry is replayed.
- Independent composition and Fee versions prevent overwriting another edit or saving against changed pricing/type/course links. Authenticated request keys deduplicate retries. Content, audit and receipt writes are transactional.
- Failed/unknown reads are not rendered as empty contents. Failed saves retain drafts; uncertain acknowledgements freeze the original payload/key for retry. Conflicts offer an explicit reload retaining the draft and require another review. Late route/identity/closed-owner replies cannot repaint another screen. Saving blocks duplicate clicks and closing; Cancel returns focus to the original Package contents control.

## Verification

- Final required full test command: `npm test --prefix sample` — **1803/1803**, no failed/cancelled/skipped tests, 56.58 s. Working-tree count includes 15 pre-existing unrelated untracked staff-roster-group tests; those are not part of this commit. Earlier run was 1802/1802; the extra case guards first-time empty API writes.
- `npm run build --prefix sample` passed in 9.53 s. Existing large-bundle warning remains. The later empty-input guard changes only the backend; frontend build inputs remained unchanged.
- Author tests include 11 real backend cases, 2 SDK cases, 9 new host cases, 22 pure UI cases and relevant existing tests. Independent acceptance passed 4 real HTTP groups plus 7 full-src/SDK cases, with no remaining blocking finding. The independent reviewer reproduced the first-time-empty write bug without weakening its assertion; that same case passed after the fix. The reviewer also inspected the captured desktop/tablet/mobile/English/Teacher screenshots, explicitly as screenshot review rather than personally driving the GUI. No test double is presented as actual browser evidence.
- Real browser at `http://127.0.0.1:64048/account`: authorized local Admin saved Drawing 60 + Interview 30, total 90, while the saved quota stayed 720 minutes and fee version stayed 1. A subsequent reordered draft was cancelled; reopening retained the original saved order and returned focus correctly.
- Service was stopped and restarted retaining the same isolated database. Fresh Teacher login read the same 60/30 composition with zero Edit controls. English view was checked. Student/internal-read rejection and unrelated Teacher denial were checked through actual authenticated API tests.
- Viewports 390×844, 768×900 and 1280×900: document width equals viewport width; dialog remains inset, scrollable and within the viewport; footer buttons remain accessible. Captured console errors/warnings were empty. Saved mobile and desktop screenshots are in `evidence/package-contents-20261016/`.
- Some browser automation mouse actions transiently returned stale-node errors; fresh semantic keyboard actions or subsequently available mouse actions completed the same visible workflows. No hidden state, browser-evaluated mutations or direct API calls substituted for those UI actions.

## Existing data and remaining work

Before/after SQLite backups were compared row by row. All 48 original user-database tables remained unchanged; the two new composition/audit tables are empty there. Its integrity check passed. In the isolated GUI database, the old tables changed only for login sessions and one accepted request receipt; one new composition and one audit row were created. Existing prices, quotas, orders, StudentSessions, sales, arrangements and Trial records stayed unchanged. Its integrity check also passed.

Original service remains `127.0.0.1:5180` with the original database; the isolated sample above is only verification data. No database was reset or reseeded. No original user package was silently populated from the example.

Still outstanding for the narrowed goal: complete target selection/final confirmation for Make Up This Class, the Absent follow-up lifecycle, real Send Message to Parent continuation, and remaining course/timetable end-to-end acceptance. Absent correction/reopening policy and Trial minimum required fields remain unanswered human decisions; existing unresolved policies were not converted into defaults. Package scheduling/consumption policies remain separate from this metadata delivery.

This checkpoint is local work on `test`; no push or deployment is included.
