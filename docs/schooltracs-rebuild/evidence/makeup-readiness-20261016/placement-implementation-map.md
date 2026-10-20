# TC Make Up — current code and atomic occupancy integration map

2026-10-16. Read-only repository investigation. No policy/source-document research repeated, no repository/DB/service/browser/Git writes and no tests executed. Human decisions about move vs supplementary class, eligibility/topic/window and shared capacity remain pending. The designs below are conditional implementation proposals, not approved business rules.

## 1. Main conclusion
There is currently **no per-student lesson override/move implementation**. `student_sessions` fixes a paid student's schedule_id + sequence; every roster, Student timetable, attendance authority and paid-seat count resolves that original pair. Existing schedule exceptions move **the whole occurrence for all students**, not one StudentSession. Reusing editOccurrence for Make Up would therefore move the class rather than the selected child.

There are also **two independent occupancy ledgers**: paid formal StudentSessions and available-slot Trial/rescheduling holds. `totalReserved` is explicitly null. If the human chooses one shared physical total, implementing only a new Make Up check is insufficient: formal payment and Trial booking must join the same atomic admission rule.

## 2. Exact current source map
| Responsibility | Current pointer | Consequence for one-child move |
|---|---|---|
| Paid session identity/schema | `sample/server/enrollment-orders.mjs:48–55` | PK id and UNIQUE(student_id,schedule_id,sequence); row contains original attendance/order relation. No target/override table. |
| Resolve active class occurrence | `enrollment-orders.mjs:122–129` `currentOccurrence` / `paidSession` | Entire active schedule occurrence, current Course and paid order; no per-student effective destination. |
| Session DTO and write responsibility | `enrollment-orders.mjs:135–140,206–214` | scheduleId/sequence come from original session; responsible Teacher uses actual current ownTeacherResourceIds, not a read grant. |
| Attendance and annotations | `enrollment-orders.mjs:223–234` `saveAttendance` | session_version CAS + occurrence version, original session scalar attendance/remark/sticker. No second-attendance/attempt record. |
| Pending source and task | `enrollment-orders.mjs:142–205` | One PK(session_id) pending record; status schema currently only pending. Source snapshot is display/history, never authority. Does not reserve, move, release or complete. |
| Formal order immutable snapshot | `enrollment-orders.mjs:255–281` | Order item records original course/fee/pricing/lesson identity/date snapshot. Must not rewrite the paid commercial snapshot to fake a new purchase. |
| Teacher order read | `enrollment-orders.mjs:236–253` `canRead` | Requires read scope for **every original item/lesson**. Receiving Teacher at destination does not automatically gain full old multi-lesson order access. |
| Formal occupied and payment | `enrollment-orders.mjs:306–322` | Direct paid SQL count by original pair; manual Full or schedule capacity blocks payment; inserts one new paid session per lesson. No Trial/MakeUp hold join. |
| Student timetable | `enrollment-orders.mjs:324–337` | Explicit account link -> paid sessions -> original occurrence -> requested date window. Moving only a UI card/extra table will not affect this query. |
| Staff roster | `enrollment-orders.mjs:338–345` | WHERE original schedule_id + sequence; no incoming/outgoing/replaced view. Original row remains in old roster unless query is deliberately made effective-aware. |
| Timetable student chips/remarks | `enrollment-orders.mjs:346–374` `filterFacts` | Bounded authorized occurrence identities, original pair joins, dedup person per class. Must move chips and showRemark/sticker consistently with effective identity. |
| Parent message context | `enrollment-orders.mjs:214–222` | Reuses attendanceTarget and original source. Must invalidate prior review and use approved effective occurrence after a real move. |
| Existing sent App messages | `sample/server/lesson-parent-messages.mjs:40–53` | Historical immutable snapshots plus current explicit recipient link. Do not rewrite old sent lesson date/body or recipient when moving. |

