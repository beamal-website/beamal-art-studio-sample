# Make Up This Class — target selection and final confirmation source contract

2026-10-16. **Research only**, next continuation. Scope remains Course/Timetable and exact StudentSession arrangements. No repository/Git/database/live service/browser changes or tests/build run; only this report and a fresh rendering of original PDF p2 in `/tmp`.

## 1. Main conclusion

**Pending Confirmation is implemented; choosing a real eligible replacement and finally confirming it is not.** The missing final movement is core work, not a minor feature. It cannot safely be implemented by just enabling the existing Confirm button or changing a StudentSession's date/attendance.

The source confirms the result (exact person/lesson, qualified target, atomic source/target updates and both-end timetables), but not all rules needed to compute qualification, seats, credit and historical attendance. A narrow final-confirm flow can proceed once the human chooses a bounded policy. Other UI/read work can continue meanwhile; unknown qualification must remain unknown rather than fake “eligible”.

## 2. Original and extension evidence, reopened this turn

- Original client PDF `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf` **p2** freshly rendered/viewed as `/tmp/beamal-makeup-source-page2-20261016.png`. Handwriting shows Available/Full, a `14/10–20/10` **same-topic** example, parent App self-selection for Regular, and restricted classes referred to WhatsApp. This supports retaining same-topic qualification. It does **not** mean any same-named course qualifies, or that every calendar week is the policy window. It does not specify a credit or seat-transfer formula.
- Original **p3**, previously reopened complete image `/tmp/beamal-absent-source-page3.png`, has student-row ⋮ actions **Make Up This Class / Postpone / Send Message to Parent**. It supports exact individual entry and history context, not whole-class movement. The source screenshot's paid `720/720min` does not define how make-up consumes credit.
- Local Notion `docs/schooltracs-rebuild/notion-requirements-source.md:37–44` separates ClassSession, StudentSession, Request and ClassArrangement. `:46–50` confirms separately configured Total/Trial/Rescheduling capacities, excluded students and distinct attendance/occupancy dimensions; their joint enforcement is not fully defined.
- `:112–118` confirms exact retained button name; combined make-up/reschedule/postpone entry; date accordion with four-digit dates, chronological times and eligible slots; final Confirm rechecks eligibility/capacity and synchronizes original/target records plus all related teachers/student calendars. Pending chooses no destination, reserves no target and does not release original seat. Completion closes the linked pending task.
- Register `notion-requirements-register-source.json:320–348`: **M-01 unified entry**, **M-02 date accordion**, **M-03 student-level Pending**, **M-04 related two-end timetable sync**.
- Notion `:104–106` and `:95–101`: six attendance states, Absent/Sick/Pending alone do not release seats/change Full; deduction and several ordinary Teacher edits are not confirmed. `:195–205` explicitly leaves final original/target seat handling, postponement, credit, overcapacity and permission details unresolved.
- `:259–261` defines parent Request Rescheduling / Sick Leave as a separate request for an exact child/lesson; approval/cutoff/deduction are unresolved. Parent restrictions must not be mistaken for a rule forbidding all staff handling of those classes.
- `docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md:258–267`, especially263–264, preserves same-topic direction; actual mapping/cycles/date windows/exceptions remain to confirm. Restricted parent self-selection categories are **competition, storybook, private and Trial**, not the old misread “handicraft”, and not automatically every Special type. `:265` requires final current recheck, original/target sync and no early target hold.
- `docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md:52–61,68–72,145,149` records these provenance/ambiguity boundaries. “Notion snapshot” here is the local saved source, not live Notion. No fresh SchoolTracs/Chrome claim or repeated timeout attempt this turn.

## 3. Current code: genuinely implemented versus missing

### Implemented anchors

