# Trial submission and request UI — final frozen maker verification

## Scope and boundaries

Six files only: client/public-trial-ui.js, client/public-trial-ui.css, tests/public-trial-ui.test.mjs; new client/trial-requests-ui.js, client/trial-requests-ui.css, tests/trial-requests-ui.test.mjs. No src/controller/SDK/server/staff adapter/people workflow edits. No DB, service, browser, Git, full-suite or build actions. This is maker verification, not independent acceptance or proof of live submission. Root owns integration and real ACK behavior.

Registration minimum-required policy remains unselected by the user. Factory default is policy:null and capability false. No production policy was chosen. Only explicit capability true plus one of name-birth-whatsapp/name-whatsapp/name-contact activates corresponding required validation and Submit. The original12 optional/inert tests remain passing. WhatsApp limit is80 raw characters as agreed with canonical source; strings are retained untrimmed. Name/contact alternatives are explained next to the fields, explicit required birth/WhatsApp have visible * and aria-required.

## Stable public UI API

Exports createPublicTrialDraft({course,slot,today,policy=null}), advancePublicTrial(state,command,values), publicTrialMarkup(state,ctx), publicTrialCanSubmit(state). Factory retains original public snapshot/draft fields and adds policy,busy,uncertain,stale,submitError,submission. No account prefill; only the published trialVisible field was added to the allowed slot snapshot.

- details -> review -> host Submit; pure advance(submit/complete) remains inert.
- publicTrialCanSubmit requires explicit submit capability, valid named policy, valid Review/draft/source identity, !busy,!stale and either ready source or a true uncertain replay.
- Busy locks native fields/all actions; reducer returns same object.
- Uncertain locks Back/draft changes but permits same-payload Submit retry despite the source becoming Full, leaving Close available. Host owns immutable operation key and late-source isolation.
- Back from ordinary stale Review clears stale/error and returns details for a new review; it cannot write.
- Only host-supplied ACK {reference:nonblank string<=100,outcome:received} displays success. It is independent from source becoming Full after the accepted application. No Submit/Edit after success; only Return to timetable/Close. Success says received/will contact, never confirmed seat/Paid/Student/account conversion.
- #public-trial-success tabindex=-1 is the success focus target. #public-trial-submit-error rolealert tabindex=-1 is prewarmed after header/outside body, escaped and hidden when empty. #public-trial-body tabindex=0 is the reading target. Header Close retains aria-label and original icon class.
- Existing data-action public-trial-command and data-command review/back/submit/close/retry remain. No form data-action ancestor trap. Host must include body in Tab trap and block IME/duplicate actions while busy.

## Stable private request UI API

Exports trialRequestsMarkup(model,ctx), trialRequestDialogMarkup(state,ctx), trialHistoryMarkup(model,ctx), advanceTrialRequest(state,command).

List model {ready,loading,error,records,total,page,pageSize,hasMore?,embedded?}; records are canonical exact DTO {id,reference,personId,status:pending|rejected,version,createdAt,updatedAt,rejectedAt,applicant:{10 fields+displayName},slot:{id,courseId,courseName,date,time,duration,teacherNames,roomNames},canReject,events:[{id,type:submitted|rejected,version,createdAt,actor:{id,displayName}}]}. IDs, positive versions, exact real slot date/time/duration, canReject boolean and unique request IDs are checked before rendering action cards. No preview fallback IDs/classes/times.

List emits a section.trial-requests; embedded=true suppresses duplicate heading. data-action trial-request-open data-request-id selects exact record. trial-requests-page/data-page is actual source-page navigation (passed page records are not sliced a second time). trial-requests-retry retries source. hasMore true also emits trial-requests-view-all. Unknown/loading/error and ready[]/total0 differ; errors do not expose raw source diagnostics or stale records.

Detail state {record,ready,loading?,step:details|reject-review,busy,stale,error,sourceError?,readonly,returnToList?,uncertain?}. Full modal .trial-request-dialog, #trial-request-title, #trial-request-body tabindex=0, #trial-request-error alert tabindex=-1 outside body. Commands use data-action trial-request-command and data-command review-rejection/back/reject/close/retry/list. returnToList true adds Back to applications in details/unavailable state. Rejection review is local and states real release consequence; no invented reason field, Confirm/Convert/Complete or task-complete. Final reject is inert in pure reducer; API/ACK belong to Root.

Busy locks every action. Stale blocks rejection and offers Reload while retaining Close. Write errors can retry the exact same record. Uncertain leaves same-operation Reject retry available, locks Back/List and pure state transitions, and keeps Close available; pending source errors cannot replace the verified original request. Authoritative canReject=false/terminal status/readonly history cannot enter rejection review.

History is exact-person read-only; personId mismatch rejects the projection. Known event types get human labels; unknown types remain generic and malformed timestamps are Not provided. Only explicit actor displayName is shown, escaped. No current-course/other-person fallback. Root currently plans person Trial records to open the filtered real queue; this helper does not alter the old people workflow or authorize Teacher full-person access.

## CSS and touch/reading scope

Public CSS adds bounded submission feedback, explicit hidden rule, reading-body/success focus styles, field requirements and received panel. New request CSS styles list cards, true page controls, responsive bounded dialog and Root-owned trial-work-card markup (24px desktop/16px mobile padding, min44px controls, long-name wrapping). Root queue header/body/footer class selectors are included. Both bodies use independent scrolling; mobile lists become one column. No images or unrelated design system changed. No visual or WCAG certification is claimed.

## Evidence

Public initial formal RED12/18 ->18/18 GREEN; final markers/required policy RED18/19 ->19/19 GREEN. New request baseline0/8 RED ->8/8 GREEN; recovery8/9 RED ->9/9 GREEN; uncertain9/10 RED ->10/10 GREEN. Total final targeted29/29.

Logs: /tmp/beamal-public-trial-submit-pure-{red,green}.log; /tmp/beamal-public-trial-submit-required-markers-red.log; /tmp/beamal-trial-requests-pure-{red,first-green,green}.log; /tmp/beamal-trial-requests-recovery-red.log; /tmp/beamal-trial-requests-uncertain-{red,green}.log.

Both JS syntax checks passed. CSS PostCSS parsed57 public rules and72 request rules. All6 files passed scoped whitespace/newline validation without Git. /tmp/beamal-trial-submit-ui-maker-manifest.json records final SHA256s.

## Five-axis maker review

Correctness: named policies, capability/readiness/stale/uncertain/ACK gates, exact IDs, same-name isolation, empty-vs-unknown, pagination and error recovery covered. Simplicity: original public exports/model preserved with one gate helper; request module has local UI transitions only. Architecture: server/API/authorization/idempotency and actual status changes remain host owned, no fake legacy task business mutation used. Privacy: public snapshots whitelist, output escaping, no success rendering of submitted personal fields, private history binds person IDs, unknown diagnostic/action strings not exposed. Performance: no requests/storage/dependencies, list rendering uses supplied server page and explicit pagination/hasMore.

Remaining acceptance belongs to Root/non-maker: actual HTTP Submit/receipt replay, transactional reservation/rejection release, Teacher current assignment and revocation, history/work snapshot same-source updates, navigation/identity/late ACK, actual native keyboard/IME/caret/scroll and three viewport/bilingual GUI. Not proven by these pure tests.