## 3. Actual capacity and reservation paths
1. **Formal seats:** `enrollment-orders.mjs:306` counts StudentSessions joined to paid orders. `confirmPayment:307–322` checks duplicate child/occurrence at315, manual Full plus `occupied >= occurrence.capacity` at316–317, then inserts all sessions/sale/state within one transaction. The existing UNIQUE constraint is for original pairs only.
2. **Class status:** `sample/server/class-capacity-status.mjs:22–26,54` derives automatic Full from that same paid count; manual Full/Available has display precedence. Hook is `sample/server/store.mjs:411` `setOccupancySource(enrollmentOrders.occupied)`. A manual Available display does not remove the hard numeric check in confirmPayment.
3. **Slot holds:** `sample/server/available-slots.mjs:43–46` has kind trial/rescheduling, state held/released, exact source_identity. `context:54–56` reads held rows; `project:58–71` counts Trial and rescheduling separately. `totalCapacity` is stored but **totalReserved:null** and no combined formal+Trial+rescheduling admission rule exists.
4. **Actual Trial admission:** `available-slots.mjs:117–127` `reservePublicTrial` checks published/active/source available, Trial enabled/remaining and exact publicDetail revision + membership, inserts one held Trial reservation. It does not currently enforce formal manual/class Full or totalCapacity. That is existing independent-axis behavior, not permission to silently change it before the pending policy answer.
5. **Trial release:** `available-slots.mjs:129–134` exact held reservation id/slot/kind/source_identity -> released. `sample/server/trial-applications.mjs:117–127` performs release + request version/state/event atomically. Reuse the same reservation ledger pattern, not its Trial kind or applicant side effects.
6. **No rescheduling reservation helper is exported:** only reservePublicTrial/releaseTrialReservation at `available-slots.mjs:135`. Schema can hold rescheduling and UI can count it, but no production MakeUp reservation/consumption function currently creates it. Add a narrow rescheduling helper after policy, not a second unrelated seat counter.
7. **Source changes with holds:** `available-slots.mjs:22,65,88–92` fingerprints exact course/date/time/duration/teachers/rooms/linked identity; mismatched old hold makes HELD_SOURCE_CHANGED. Source-disabling/capacity-lowering update is guarded when held. New MakeUp must use this source protection and explicit old reservation release, not silently delete hold history.
8. **Linked aliases:** available_slots has no UNIQUE(scheduleId,sequence) index (source linkage is inside JSON). Two Slot records may reference the same formal occurrence. Physical class capacity must be counted by exact formal occurrence across aliases if shared-capacity policy is chosen; never merge by same date/time/course name. Whether reschedulingCapacity itself is per configured Slot or shared needs explicit policy.
9. **Eligibility fields are not a complete rule engine:** excludedStudentIds is validated/stored at `available-slots.mjs:33,83`; there is no MakeUp eligibility evaluator using it today. ClassType's studentReschedulingAllowed is a source fact, not by itself proof of approved topic/date/duration/business eligibility. Do not infer approval from an old preview's available>0.

## 4. Minimal implementation seams after human decision
### If the decision is a same-StudentSession move
Prefer retaining stable StudentSession id and original paid order/source identity, with a separately versioned placement/move record + immutable event snapshots. Add one **canonical effectiveStudentSession resolver** in enrollment-orders (or an extracted internal module) and use it everywhere listed above. Do not scatter conditional target IDs across six SQL queries.

- Original student_sessions row remains the paid entitlement/history anchor. Its original schedule/sequence/order are not overwritten casually; original occurrence can show a historical outgoing marker without consuming an active seat.
- Effective destination identity is explicit target scheduleId + sequence from a valid linked formal Slot, not a free typed time, not the whole schedule exception and not the first matching Course.
- Destination roster and Student timetable use effective placement; source roster history uses explicit outgoing/history projection. Distinguish original/order identity from current teaching occurrence in DTOs.
- Attendance is currently one scalar per StudentSession. **Do not guess whether old Absent/remark is carried, reset or duplicated as new Present/Unmarked.** Preserve original history snapshots and obtain/record the selected lifecycle contract before giving the new occurrence an attendance value.
- Existing original UNIQUE(student,original schedule,sequence) does not stop two different source entitlements being moved into the same effective target. Add a transactional effective-identity duplicate check and an appropriate DB-enforced active-placement uniqueness mechanism; also make later confirmPayment honor effective occupancy/duplicates.

### If the decision is a supplementary class
An additional attendance/placement/entitlement child linked to the original paid session is needed; do not falsely replace the original or create a new paid order/sale. Its accounting/attendance/capacity/pending completion meaning is a separate lifecycle contract. The conditional same-session overlay is not sufficient to claim this behavior.

### Small module/file ownership plan
- `sample/server/enrollment-orders.mjs`: canonical effective paid-session source, roster/timetable/filterFacts/attendance/Pending/context projections, duplicate and occupied integration. Preserve paid order snapshot and existing sales/audit semantics.
- `sample/server/available-slots.mjs`: exact internal rescheduling-target resolver + reserve/release helper and, **only if approved**, one combined admission fact/gate used by Trial and formal paths too.
- Optional NEW `sample/server/student-session-makeups.mjs`: immutable move/attempt/event schema, CAS operation orchestration; inject authoritative resolvers rather than duplicating authorization/seat SQL. Avoid circular occupancy callbacks: raw placement/seat read must not call availableSlots.project -> classStatus.project -> occupied recursively.
- `sample/server/store.mjs`: additive init and one shared occupancy/admission wiring; existing transaction helper and receipt reused.
- `sample/server/app.mjs` / `sample/client/api-client.js`: narrow exact context/targets/save API, current authorization after awaited body and before replay, then fresh source/CAS inside mutation.
- Frontend `sample/src.js` + lesson arrangement UI: use current sharedLessonReturn ticket/exact session route; Root integration owns these. New target form must not bypass source when returning from Work.
- `sample/client/student-lesson-order-origin.js:39–48`: current matcher requires current lesson's scheduleId/sequence to occur in original paid Order items. A true per-child move to another formal occurrence will make View order fail unless DTO/matcher carries a separately verified **original order lesson identity**. Do not edit the order to make this assertion pass or weaken to course/name matching.

