# Student Session Pending Confirmation — source and implementation map

2026-10-16. Read-only follow-up to `/tmp/beamal-course-timetable-core-next-20261016.md`. No repository, database, service, Git or browser changes; no tests/build were run for this investigation. Trial implementation remains frozen. Current file references below were read afresh, not inferred from older inventory/checkpoints.

## 1. Confirmed effect and bounded first increment

Confirmed sources:

- `docs/schooltracs-rebuild/notion-requirements-source.md:112–118`: exact **Make Up This Class** entry; Pending affects one student and one original lesson, chooses no target, reserves no target, changes no class capacity or other student's state. It produces one teacher task tied to that student + original occurrence, with a continuation shortcut. Arrangement completion later closes that task.
- Same source `:347–351` EX-07 makes that granularity and default priority explicit. `:197–200` leaves deduction, final source/target seat handling, postponement bounds and several related policies unresolved.
- `ULTIMATE-GOAL-PROMPT.md:258–266` keeps attendance, Pending, actual confirmed movement and parent requests distinct. `:271–274` requires real exact tasks/counts and each teacher's own priority order, with Pending Class Arrangements initially first, not forcibly first forever.

One complete safe increment is: existing authorized paid roster row → Make Up This Class → Pending Confirmation review → **save Pending** → same roster readback + one persisted/derived exact pending task → current responsible teacher opens that task and returns to that same person's arrangement view. Cancel/Back do not save. This does not complete target selection, actual rescheduling/confirmation, deduction, refunds, parent submissions, or message delivery.

Do not encode Pending in `attendance`, the whole Schedule/Class status, Order payment status, or a browser-only preview task. The owner is the existing immutable `student_sessions.id`, with existing `student_id + schedule_id + sequence` identity, not name/date matching.

## 2. Existing server anchors

`sample/server/enrollment-orders.mjs` is the smallest integration point:

- `:48–55`: `student_sessions` has stable ID and unique `(student_id,schedule_id,sequence)`; it belongs to an exact canonical person and order. `:67–75` already uses safe additive migration for version/annotation fields.
- `:77–86`: authoritative role lookup, formal Student and reusable enrollment audit writer. Never trust a client `role`, student name or account email.
- `:118–123 currentOccurrence`: resolves current effective occurrence from canonical Schedule + Course, rejects canceled/deleted/unavailable lessons.
- `:125 paidSession`: joins exact session, same student's Paid order and formal Student. This is the correct source prerequisite; pending must not create a Session or treat an unpaid Order as enrolled.
- `:126 canRecordAttendance`, `:132–139 attendanceTarget/authorizeAttendance`: current assigned teacher IDs intersect `accessControl.ownTeacherResourceIds`, or Admin. This assignment check is reusable in meaning, but should be given a neutral helper name rather than treating arrangement as attendance.
- `:127–131 sessionDTO`: current paid roster DTO, independent sourceVersion and session version, annotations and true write capability. Add arrangement facts as a separate nested projection/capability, not a forged attendance value.
- `:140–151 saveAttendance`: existing CAS/sourceVersion, transactional exact row update and audit pattern. Pending must not update attendance/remark/sticker/showRemark or need to choose Present before it can save.
- `:254–260 roster`: authorized scoped read, including explicit read-grant-only Teachers; `canRecordAttendance` is false for those without current responsibility. A new `canSetPending` must preserve that distinction.
- `:241–252 timetable`: Student read follows explicit student-account links and Paid enrollment only; its DTO currently has attendance/version but no pending arrangement. It cannot be used as a Teacher mutation authority.
- `:223 occupied`: counts Paid StudentSession rows, independently of attendance. Pending must leave this count unchanged. `:224–239 confirmPayment` is the sole current order activation/session creation path and is outside this slice.
- `:292 exports`: expose any new methods here if retaining this module as owner.

Other existing seams:

- `server/access-control.mjs:101–105` includes broad **read** grants; `:132–135 ownTeacherResourceIds` is the explicit staff/account identity. Do not use `scopeFor.permits` or `permitsSlot` as a write grant.
- `server/store.mjs` transaction helper uses `BEGIN IMMEDIATE`, nested savepoints and rollback; `mutateOnce` is the correct authenticated exact-key receipt wrapper. Reuse it rather than adding a second authenticated receipt scheme.
- `server/app.mjs:222,305–312` current PATCH attendance route: origin/session/CSRF, strict query, await body, `authorizeAttendance` before cached replay, then `mutateOnce`. A Pending route must repeat that ordering and require the current assignment again in its save method.
- `client/api-client.js:154–157,234`: Student timetable, filter facts, exact lesson roster and recordStudentAttendance SDK methods; add a separate Pending method rather than overloading attendance fields.

## 3. Recommended minimal data and methods (proposal, not implemented)

Prefer a separate `student_session_arrangements` table keyed by `session_id` (FK → existing StudentSession) rather than more attendance columns. It owns only the confirmed **pending** intent in this increment:

```
session_id PRIMARY KEY
status = 'pending'
version > 0
created_at, updated_at
created_by, updated_by -> users
```

One unique row is both the durable arrangement state and the source of one follow-up task. A separate generic To-do row is not necessary and could drift. Existing `enrollment_order_audit_log` can record an action such as `student-session.arrangement.pending` with target exact session ID + arrangement version and minimal snapshot; alternatively a small arrangement audit table can keep history independent. Do not store a second person, duplicate contact profile, target Slot, target hold, new StudentSession or fake completion status.

Suggested methods if owned in enrollment-orders:

- `getArrangement(sessionId,user)` → exact current paid lesson + arrangement state, permission appropriate to the caller.
- `authorizePendingArrangement(sessionId,user)` → current identity/exact paid source/current assignment only; do not fail just because a successfully committed row already exists, because an exact-key lost-ACK retry still needs replay.
- `savePendingArrangement(sessionId,{version,sourceVersion},user)` → repeat authority, then CAS the independent arrangement version/current effective source; no `slotId`, attendance, studentId or status override accepted.
- `pendingArrangementWork(user,{since,...bounded paging})` → genuine total and exact task identities from persisted rows, scoped to current responsibility. Do not limit task existence to the current month or the Teacher home 35-day window.

Proposed API: `GET /api/student-sessions/:id/arrangement` and `PATCH /api/student-sessions/:id/pending-arrangement` with `{version,sourceVersion}` only, authenticated and no query on exact endpoints. A command-specific route makes it impossible to smuggle in a target confirmation. Root may choose equivalent naming; do not implement both aliases unnecessarily.

Proposed canonical arrangement DTO:

```
{
 sessionId, studentId, scheduleId, sequence, courseId,
 date, time, duration, sourceVersion,
 status: 'pending' | null,
 version: positive saved version | 0,
 createdAt, updatedAt,
 canSetPending
}
```

Version 0 + null status means the server has **actually checked** that this authorized session has no arrangement record. Missing fields from an older/unavailable response remain unknown; do not interpret them as a policy decision that no make-up is needed. Roster can carry a nested `{status,version,...}` arrangement projection; keep attendance `version` and sourceVersion semantics intact.

Repeated save must never produce a second task. Recommended technical behavior: an exact idempotency-key replay returns the accepted result; a different key with stale base version conflicts; re-saving an already-pending state with its actual current version can be a harmless no-op with no second transition/audit/task. This is a proposed deduplication contract for Root to fix explicitly, not a cancellation/reopening policy. No Cancel Pending, Complete Task, auto-expiry, reopen-after-completion or confirmed-target state is added here.

Keep the arrangement version independent from attendance version: changing a Remark or marking attendance should not silently close the arrangement or make attendance editors conflict solely because a task was created. `sourceVersion` still protects against a moved/reassigned/canceled source between Review and Save.

## 4. Roles and safe projection

**Admin:** can create Pending on an active exact Paid StudentSession; can read all existing pending records. Existing records remain recorded if their source is later canceled/withdrawn; do not silently delete them or close their task. A source-unavailable record needs a truthful unavailable/read-only explanation, with no invented cleanup action until cancellation/history rules are agreed.