- `sample/server/enrollment-orders.mjs:48–55`: exact `student_sessions.id`, person, order and `(schedule_id,sequence)`; unique `(student_id,schedule_id,sequence)`.
- `:66–69`: arrangement table is keyed to one StudentSession, **CHECK(status='pending')** only. `:122–140` reads current canonical occurrences/Paid sessions, current source Teacher write ability, attendance and independent arrangement facts.
- `:160–190`: Admin/current source Teacher can read/save Pending; strict `{version,sessionVersion,sourceVersion}`, CAS and audit, already-pending no-op. It writes no target/attendance/seat/credit change.
- `:192–205`: durable unique Pending-derived work, exact IDs, own current Teacher scope, correct totals/paging/revision, independent of current calendar window. `src.js:941–985` contains the work source/continuation adapter; roster and work both use exact opaque return tickets and stable focus/scroll.
- `enrollment-orders.mjs:324–344`: Student timetable follows explicit child-account links; roster/occupied are currently paid StudentSession rows. Pending status/version appears safely in owned calendar and roster.
- Current `client/interface-preview.js:113–204` has shared exact source refresh, separate Pending base versions, immutable operation/retry/ACK handling and the real save callback. `src.js` resolver/current ticket and `saveSharedPendingForUi` already guard identity/source and restore either work or original roster. Existing HTTP/host tests below preserve this path.

### Missing final-confirm source and storage

- `client/shared-lesson-context.js:41–44` **always returns `availability:{ready:false,slots:[]}`**. No exact-student eligibility source is connected.
- `client/shared-lesson-workflow-ui.js:15–23,64–75,120–139` has a pure date accordion/selection/review renderer, but only supplied `eligible===true` + verified positive available count can be selected. This is presentation capability, not real current target eligibility or a booking action.
- Same file`:143–155` and reducer`:53–54`: selected-target `final-confirm` remains disabled/inert; only attendance and Pending have real save capabilities. Controller has no final-target callback.
- `server/app.mjs:345–355` + SDK have Pending read/save/work routes, not an eligible-target query or final arrangement endpoint.
- Current arrangement table cannot express confirmed/canceled/history state or a target. No confirmed movement/entitlement/history record exists.
- `enrollment-orders.mjs:306` counts **all Paid StudentSession rows** as occupied; no arrangement-placement/seat-status axis exists. Blindly moving/deleting the row changes original attendance/roster semantics. Blindly adding a target row increases entitlement-like rows and may double-count a replacement. Neither is an established business policy.
- `enrollment-orders.mjs:307–322` Confirm Payment is the sole current creation path for paid sessions. Make-up must not call it again or create another payment/sale to activate a replacement.
- Order items retain purchased `(courseId,scheduleId,sequence)` snapshots. Parent messages, Pending and attendance also reference the existing StudentSession ID. Therefore final placement needs explicit **original purchase/session lineage and current arrangement/history**, not rewriting old identities or silently losing their old annotation/message links. This is an engineering integrity requirement; the seat/credit result still needs policy.

### Useful existing target facts, not a final policy

- `server/available-slots.mjs:8–11,22,58–76` has exact Slot ID, linked `scheduleId/sequence` or standalone source, canonical date/time/duration/resources, versions/source identity, active/sourceAvailable, `reschedulingEnabled`, quota and `excludedStudentIds`.
- `:70–71` computes `reschedulingRemaining = configured capacity - held rescheduling reservations`; **`totalReserved:null` is deliberate unknown**, not zero. Separate formal `classCapacity/classOccupied/effectiveStatus` is projected. Do not interpret reschedulingRemaining alone as the physical seat count.
- `:74–76` Teacher DTO deliberately omits excluded student IDs/private remark; a browser cannot correctly enforce exclusion by treating the omitted array as empty. New eligibility must evaluate exclusions server-side and return only the allowed result/reason for this exact child.
- `:117–135` has **Trial-only reserve/release orchestration**. The reservation table permits kind `rescheduling`, but there is no finalized rescheduling service using it. Do not borrow Trial hold/reject rules as the make-up policy.
- `server/class-capacity-status.mjs:24–26,71–77` supports automatic vs Admin manual Available/Full with source/status versions. A green manual badge does not authorize overcapacity; existing paid enrollment still checks hard count in `enrollment-orders.mjs:315–317`.
- `server/class-types.mjs:8–19` supports `studentReschedulingAllowed: true/false/null`. This is parent self-service guidance, not proof of ordinary staff cross-class write authority or of same-topic identity.
- Current Course/Schedule/Slot canonical fields have **no topic or teaching-cycle identity**. Fee `bookingExpiry` is a pricing snapshot field, not an activated student entitlement expiry ledger or final make-up deadline. No meaningful remaining-credit calculation can be inferred from these fields alone.

