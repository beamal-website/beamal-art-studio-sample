# Independent review: exact student-session attendance save (2026-10-16)

Scope: current `interface-preview.js` controller, actual `src.js` callback and private return ticket, actual SDK, read-only `app.mjs` route review. Only `/tmp` files written; no repository, browser, database, service, Git, full tests, or build operations.

## Evidence

- `/tmp/beamal-attendance-independent-20261016.mjs`: independent outcome assertions; imports actual production controller/SDK and evaluates current `src.js` via the existing VM fixture adapter with formal tests suppressed. Transport responses are controlled in memory. This is not real GUI, HTTP server, SQLite, or cross-client proof.
- `/tmp/beamal-attendance-independent-20261016-final.log`: 8/8 actual src/controller cases green.
- `/tmp/beamal-attendance-independent-20261016-sdk-drift.log`: above eight plus two actual SDK cases green; one further source-drift recovery message case red (10/11).
- Initial harness-only errors retained: old expected heading `Review attendance` was inaccurate (production review uses `Attendance & remarks` plus Back/Save); annotation-only fixture originally reused an already chosen Absent draft, correctly retained by Back. Corrected tests use actual rendered action contract and a fresh annotation-only form. Neither is reported as a product failure.

## Passing results

1. Save targets exact second same-name student session; payload contains original versions and raw remark, no fixture person. Parent returns to same Course, month and student roster. Other student's row stays unchanged; no order mutation.
2. Busy saves make one request despite a second trigger; navigation then late ACK neither toasts success nor resurrects old private context.
3. Lost HTTP 200 malformed ACK followed by actual roster poll of committed version 2 can retry identical original payload/version/key and return once.
4. Teacher self-mapping/access revision revocation clears private ticket and roster cache; late ACK ignored.
5. Wrong-person ACK cannot update target cache or toast success.
6. Definite server 409 retains typed content and blocks another unsafe save.
7. Source version change during flight cannot apply old ACK or claim success.
8. Fresh annotation-only input sends no `attendance` field; canonical `unmarked` stays unmarked, never auto-Present.
9. Actual SDK encodes exact session ID and keeps raw body, CSRF, credentials, stable idempotency key across malformed 200 ACK/retry.
10. Actual SDK drops late attendance ACK after same-user access revision change with `AUTH_SUPERSEDED`.

## One concrete recovery-message defect (P2 UX, data guards work)

`src.js:1178` combines a definite canonical source-version mismatch with malformed/wrong ACK into a generic Error. `interface-preview.js:181` treats that status-less error as uncertain network failure and prints “Could not save…please retry.” The refreshed canonical capability is false because roster.sourceVersion remains 1 while schedule.version is 2, so the final action becomes disabled and the renderer also states “Saving is not available yet.” The user cannot follow the retry instruction and has no explicit changed/reopen instruction.

Reproduction: open source version 1, review; start save; while pending refresh the same occurrence with source version 2 (same date/tuple); return exact old version-1 successful ACK. Assertions prove no success toast and only one transport call even after repeated forged Save; assertion requiring “changed/reopen” fails. This is not duplicate business writes or a claimed data leak. Recommendation: classify the *definite current canonical source-version mismatch* as changed/stale (409-style message); keep generic malformed/wrong ACK uncertainty separate.

## Server read-only audit

`app.mjs:265–272`: PATCH only, authenticated mutation and role admin/teacher, decode exact session, reject unexpected query, await body, then reauthorize current responsible teacher before `mutateOnce` replay. Operation identity includes actor, exact route/session ID, key and body hash. Current `enrollment-orders.mjs` independently checks actual actor role and current responsible resource before exact paid session CAS/source version update. No endpoint test/DB run claimed here; maker's HTTP/DB evidence remains separate.

## Deliberate limits

No evidence here of actual visual alignment/mobile rendering, network/server runtime, persistence/restart, multi-client synchronisation, deduction/remaining/seat release/Absent follow-up. Those must not be inferred from the above passes.

## Retest after Root's source-drift correction

Root separated definite canonical version mismatch at `src.js:1178`, throwing status 409 / `SOURCE_VERSION_CONFLICT`, while wrong/malformed ACK remains generic at the next line. The original 11 independent outcome assertions were rerun unchanged (except the earlier test title/comment was corrected to accurately describe the proven message issue, not an unproven infinite transport retry). Result **11/11 GREEN**:
`/tmp/beamal-attendance-independent-20261016-after-source-fix.log`.

The single proven recovery-message finding is fixed at controller/host contract level. The pure renderer's additional “Saving is not available yet” wording when stale+save capability false was still separately assigned to its owner at this retest; do not infer that visual string's final polish from my generic changed/reopen assertion. No further blocking finding within this tested scope.

## Final small teacher-home capacity-read review

Read-only review of the newly added `teacher-home` branch at `src.js:722`: **no blocking finding**. It adds the existing read path only, with existing admin/teacher/authenticated-account guards. `classStatusQuery()` uses the same `teacherScheduleWindow()` as teacher schedules: local today through +34 days, **35 inclusive days**. Server `validateClassStatusQuery()` accepts inclusive ranges up to 366 days, so this range is valid. Pure validation was executed for ordinary cross-month, cross-year and leap-February 35-day windows: `2026-10-14..2026-11-17`, `2026-12-20..2027-01-23`, `2028-02-10..2028-03-15`, all accepted; no DB was instantiated.

Server list is still role-checked and filtered per occurrence with `scope.permits(occurrence)` (`class-capacity-status.mjs:62–75`); the query/revision includes range and scope. This does not grant manual changes: both UI editor entry/save (`src.js:756,763`) and HTTP PATCH (`app.mjs:347–348`) retain admin-only checks, while Student remains rejected. Read response application retains generation/range/current-view checks (`src.js:751`) and identity reset still clears status cache (`src.js:727`).

Latest pure renderer now suppresses “Saving is not available yet” for stale attendance (`shared-lesson-workflow-ui.js:144`); the changed/reopen instruction remains explicit. Original fixed 11 cases rerun against latest production source again: **11/11 GREEN**, `/tmp/beamal-attendance-independent-20261016-current-final.log`. No further full-suite/build/GUI/database run performed by this reviewer.