**Current responsible Teacher:** may save on their current effective occurrence, using explicit ownTeacherResourceIds. A course/room/occurrence read grant alone is insufficient. Reassignment transfers work visibility based on canonical responsibility rather than the original actor or a saved name. A former teacher loses the private task and mutation rights before any cached replay. Whether an existing canceled source's still-resolvable assigned Teacher sees a read-only history task can be fixed separately; when assignment cannot be resolved, fail closed for Teacher and preserve Admin visibility.

**Read-grant-only Teacher:** existing roster read can show a safe Pending status with `canSetPending:false` if retained in the same roster projection; do not supply an actionable private task or silently enable Save because the class can be viewed. If the exact detail endpoint is restricted to responsible staff, make that distinction clear in the UI.

**Student/parent account:** cannot call staff Pending mutation or staff work APIs. A future parent Request Rescheduling/Sick Leave is a different request and approval process; it must not be aliased to staff Pending. For consistent readback, the existing owned Student timetable may expose only a safe arrangement status/version for that linked child's exact paid session (no actor, audit, teacher private note, recipient list or other student's state), if Root includes Student visibility in this increment. Student write remains forbidden. No family identity is inferred from names/contact matches.

The save transaction changes only arrangement row + audit/receipt. Paid order, source/target seats, Class Full, availability reservations, Trial counts, attendance, annotations, purchase quantity and remaining-balance data must remain byte-for-byte unchanged.

## 5. Existing client and host seams — important missing continuation adapter

`client/shared-lesson-context.js:13–42 resolveSharedLessonContext` already joins one exact authorized paid roster row with Schedule/sequence/course and whitelists facts. It currently returns only attendance write capability and `availability:{ready:false,slots:[]}`. Extend it with verified arrangement state/version/canSetPending; never synthesize eligibility or fixtures.

`client/shared-lesson-workflow-ui.js`:

- `:45–71` is presentation-only. `pending` at line 62 only changes draft to review and clears target ID.
- `:118–131` already renders the date Accordion, explicit unavailable availability and Pending review. Pending may be chosen even when no eligible Slot source exists, because it does not select/reserve a destination.
- `:137–147` permits real Save only for attendance; arrangement final-confirm remains disabled. Add a **separate pending capability**; enable final Save only for view arrange + exact pending draft + verified source/capability/version. Selected-target confirmation remains disabled. Prefer the final label “Save pending arrangement” rather than implying a new lesson has been confirmed.

`client/interface-preview.js`:

- `:113–142 sync/open/refreshSharedLesson` preserves identity, exact session and return ticket. Staleness currently only covers attendance. Add independent Pending base/version/source handling without losing drafts or remounting an unchanged poll.
- `:144–183 advance/saveSharedAttendance` gives a useful ticket/job, busy, same-key, uncertain-ACK and result-validation pattern. Add a distinct save callback for Pending. Never call attendance save with a fake `pending` status. The generic `save` dispatcher currently routes only to attendance, so updating the renderer alone will leave a dead button.
- A result must match exact session/student/schedule/sequence/source and accepted arrangement version before success. A background poll seeing Pending is not proof that this particular Save ACK succeeded.

`src.js`:

- `:1234–1253 sharedLessonSnapshot/resolveSharedLessonForUi` is the canonical host resolver and return-ticket owner.
- `:1255–1257 closeSharedLessonForUi` restores the exact parent roster/context/focus/scroll, currently from an existing timetable/course lesson origin.
- `:1259–1274 saveSharedAttendanceForUi` shows generation/job/source checks and exact row cache merge; add a parallel Pending callback, refresh only relevant roster/owned timetable/task source and validate its ACK.
- `:1365 refreshLessonStudents` and `:1372` five-second polling must refresh Pending facts without replacing an active child draft, stealing focus, or reopening a closed dialog.
- `:2437–2461` exact roster row and openTimetableLesson are the current natural starting point.

**Major integration gap:** `openSharedLesson('arrange',{sessionId})` currently needs an already selected `timetableLessonRecord` and ready exact roster, as shown by `src.js:1245–1251`. A Teacher homepage task cannot call it directly and expect a valid source. A genuine task continuation adapter must resolve the exact persisted session to **current** scheduleId/sequence/date, load its authorized lesson/window/roster, then open arrange for that same session. If moved, use current canonical date with immutable sequence, not the task's historical date as identity. Do not borrow the first cached class/student or demand that the task already falls inside the visible calendar window/filter.