## 4. Minimum human decisions for a safely bounded final flow

The engineer can choose API names, transactions, IDs, versioning and layout. These **business effects cannot be silently chosen**. Avoid a long generic policy questionnaire: obtain these four bundles with the concrete example first.

### A. What does Confirm do to the original lesson, its seat and attendance history?

Ask: **“未上嘅課調去另一日，同已經Absent嘅補堂，係咪兩種處理？原堂紀錄保留，原位幾時放返出嚟？”**

- **Future replacement example:** original8/8 → target7/8. If Confirm is a true future transfer, original may become7/8, target8/8, and the original must show a traceable moved/canceled enrollment rather than disappear. Is this the intended result?
- **Past Absent make-up example:** original was8/8 with this child's Absent. Options are preserve that historical8/8/Absent and add a linked replacement entitlement/attendance, or treat it as a different replacement model. **Do not erase Absent, copy Absent to the new lesson, or retroactively free the historical class without agreement.** The new target's attendance should not be invented.
- Unified “Make Up This Class” entry does not mean these two intents share one seat/history formula. Confirm the allowed intent(s) for the first bounded slice. Original attendance and remark/sticker history must remain traceable regardless of chosen formula.

### B. Which targets are eligible, within what topic/cycle/date window?

Ask: **“第一版係咪只可揀同一課程、同一課題／教學期、同樣時長嘅課？課題同教學期由你點樣指定，最早／最遲可改到幾時？”**

- Source-supported requirement is **same topic**, with no automatic mapping yet. Options: staff explicitly configure a stable topic/teaching-cycle per lesson, or authorized staff explicitly approve recorded exceptions. Identical course name or same calendar week is insufficient.
- Decide same Course ID only versus a permitted equivalent-course set; same duration only versus different-minute targets. A 60-minute→30/90-minute change cannot silently translate into Visits/Minutes or a fee difference.
- Decide future/past target limits, how postponement extends beyond a teaching cycle, and whether a saved package expiry restricts this operation. `14/10–20/10` is not a global fixed window; `bookingExpiry` alone is not a student-specific eligibility decision.
- Restricted parent-self-service classes still need staff contact/manual arrangement; they cannot simply disappear from every staff flow. Student request/approval policies can remain a separate later step, but staff target eligibility itself must be real.

### C. Which authority and capacity gates must Confirm enforce?

Ask: **“先只由Admin最後確認，定原堂負責老師可以直接安排到另一老師嘅班？目的班要有真正式空位，同時扣一個調課配額嗎？滿額一律唔收，定有另行特批？”**

- First scope options: Admin-only final confirmation; current source Teacher within specifically granted arrangement authority; or source+target teacher approval. Read grants/current Teacher ability to mark attendance/Pending are **not** automatically all these authorities.
- Prefer explicitly bounding initial targets to **linked existing formal occurrences** if accepted. A standalone AvailableSlot has no formal Schedule/sequence to receive a paid StudentSession; supporting it needs an approved class creation/placement path, not covert schedule creation during Confirm.
- Define whether target must pass both formal class vacancy and separate rescheduling quota, and how Total/Trial/Rescheduling limits share physical capacity. The source says they are different dimensions; do not invent `Total = Trial + Rescheduling` or use one quota as a substitute for another.
- Define original seat release only in the adopted transfer case, target exclusion/active state/class manual Full, and overcapacity exceptions. Technical default must fail closed until a chosen policy says otherwise; manual Available never alone authorizes bypass.

