# Make Up This Class — slot-source UI independent review

2026-10-16. **PASS for this bounded pure UI/reducer change, 9 independent semantic cases / 9 pass / 0 fail or skip.** No unresolved finding. This is not a final-target business integration or a completed Make Up This Class claim.

## Evidence and scope

- Script `/tmp/beamal-makeup-slot-states-independent-20261016.mjs`; log `/tmp/beamal-makeup-slot-states-independent-20261016.log`, 119.68ms.
- Tests import the actual `sharedLessonWorkflowMarkup` and `advanceSharedLessonWorkflow` after worker freeze. They do not use producer private helper functions as the expected-result oracle.
- Producer reports50 formal module cases; these are separate and not counted in my independent9.
- No repository, Git, browser, service or database changed; only `/tmp` artifacts. No full tests/build or benchmark run by me.

## Independent outcomes

1. Source unknown, explicit error, loading, policy-unconfirmed and verified ready-empty render distinct truthful states. Loading supersedes an older error; private upstream error text is never echoed. Neither error nor unknown becomes No eligible slots.
2. Malformed ready sources fail closed for the entire collection: null/non-array, duplicate IDs, one malformed date/time/duration/ID/available count/eligibility mixed with a valid candidate all render source error and provide no selectable partial list. Reducer cannot select the otherwise valid row from a rejected collection. Input state remains unchanged.
3. Known available0 displays Full; missing/null count displays unavailable. All remain unselectable. Legitimate eligible:false-only source is a known empty eligible result, distinct from malformed source.
4. Controlled valid candidate data sorts dates/times correctly. Selection/Review has one **Original lesson** heading and one **Selected replacement** heading, correct original second student/session plus separate exact old/new dates/course/teacher. Chinese labels correct. Back preserves selection. These are synthetic controlled source facts, not live eligibility.
5. Query/Retry read buttons are absent unless capability is literally true, and are typebutton. Busy/uncertain/stale/loading/invalid-date states disable them. Pure read commands are inert and cannot manufacture candidate facts or perform a network request. Current live resolver supplies no such capability/hook and still has unknown availability, so no dead enabled buttons are claimed as working.
6. Final-confirm stays disabled/inert even with forged save/confirm capability fields and forged canonical/student/target fields. No saved/success/complete panel is produced by these commands.
7. Candidate-source error does not block the separately authorized exact Pending review/saved/continue presentation. It does not change original lesson/student attendance/remark/sticker, select a target or invent a reservation.
8. Stale arrangement state freezes date/selection changes while Back preserves the original draft. Student details remain read-only. All six existing attendance choices and raw remark/sticker/showRemark review remain usable independently of unrelated target-source errors. This is pure UI preservation, not a re-test of attendance/Pending HTTP persistence this round.
9. Unsafe candidate IDs/names and original person text are escaped. Unknown availability does not show supplied unverified candidate details or fake any amount/place count.

## Source boundary

Human final-arrangement policies are still unanswered. `/tmp/beamal-makeup-final-source-contract-20261016.md` remains the source/decision contract: same-topic/cycle qualifications, original/target seats, credit/expiry/history and ordinary Teacher final authority must not be invented. No final movement endpoint or eligibility source was introduced here.

Static current source check: `sample/client/shared-lesson-context.js` still returns `availability:{ready:false,slots:[]}`; no `loadArrangementSlots`/query/reload handler is connected in the current host/src. The new pure controls are a future explicitly supplied capability surface; only actual future host integration can make them functional. Current live UI may demonstrate honest unknown-source/date/Pending only. A controlled candidate gallery is not real scheduling or an eligible-slots service.

Root owns actual 390/768/1280 GUI and final full tests/build; I have not performed or reviewed that new GUI evidence yet. This report does not claim backend confirmation, target holds, occupancy transfer, credit calculation, task completion or two-end synchronization.

## Verified files / fingerprints

- `sample/client/shared-lesson-workflow-ui.js`: `6bfe4f959d99d6dd0192c72501ad2d8c6632a383c161eccb2c6f0871e6443831`
- `sample/client/shared-lesson-workflow-ui.css`: `05b5f16b69484d9213691bd24bc901f80782922f21f938628085687c7052110b`
- Live resolver `sample/client/shared-lesson-context.js`: `85e317c4da5e671112e8db981875a54dcff27cdb57f2cc0d78c9c1f4698f44af`
- Current host `sample/client/interface-preview.js`: `bb4894d1192d1173b507a93e9e5b34f74dd539bd80346c5e6ccda1c5aab4e238`