Capture a task-origin return context (current work page/category, task ID, scroll/focus and identity). Cancel must return to the original task/roster context; route/back/identity changes must invalidate the old ticket. The current timetable-only origin helper is reusable for roster entry but does not itself cover a Work-origin continuation. Test both entry paths separately.

## 6. Work integration with the newly frozen Trial slice

Trial is now a separate real source: `server/trial-applications.mjs:129–138 workSnapshot` derives pending Trial requests and recorded events; `src.js:928–945` loads/renders it, and `staff-portal-ui.js:77` currently delegates the otherwise unsupported shared To-do area to `ctx.trialWork`.

Do not put StudentSession Pending rows into `trial_applications`, relabel a Trial task as arrangement, or overwrite the whole work area with only the new group. Add a small aggregation/host adapter so arrangements and Trial work remain distinct typed groups with accurate separate counts and exact action payloads. A pending task identity can be `student-session-arrangement:<sessionId>`; its source is the single arrangement row, so two users' retries cannot duplicate it.

The older generic `staff-shared-adapter.js:61` still clears `todos/todosReady`, and the generic local task-complete reducer is preview-only. Do not reuse it as persistence. Preserve Goal's initial arrangements-first ordering and each teacher's own saved priority semantics; durable per-teacher priority storage is a separate gap if this slice does not implement it. Do not claim the entire To-do system completed just because Trial and Pending groups are wired.

## 7. Acceptance plan for implementation (not run in this read-only task)

1. Active Paid exact session: Save pending creates one arrangement/version/audit + one derived task; same roster and other authorized view read the same row after restart. Other session/Student/class/order/seat/balance/attendance tables unchanged.
2. Double click, concurrent Admin/Teacher, same-key lost ACK and restart replay cannot duplicate row/task/audit; same key changed payload conflicts. Semantic already-pending behavior follows the explicitly fixed contract.
3. Current responsible Teacher/Admin allowed; read-grant-only, unrelated Teacher, Student, anonymous and forged actor forbidden. Reassignment/revocation during body await and before replay cannot return an old private accepted response.
4. Wrong exact session/student/sequence, unpaid source, canceled/deleted course/occurrence and stale sourceVersion fail before mutation. Source moves retain one arrangement keyed to the same stable StudentSession; current continuation resolves the new date. Existing invalid-source records are not silently deleted/closed.
5. Attendance-only/annotation-only saves preserve Pending; Pending save preserves attendance/version/remark/sticker/showRemark. All Class/Trial/rescheduling occupancy and Full flags are unchanged. No target ID or hold is created.
6. UI: roster → arrange → pending review → save → same parent row; Review/Back/Cancel preserve context and perform no write. Selected target still cannot perform final confirmation.
7. UI: Teacher homepage task for a session outside the visible calendar month/filter → exact current lesson → same student's arrange → Cancel back to work task. Same names/different IDs, same original order/multiple sessions and moved immutable occurrences stay distinct.
8. Native FormData, keyboard, IME if any new input, sticky footer, source loading/error, stale source, busy and uncertain ACK; unchanged polls do not remount, changed source keeps lawful draft but blocks stale Save; late reply after account/route switch does not reopen or toast success.
9. If Student status is included, only explicitly linked owned child/lesson can see safe pending state; sibling/other family isolation and no internal audit/contact/actor leakage. No parent mutation or fake Request approval is added.

## 8. Policies explicitly not decided by this slice

Target Slot qualification/topic/cycle/date window, parent self-selection restrictions, cutoff/approval rules, deduction/refund/expiry, original/target seat transfer formula, overcapacity exceptions, automatic messages, Pending maximum age, cancel/reopen/history transitions, attendance correction's relation to follow-up closure, and final target Confirm behavior remain unresolved. Preserve their future entry/continuation context; do not choose defaults or remove the requirement. Showing a task or saving pending does not prove full make-up/rescheduling functionality.

No source change or implementation has been made by this report.
