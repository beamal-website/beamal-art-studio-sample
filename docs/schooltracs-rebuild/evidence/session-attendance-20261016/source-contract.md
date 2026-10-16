# Exact StudentSession attendance save: independent source contract
2026-10-16. Research/source review only; no project/DB/Git changes. Browser authorised later for read-only reference; no SchoolTracs navigation or data changes succeeded. No live Notion claim.

## Confirmed product requirements
- **Six actual attendance states:** Present / Late / Absent / Leave / Sick / Other. Each applies to one student in one actual ClassSession, not a whole class/term/family. `unmarked` is the existing not-recorded state, never an automatic Present.
- **Admin and the ordinary teacher responsible for that exact lesson may mark attendance.** This is already confirmed, not pending general Teacher permissions: Goal `ULTIMATE-GOAL-PROMPT.md:186,258,342`; Notion source `:104`; register A-01 `:8–12`.
- Source `:106`, EX-05 `:339–341`, EX-06 `:343–346`, Goal `:259`: Absent/Sick/individualPending do not reduce occupied seats or change Full/Available. Attendance-to-Remaining deduction is explicitly unknown (register A-03 `:24–28`). Save attendance itself without inventing deductions, refunds, makeup eligibility or releasing seats.
- Student text Remark and colour Sticker are separate per-person/per-lesson data. Teachers may control their display on the internal Timetable; long text uses a prompt/summary and expandable full view. They are separate from Teacher representative colour, date/class internal memo and formal attendance status. Notion `:107–110`; Goal `:215,220,267`; register A-02 `:16–20`.
- `showRemark` is a Timetable presentation flag, **not permission to publish to parents/Student/anonymous viewers**. No family-sharing semantics for private Remark/Sticker were found. A false flag hides its Timetable hint, not deletion of the underlying note.
- Absent follow-up with Send Message to Parent / Make Up This Class is explicitly confirmed (Notion105/EX06, registerD-05). It remains important linked work; saving attendance must not invent a sent notification, applied makeup or new slot. Its eventual unique follow-up identity is the same StudentSession, not name/date text.

Source files are under `docs/schooltracs-rebuild/`; the Notion source records the2026-10-14 snapshot. No new policy was inferred from its pending sections.

## Original PDF actually rechecked
Original path `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf`.
SHA256 freshly rechecked: `ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e`.
Fully viewed verified p3 render `/tmp/beamal-attendance-source-page3.png`: the six choices appear in a specific student-row Attendance menu; Remarks has a separate Add entry. Handwriting requests special student remarks visible on the Timetable and make-up/postpone/message actions. This does not define deductions, sticker colours, family visibility or default checkbox states. It also means adding a Remark must not silently mark an unmarked student Present merely to satisfy a combined form.

## Fresh official reference / live limit
Chrome reused existing SchoolTracs tab846621913. Initial DOM read failed with Emulation.setFocusEmulationEnabled timeout; after documented troubleshooting one exact-tab rebind failed likewise. Stopped. No navigation, forms opened, dropdown selections, saves, new tabs or data changes. Therefore no live save/Cancel/focus/default observation is claimed.

Official current Help fallback:
https://beez.zendesk.com/hc/en-us/articles/360041617992-Take-attendance-in-timetable
Updated29July2026. It directs Timetable→lesson→specific student dropdown, with attendance visible in the Timetable afterward. Official image fully viewed:
- https://beez.zendesk.com/hc/article_attachments/32797279670681 — six choices, Select/not-recorded entry, separate Add Remark.
- https://beez.zendesk.com/hc/article_attachments/32797279674777 — Timetable student line shows attendance marker afterward.
Local images `/tmp/beamal-attendance-official-20261016/student-attendance.png` and `timetable-attendance.png`.
These are official document screenshots, not today's live account or proof of write policy. No auto-save timing, teacher rights, remark modal or parent-sharing rule is inferred from them.

## Current server facts and exact safety seams
1. `sample/server/enrollment-orders.mjs:46–53`: StudentSession stable ID + student_id/schedule_id/sequence/order_id; unique student+schedule+sequence. Only attendance exists, defaultunmarked. No row CAS version, remark, sticker or visibility columns yet.
2. `:184–199`: payment confirmation creates these exact rows; each links a paid order. Do not create another StudentSession when marking attendance.
3. `:106–111`: currentOccurrence resolves the effective occurrence, including following segments/overrides, and rejects deleted/inactive Course/schedule. This source, not stored order lesson dates or original base schedule, supplies current date/time/teachers.
4. `:214–219`: roster permits Admin/Teacher reads, but its `scopeFor(actor).permits(occurrence)` is **read access**; remark is presently hard-coded empty. It cannot be reused as the complete mutation authorizer.
5. `access-control.mjs:98–105`: permits includes course/resource/occurrence scoped_read_grants. A Teacher with read grant to another person's lesson is not thereby the responsible teacher.
6. `access-control.mjs:132–135`: ownTeacherResourceIds re-reads DB actual role and explicit teacher_account_links. Responsible-write rule can intersect these exact IDs with **effective occurrence.item.teacherIds**. Multi-teacher and multiple own-resource mappings must be preserved; names/colour/current requestteacherResourceIds must never grant rights.
7. `enrollment-orders.mjs:201–212`: Student timetable currently projects only own-linked students and attendance; this is the safe place to reflect own saved status. Do not spread new private remark/sticker/visibility fields into it.
8. `:183`: occupancy counts paid StudentSessions independently of attendance, which already satisfies no automatic seat release. Keep that invariant.
9. `app.mjs:264–267`: existing exact schedule+sequence rosterGET; no attendance mutation exists. Existing order action `:257–261` explicitly reauthorises after body await and before idempotency replay. New Teacher attendance mutation needs the same protection.
10. `client/shared-lesson-context.js`: the host already validates selected StudentSession ID + studentId + paid roster uniqueness and source occurrence, creates canonical lesson sourceVersion, and accepts optional remark/stickerColor/showRemark. Its current save capability isfalse.
11. `client/shared-lesson-workflow-ui.js:3–4,24–41,103–111`: existing six-state editor, raw remark≤2000, optional sticker palette none/yellow/green/blue/pink and `showRemark` checkbox explicitly labelled internal Timetable. These palette values are current product implementation choices, not literal PDF policy. Unknown must not become a fabricated sticker or Present.

