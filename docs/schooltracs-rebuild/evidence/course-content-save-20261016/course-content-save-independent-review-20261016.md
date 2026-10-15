# Course content save — independent UI / SDK / app review
2026-10-16. Final result: **10/10 independent outcome cases PASS; no remaining blocker found in this bounded review**.

- Script: `/tmp/beamal-course-content-save-independent.mjs`
- Final log: `/tmp/beamal-course-content-save-independent-final.log`
- Initial and intermediate evidence retained: `/tmp/beamal-course-content-save-independent-initial.log`, `/tmp/beamal-course-content-save-independent.log`.
- No project/DB/browser/Git edits; no server started; no full suite/build. Only /tmp files written.

## Two real findings, fixed by Root and independently rechecked
1. **Lost successful HTTP response body prevented recovery.** SDK converts a failed response.json on HTTP200 into ApiError(status200,service_unavailable). Host previously marked only status0 errors unconfirmed; polling then observed the saved version and latched stale, so the original keyed retry never reached the wire. Independent case9 originally saw1request instead of2. Root now includes unreadable2xx ACK in uncertainty (`src.js:1359`), and the same assertion passes: second request has identical body/key, cached ACK can be adopted. This test uses the actual SDK fetch/JSON error path, not a hand-made status200 host error.
2. **Source-only save conflict focused a hidden empty error.** When current course changed immediately before Save, no field/general validation error existed; renderer nevertheless focused #course-content-error, whose actual markup was hidden. Independent case10 checked the focused element against its actual generated opening tag and failed on hidden. Root now chooses the visible source warning if there is no general error (`src.js:1332`). Original visibility assertion passes.

## Independent proven client outcomes
Tests execute **current full src.js** in the existing VM/DOM boundary with actual rendered fields/forms and the actual document focusout/submit handlers. This is stronger than a pure renderer test but remains simulated DOM, not browser GUI.

1. Raw native textarea value (including whitespace/newline/<&>) captured through actual focusout and FormData; save sends exact Course B/version/four content leaves, no pricing fields; ACK returns to original entry focus and recorded list/window/table context.
2. Pending native submit suppresses second submit, forged Back/Close and Escape; exactly one write call.
3. Status0 lost ACK retains raw draft and identical operation key; background canonical version observation does not block retry.
4.409 retains raw values, shows a conflict/source explanation and does not send obsolete second write.
5. Late ACK after route, account ID or accessRevision change does not apply content, re-open modal or retain old private state.
6. Wrong-course, non-advancing-version or mismatched-body ACK does not change either canonical Course and leaves unsaved draft/retry state.
7. SDK old two-argument caller sends same encoded PATCH/body/credentials without a key; third argument adds the key without changing/mutating body.
8. SDK session invalidation rejects late private save response as AUTH_SUPERSEDED.
9–10. The two corrected findings above.

Initial test development also had two tester errors: it read the helper's non-parsed error node instead of actual source/form warning, and assumed a fake #app innerHTML update removes fake descendants like a real browser DOM. These were corrected to assert actual draft/source warning and canonical modal state; they are not reported as product findings. The10-case final suite retains all write/identity/source/focus outcome assertions.

## App / service seam read-only review
`server/app.mjs:500–516` now wraps existing Course PATCH in mutateOnce:
- requireMutation and Admin role check precede cache access;
- existing version-shape and encoded ID parsing remain;
- key optional, route uses canonical encoded ID, payload hash includes the submitted version/content;
- current existence/deleted/version and validation execute inside the cached operation; same successful key/payload replays its original ACK rather than failing stale-version check;
- same key/different payload is rejected by existing store mutateOnce, keyed by user+route+requestkey (`store.mjs:340–351`);
- old caller with no header uses nullkey and the existing mutation/version behavior, without creating an idempotency record.

No independent real HTTP/database mutation was run under this review's no-DB constraint. Root/backend maker's HTTP persistence, rollback, roles and publication tests remain the service evidence; these client mocks do not prove disk persistence.

## Actual backend contract reconciled
The final maker contract intentionally uses **complete four-leaf content replacement** and precise raw decimal age strings, matching current UI16-character decimal validation. It does not use the partial/null-leaf proposal in my earlier research report. This is safe and source-compatible: source requirements specify meaning, not wire types.
- Top-level content omitted preserves old saved content; supplied incomplete object/null/unknown leaves is rejected; four explicit blank strings clear the form.
- Descriptions preserve raw strings; ages0/2.5/one-sided supported without a3–18 eligibility rule (`validation.mjs:15–53`).
- `store.metadata(record,includePrivate)` only includes content in private projections; Student/publicOnly excludes it (`store.mjs:21`). `courseMetadata` preserves omitted content (`:119`). Existing available-slots public course whitelist is unchanged.
- No Course duration, Fee/package pricing, publication or eligibility rule was added by this slice.

## Remaining limits / scope
- Actual390/768/1280 browser layout, focus and successful live HTTP saves belong to Root's GUI/service checks, not this report.
- Explicit non2xx503 with unreadable body is currently treated as a failed service reply. No direct local Course mutation route returning503 after commit was found, so this is not a reproduced current blocker. A future reverse proxy can make such replies ambiguous; retaining the original idempotency key is appropriate, but this review does not claim503 proves rollback.
- Saving is internal only. Public description publication remains a separate important workflow; a published Slot/Fee.onlineStore does not automatically publish newly saved internal content.

## Final source fingerprints
- src.js b1f9305bfefcf680ded528c9bae13d6843b7d5d480b80f131823039875171d3a
- client/course-content-ui.js a4b6b416d628b2fb8e4d8e26176ce5f35ee453a06ced3eee8805c8741afa688f
- client/api-client.js 7c4bd4eed68b87b3ac84f237abe7199995c2471c4d900ae07b7ca058213c4f48
- server/app.mjs 8fd2c234222296304e53efa98f8720384b532c0e7c19de6ae1c0d6521b4fa918