### D. Can this first final-confirm slice leave financial/credit rules unchanged?

Ask: **“今次確認只處理上課安排，唔新增收費、唔改原Paid同購買額度、唔自動扣或補Remaining；咁樣先做第一版可以嗎？”**

- **Possible bounded option, needs explicit agreement:** Confirm changes only the agreed placement/history/task and seat state; original order/payment/price/purchased quota stays unchanged; no new deduction/refund engine is invented. This is not source proof that all future make-up is free or never consumes credit.
- If the human instead expects eligibility/Confirm to consume remaining visits/minutes, grant a make-up credit after specific attendance, handle expiry or top-up a duration difference, that exact entitlement/accounting rule must be supplied before enabling such mutations. Minutes and Visits stay their original units, not assumed60-minute conversions.
- This bundle also decides which source attendances qualify (unmarked/Present/Late/Absent/Leave/Sick/Other) and whether one original lesson can receive more than one replacement. No blanket “any Paid session always has one free make-up” assumption.

**Further decisions can be deferred by bounding first scope, without hiding them:** cancel/reverse an already confirmed movement, repeated reschedule, target cancellation/teacher leave, parent approval/cutoff, automatic notifications, manual exception audit reasons, Absent task lifecycle. The first flow must clearly reject unsupported reversal rather than perform half a rollback. Pending closure upon a successful agreed arrangement is confirmed; broader Absent closure is not automatically determined.

## 5. Minimal engineering contract after those choices are recorded (proposal)

1. New server-owned exact-session eligibility read resolves the current paid original and authorized actor; returns current source/arrangement/session versions, a revision over **qualified targets and relevant policy**, and narrow target facts. Each target has stable Slot + linked Schedule/sequence/course/topic/cycle identity, date/time/duration/teacher/room, honest capacity facts and specific available/unavailable result. Unknown eligibility is not `true`; unauthorized teacher gets no unrelated student roster/private exclusions.
2. Accordion/date filter consumes that verified source. Selection only changes a local draft; no target hold, original release, Pending closure, attendance or quota mutation before final Confirm. Review shows exact original→target, child and adopted seat/credit effects in plain language. Back/Cancel preserve the exact draft and return origin.
3. Confirm submits only exact original session identity, selected target identity, all relevant source/arrangement/target/policy versions and idempotency key. Server rechecks actual identity/authority, current eligibility/exclusions, duplicate enrollment, target still active, no target drift, and all adopted capacity/credit rules **inside one write transaction**. A fake `eligible:true`, `available:1`, course name or displayed date is never authority.
4. Record an immutable arrangement event/lineage and agreed source/target placement history; do not edit the whole Schedule or mutate every student's occurrence. Source annotations/messages/order snapshots remain attached to their original identity; new placement/history becomes visible in both affected teachers' rosters/timetables and the explicitly linked student calendar. Paid does not replay as another payment/sale.
5. Only a verified exact ACK shows success. The same operation key/payload survives lost/2xx-malformed ACK and restart, creating one placement/target reservation/audit and closing one exact Pending task. Late GET/ACK after identity/navigation/source change cannot resurrect old private UI or stale task counts. Current existing uncertain-retry protections must be preserved.
6. Do not force Pending first: a direct authorized roster arrangement and an already-Pending work continuation should reach the same final engine, with version0 meaning verified no saved pending state. Success closes pending work if present; it does not invent a prior Pending row or auto-close Absent/message tasks.

This is a proposed implementation shape, **not an authorization to implement until Root has chosen the human policy scope**. Final route/table names are engineering decisions; no duplicate alias API is required.

## 6. Reusable tests and concrete new acceptance hooks