## 5. Both teachers and access
- Staff read grants (`sample/server/access-control.mjs:103–105`) are broader than assigned-teacher write authority. Continue exact current responsibility for mutation; listing a destination must not grant management of arbitrary people or other lessons.
- Existing roster only exposes current selected occurrence and existing Pending work follows original canonical responsibility. A moved placement needs explicit source-history visibility for the original Teacher and live destination roster visibility for the receiving Teacher. A snapshot alone cannot authorize the original teacher forever after reassignment.
- Decide original vs destination Teacher's post-move permissions for attendance/contact/undo separately; do not implement an unrestricted union of historical teachers. Do not grant the destination Teacher the entire original multi-lesson paid Order merely because one child is received.
- A source canceled/deleted mid-review must keep history and fail write; Pending already has the read-only Admin snapshot pattern `enrollment-orders.mjs:143–175`. Do not delete the task/history as an accidental side effect. Whether successful MakeUp resolves Pending awaits lifecycle contract; table currently permits only pending.

## 6. Atomic save / last-seat minimum contract
After the policy answers, a small fresh operation needs: exact sessionId + current session/placement/arrangement versions; exact source schedule/sequence/version; exact target Slot id/version/source identity and effective target schedule/sequence; current actor identity and required source/target scope. A single server-generated review revision can wrap these facts, but must be regenerated/checked under write lock.

Required sequence in one `BEGIN IMMEDIATE` outer transaction (`sample/server/store.mjs:106–115`):
1. Fresh paid session/current responsibility and candidate eligibility; reject stale source/target/manual status/visibility as required by approved rules.
2. Compare session/placement/target revisions and duplicate effective child occurrence.
3. Count all relevant **approved** occupancy categories from shared committed rows; check target last place and rescheduling quota. If capacities unknown, do not coerce unknown to zero or unlimited.
4. Atomically record move/attempt + exact rescheduling hold, source-seat release/effective projection change, immutable event/audit, and idempotent response. If any step fails, everything rolls back. Retrying the committed same payload/key must not reserve twice or release twice.
5. Current authority must be checked before `mutateOnce` cached replay (`store.mjs:345–355`) because callback is skipped on replay. Do not compare a revision that the successful operation necessarily increments before exact receipt replay; separate current-authority checks from fresh CAS, as in existing Pending/Attendance pattern.

The current transaction helper uses BEGIN IMMEDIATE for outer writes and savepoints for nested helpers, so new raw DB reads/writes can participate atomically without async awaits. Do not reserve/commit in one helper and then start a separate move transaction.

## 7. Meaningful required regressions once authorized (not run here)
- Two separate SQLite connections/worker threads compete for one rescheduling/physical last seat: exactly one move commits, one409; one event/hold, no partial original-seat release. Current Worker patterns: `server/tests/trial-applications.test.mjs:168–180`, `student-session-pending.test.mjs:132–143`.
- New MakeUp vs existing confirmPayment and vs reservePublicTrial compete for one shared last seat **if** shared-total policy chosen; cross-Slot aliases of same formal occurrence included.
- Original and target same-time same-name different IDs remain distinct; same child already target-entitled/moved duplicate blocked; one sibling/other child's row unchanged.
- Source/target canceled, reassigned, archived, made Full, version changed while review/body pending -> no write/no old receipt privacy leak.
- Source roster history, target roster live row, Student timetable effective date/window, class chips, class status/availability revisions and original View order all agree; no duplicate display/count.
- Original attendance/remark/sticker/order/pricing/audit snapshots retained according to explicitly approved lifecycle; no automatic new Paid/sale, deduction or fabricated completion.
- Audit/hold/receipt failure fully rolls back; lost ACK exact key once; changed payload409; restart preserves move + both histories; current role/link revocation suppresses old private return.
- Original Teacher, target Teacher, read-granted unrelated Teacher, Admin and linked Student have exactly the approved read/write projections. No private annotation or recipient/contact leak in public/Student safe DTOs.

## 8. Evidence limits
This is fresh static code mapping only, not execution or GUI verification. Existing tests are reusable patterns, not proof that MakeUp exists or passes. No changes or policy defaults were implemented. Human's three pending decisions remain the go/no-go gate for policy-dependent writes.