## Bounded safe save contract for maker
- Mutate an existing exact StudentSession; route shape can follow maker/Root contract, but server must resolve sessionID→studentID+scheduleID+sequence+paidOrder consistently. Treat body IDs as assertions only; never change ownership/tuple/order while saving attendance.
- Fresh DB actual role; Admin bypasses teacher assignment. Teacher must have a current explicit own-resource link intersecting the effective occurrence's teachers. Read grants alone permit read only. Student/anonymous cannot mutate.
- Re-check role/assignment/session authority **after await body and immediately before cached idempotent response**, not only inside mutation closure. A revoked link/reassignment must not obtain an old private cached ACK. Do not compare the old CAS rowversion before cached successful replay, or retries would fail by design; authority and version checks are different concerns.
- Add a target-row version and updatedAt/audit atomically; preserve existing attendance and all original stable IDs. Minimal remark/sticker/display storage belongs to this StudentSession, not person-global profile/schedule remark. Safe migration gives missing sticker/display an honest nullable/unknown state or explicitly documented internal-only default; never public visibility.
- Validate exact six states for marked attendance; permit/preserve existingunmarked for read or remark-only paths without converting it into a seventh observed outcome. If reset-to-unmarked is offered, make it an explicit action; don't silently clear a recorded status when changing only Remark.
- Required CAS/source assertions: target rowversion + expected current occurrence sourceVersion; current canonical date/time/tuple must remain exact if rescheduled while editing. Rowversion isolates concurrent edits on this student; another student's attendance should not conflict or be overwritten.
- Remark plain optional string up to existingUI2000, preserving whitespace/newlines; palette whitelist aligned with UI and explicit no-sticker handling; showRemark must be real boolean/internal presentation flag, no truthy string coercion. Omitted optional fields preserve existing values unless the chosen full-form contract explicitly supplies them; never silently erase old notes/stickers through an older attendance-only caller.
- Idempotency key per reviewed draft: exact retry gives one target version/audit; changed payload with same key409. A true ACK identifies same sessionID/studentID/scheduleID/sequence/current source and canonical saved fields/version. Failed/uncertain/late ACK never means success or applies to another modal.
- Save must not touch orders, payment status, sales, purchased quota/Remaining, reservation holds, ClassCapacityStatus, scheduling assignments, other students/sessions, public metadata or parent delivery. No automatic seat release, fake Paid, “message sent” or makeup.

## Fixed independent service outcome cases for later implementation review
A. Admin saves each of six states on non-first session/student/occurrence; exact one row version/audit changes; all other rows, another occurrence of same student and sibling remain byte-equivalent.
B. Responsible ordinary Teacher succeeds from an explicit own teacher-resource ID. Same-name other Teacher, only course/resource/occurrence read grant, wrong current sequence, stale base teacher overridden by substitute, and forged selfIDs fail. Assigned substitute succeeds only for the effective occurrence where assigned.
C. Link revoked or effective teacher reassigned while request body is pending; same-key replay after revocation; both refuse before revealing cached private ACK. Account role changed inDB cannot rely on stale request.role.
D. Unknown session, mismatched session/student/schedule/sequence/order, unpaid/orphan legacy relation, inactive/deleted/cancelled current lesson, malformed sequence/date/sourceVersion, stale rowversion each refuse without changing data. Unknown/inaccessible IDs don't borrow first/student-name matches.
E. Repeat same reviewed key/body gives exactly one version/audit and same ACK. Same key changed body409; no key retains rowCAS behavior. Forced audit failure rolls back state/version and does not consume retry key. Disk test fixture restart preserves real fields.
F. Raw Remark/XSS/newline/long boundary, sticker none vs unknown, showRemark false vs true. Attendance-only old caller preserves existing remark/sticker/display. Unknown/error cannot replace values with blank or zero.
G. All six status changes leave occupancy/capacity/Full/Available/public slots/trial holds/order/pricing/quota untouched. Absent does not create a replacement slot or another StudentSession.
H. Own Student timetable reflects only that child's saved attendance; siblings distinct; unlinked student/another family excluded. Private remark/sticker/show flags never in Student/anonymous DTO or public conditional revision. showRemark=true must not grant family/public read.
I. Native host later: exact row source→Review→save, canonical ACK→same class roster/focus/scroll, refresh across Admin and responsible Teacher; network/2xx unreadableACK same-key recovery; doubleclick;409 preservingraw; lateACK after view/identity/tuplechange rejected. Parent/source error updates must not remount typed fields or focus hidden errors.

These are independent acceptance expectations, not a claim that a new backend has passed. Await Root/maker's fixed schema/API/freeze, then run scoped implementation tests in /tmp without touching existing DB. Absent unique To-do is confirmed linked scope, but its absent current source must be reported rather than faked or reclassified minor.