Existing must remain green (not rerun by this research):

- `sample/server/tests/student-session-pending.test.mjs`13 cases: exact Paid session, no-op/CAS, current Teacher vs read grant, independent attendance, safe Student calendar, moved assignment, canceled-source history, atomic receipt/audit, concurrency, work pagination and restart.
- `sample/server/tests/student-session-pending-http.test.mjs`2 cases: real HTTP source/role/CSRF/query/replay ordering.
- `sample/tests/pending-arrangement-host.test.mjs`: out-of-window exact work launch, source errors versus known missing rows, immutable lost-ACK recovery, stale work read invalidation, wrong ACK, safe Student marker.
- `sample/tests/shared-lesson-workflow-ui.test.mjs`: supplied verified slot selection/date sorting/unknown/full states; still asserts final target confirmation inert. Replace only that deliberately disabled final-confirm assertion when a real service is introduced; preserve no-fixture/no-wrong-child protections.
- Existing independent `/tmp/beamal-pending-independent-review-20261016.md` and actual full-src harness can seed two same-name students, second occurrence, work origin outside month, old source error and immutable retry. They are historical evidence/hooks, not fresh confirmation of a new final engine.

New outcome cases, driven by the selected human policy:

1. **Exact identity/lineage:** same-name second child, same order containing several sessions; only chosen original maps to the chosen target. Original attendance/remark/sticker/order/message history stays traceable; unrelated child/class/session unaffected.
2. **Qualification:** same course but different topic rejected; same topic/cycle permitted only per configured rule; unknown topic/date/expiry not autoeligible. Explicitly test the four restricted parent categories separately from staff authority, plus excluded exact child.
3. **Version/drift:** original or target moves teacher/date/time/duration/cancels between read/review/Confirm; source/target full/eligibility/exclusion/policy changes; all reject before partial mutation. Teacher revocation after awaited body and before receipt replay reauthorizes.
4. **Last physical seat:** two transactions for the last allowed target capacity cannot both succeed. Source seat is released only after the target succeeds under adopted formula. Trial holds and rescheduling quota changes cannot be counted as the same occupancy unless the human rule explicitly links them.
5. **No duplicate destination:** already enrolled child/target and doubleclick/concurrent same original/different target/operation replay; one final arrangement, no duplicate roster/credit/receipt/audit. Existing original/target history preserved after restart.
6. **Rollback:** force failure after target/placement update but before audit/Pending completion, and converse; all placement/seat/history/task/financial effects commit together or all revert.
7. **Safe bounded finances:** if no financial/credit change chosen, all orders/amounts/Paid/purchased quota/other business rows remain unchanged. If consumption chosen, exact unit-preserving entitlement test is mandatory, not a generic price assertion.
8. **Both-end readback:** source and target teachers/current assignments, Admin and linked child read the agreed new placement; unlinked family/read-grant-only Teacher cannot acquire mutation or private task authority. Old full-source caches/late polls cannot overwrite Confirm's new state.
9. **Real return/UI:** original roster or work task→date accordion→exact slot→review→Back/Cancel retains date filter/selection/raw note/focus/scroll. Confirm busy/IME/Escape, invalid ACK, failed source, same-key retry, 390/768/1280 bilingual footer and no target reservation on cancel. Reopen after success reflects canonical state, not a simulated complete panel.

## 7. What can proceed before answers / what cannot be claimed

Source/target metadata and exact read-only DTO design, real topic/cycle configuration plan, accordion/Review/return layout and authoritative unknown/error states can be prepared without inventing final effects. **An actual eligible target list needs a real chosen eligibility definition.** Final Confirm must remain unavailable while required business rules are unknown; do not call a raw availability list “eligible”, hide this as minor, or claim Pending + disabled button completes make-up.

Research complete; next continuation should obtain the four minimal decision bundles and record the bounded scope, then build and independently test the real final engine. No new implementation or business policy was introduced by this report.
