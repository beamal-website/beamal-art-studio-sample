# Course content Stage A — independent acceptance

2026-10-16. Current HEAD22187a68863498b5d4a82f8d573b0e93ec971765, branchtest. **PASS for the scoped UI flow, no outstanding blocking finding.** The malformed-source consistency finding was also fixed and rechecked below. This does not claim saved course content or completion of the whole Goal.

## Executed evidence and ownership

- Independent composed run: **38/38 PASS**, 0fail,415ms, `/tmp/beamal-course-content-independent-typed-final-green.log`.
- Composition: 2original baseline assertions against current source +15full-source VM host groups +9pure/real public-renderer groups +2error-reveal geometry groups +10new durable host cases. Overlap is deliberate regression coverage; totals are executed tests, not unique product features.
- Initial repository write by this reviewer: `sample/tests/course-content-host.test.mjs` (54lines,10cases). Parent explicitly authorized this new file. It uses relative source reads/pure imports and extracts actual production functions, without `/tmp` or machine-specific dependencies. Syntax and trailing-whitespace checks passed. Parent owns production, staging and release.
- No production/Goal/AGENTS edit, realDB, business write, browser control, full suite/build, Git-index, commit or push by this reviewer. The subsequently authorized existing test-harness correction is detailed below.
- Final eight-file hashes are in `/tmp/beamal-course-content-independent-manifest.json`. src SHA-256: `a7e2d72e58e0d486bbf33e1a3757759dc056eecaa746e5efb67dbc886addc832`; durable host-test SHA-256: `9053bbe9c8e5810955690403a03e99945ff19d223fbf21b97ed70dcbd58a2cde`.

## Genuine RED and corrections

1. Immutable baseline source/harness: actual shared Admin General had Schedule but lacked Course content panel and exact-course entry. Original 0/2RED is `/tmp/beamal-course-content-independent-baseline-red.log`; baseline SHA remains preserved. Current-source run uses `BEAMAL_COURSE_CONTENT_CURRENT=1` and passes the same two assertions. Running default frozen-source script is intentionally still RED, not a current regression.
2. Independent source concern: global validation text at body top could be out of view when a lower invalid age input was focused. Parent then confirmed real390 invalid6→2.5 with explanation offscreen and focus ring at footer edge. Reviewer independently viewed the old screenshot, not the live browser. Separate finding note: `/tmp/beamal-course-content-independent-visual-error-finding.md`.
3. Before the host fix, actual frozen `renderCourseContent` failed the geometry case where input500..548 was already visible in body100..600 but its adjacent error wrapper480..680 was not. Baseline1RED/1GREEN log: `/tmp/beamal-course-content-independent-error-geometry-red.log`; frozen function retained. Current actual host reveals the wrapper nearest, preserves input focus, and avoids extra reveal when wrapper is already visible:2/2GREEN. Same behavior is preserved in the new durable file.

First full-source run contained fixture failures, not product findings: form.values getter-only conflicted with old submit harness assignment; unknown pure fixture lacked the documented positive private version. Fixing setter/valid fixture made original behavior assertions pass. Compact-empty wording later changed to “have not been provided”; semantic matcher was updated while retaining unknown/no-legacy/no-fake-facts assertions. No genuine failing behavior was weakened.

## Verified flow

- Actual Admin Course General entry opens exact current CourseB despite two identical names; draft is a clone and never alters canonical CourseA/B. Wrong-course/out-of-context commands and Teacher forged open/review/save do not create an Admin draft or issue writes.
- Four raw fields are descriptionZh/descriptionEn/minAgeYears/maxAgeYears. Native FormData is captured even without input-event state updates. Bilingual multiline strings, whitespace and2.50/18.0 round-trip through Review→Back unchanged. Fractional/optional bounds are supported; malformed syntax and reversed bounds produce controlled errors, without adding enrolment eligibility rules.
- Close/X/Escape restores exact remounted CourseB opener, month and page/nested-table positions. IME Escape preserves the draft; normal Escape closes it. Native-shaped Tab includes the scrolling reading body, avoids hidden controls, wraps and recaptures background focus.
- Review starts at reading top. Back restores exact editing textarea, selection start/end/direction, textarea own vertical/horizontal scroll and body316position.
- Unchanged polling does not remount fields or erase native raw values/caret/scroll. Changed course version latches stale; even reverting a version does not silently rebase. Refresh recovers a transient read failure, but version drift still requires explicit Close/reopen as the UI states. Deleted-but-still-authorized source retains raw text with Review blocked; removed/revoked source clears owner.
- Route/General-tab/BrowserBack, identity/role/access and source removal dismiss ownership. Closed/navigated/new-identity late reload success and superseded identity401 cannot revive the editor or steal current focus. Current401 remains governed by the existing global authenticated read handling.
- Final Save stays disabled; forged save/submit does not call Course metadata/current-price/other mutation methods. Existing course content is not persisted or replaced by this slice.
- Public renderer reads only explicitly supplied public `course.content`; it selects visitor language with a real other-language fallback, omits empty language rows, distinguishes knownzero from unknown, and suppresses content during loading/error or absent/invalid projection. No private fallback, contact, remark or Admin edit action is exposed.

## Five-axis review

- **Correctness:** stable exact CourseID and owner context are separate from source-version/error checks. Native FormData and latched stale state prevent stale approval or lost edits; disabled final Save makes the current scope honest. No blocking defect remains in verified paths.
- **Simplicity/readability:** a small pure module owns fields/validation/reading; named host functions own identity, lifecycle and focus. The host fits existing modal conventions without unrelated refactoring. Error wrapper targeting is narrow, with Edit Back still revealing the original input rather than validation wrapper.
- **Architecture:** canonical content is separate from existing metadata/Fee/materials. No server/schema/write contract or eligibility policy is introduced. Public visibility is driven by existing explicit projection data, not private-course lookup or automatic publishing.
- **Privacy/security:** exact Admin role/context guards, source removal checks, escaped bilingual text and public projection-only display. Rejected/stale source does not expose another same-name course or revive a prior account draft. Server authorization was not re-audited in this frontend-only task.
- **Performance:** no per-field network request or N+1 course lookup. Existing catalogue polling is reused; source-only updates patch notice/controls while preserving native fields. Render/validation is bounded to two10000character descriptions plus small fields. This is source-level analysis, not a benchmark.

## Screenshot-only final review

Independently used view_image and file on:
- `/tmp/beamal-course-content-390-error-fixed.jpg` — actual JPEG390×844. Range explanation appears directly below focused max-age input; complete focus outline and explanatory panel have separation from footer. The upper text is scrolled, not evidence of clipping or missing fields.
- `/tmp/beamal-course-content-390-review-zh.jpg` — actual JPEG390×844. Bilingual description,2.5–6recommended ages, explicit not-published/unsaved state, Back and disabled Save are readable with suitable padding. No blocking overlap/clipping observed.

These are screenshot observations, not reviewer-operated live GUI or independent DOM measurements. Parent supplied the actual live viewport/geometry and flow checks; they are not counted as this reviewer’s tests. Tablet/desktop live checks, full suite/build and clean release verification remain Parent-owned.

## Resolved source note and scope boundary

A deliberately malformed temporary source `{descriptionZh:42,minAgeYears:false}` originally displayed unknown in the reading panel but converted numeric description42 to the editor string“42”. This was independently reproduced in the actual VM host and reported as a low-risk consistency finding. Root authorized the minimal pure normalization fix: description fields only accept strings; age fields still accept finite numbers. The new independent typed-source test passes, preserving legitimate typed string“42”, whitespace and2.50; the same full-host malformed fixture now produces four blank fields consistently with the unknown panel. Current composed38/38 is after this source change. No outstanding note remains from that finding.

No actual content persistence, publishing, enrolment-age eligibility, quota deduction or unrelated product flow is claimed here. Freeze at the manifest hashes; subsequent production changes require only affected verification, not automatic reuse of this PASS.


## Authorized existing VM-harness follow-up

Parent’s first clean-index full suite had1460pass/76fail. Log `/tmp/beamal-course-content-candidate-tests.log` was parsed: **all76 failures were in sample/tests/flows.test.mjs with exactly the same ReferenceError, courseContentPanelMarkup is not defined**. The browser uses normal module imports, while this pre-existing test harness strips src imports before evaluating it in a VM; its manually injected globals had not included the new real Course content module.

Parent explicitly assigned this existing harness file. Reviewer added only `import * as courseContentUI from '../client/course-content-ui.js'` and `...courseContentUI` in vm.createContext. Removing those two additions restores the exact pre-edit bytes, verified mechanically. No assertion, test, fixture, production behavior or module was stubbed, loosened or removed. No other existing harness needs this import: the other three source-extraction host tests already import their real modules.

- Actual affected Course-timetable case before fix:0/1RED with original ReferenceError, `/tmp/beamal-course-content-flows-harness-actual-red.log`.
- After real namespace wiring, **entire affected worktree file480/480PASS**,12.93s, `/tmp/beamal-course-content-flows-harness-green.log`; syntax and whitespace PASS.
- Current flows SHA-256: `df677af09493a05241202b1e4bbc0f8855a00838e8b0d25e9de49147f29a91cf`.
- An additional reviewer-owned temporary probe reused Parent’s original clean-candidate production through read-only symlinks and overlaid only corrected flows. It yielded478pass and2temporary-environment failures, because this reduced overlay omitted node_modules(write-excel-file) and public(Beamal photos). After adding those read-only symlinks, the same two tests passed2/2 in `/tmp/beamal-course-content-flows-harness-clean-fixture-green.log`. This is not presented as a single clean480/480 run; the original incomplete-fixture log is explicitly named `/tmp/beamal-course-content-flows-harness-clean-incomplete-fixture.log`.
- Reviewer did not access/change the Git index or original clean candidate. Parent accepted and staged the flows-only fix and is running a fresh final clean candidate. That final whole-suite result is Parent-owned and is not claimed here.

## Additional screenshot-only review

Viewed current `/tmp/beamal-course-content-768-review-zh.jpg` (JPEG768×900) and `/tmp/beamal-course-content-1280-review-en.jpg` (JPEG1280×900) with view_image and independently checked file dimensions. Bilingual copy, recommended2.5–6 on tablet, knownzero lower age on desktop, unsaved/unpublished state, Close/Back and disabled Save are readable with adequate spacing; no blocking overlap/clipping was observed. This is not reviewer-operated live GUI or proof of the complete Return flow.

Nonblocking visual note reported to Parent: Back and Save button tops differ because Save and its helper text form a vertically centered group. Aligning the buttons themselves could improve polish; it does not obstruct reading, focus or operation. No production edit was made by this reviewer for that note.


## Final scoped CSS-only review

After Parent accepted the footer-polish note, maker changed only `.course-content-footer` `align-items: center` to `align-items: flex-start`. Reviewer independently reversed that one property in memory and reproduced the exact previous CSS SHA-256b95b4a884ea4a5ec22a13320ef09412f3ee57c2bb7a9dde74acc61a0c9c7bdd4. Current CSS SHA-256 is33703d3d9bbf130de10dccc2684df4c53d738c0c64dba99310ba2a9ab22ad056; every other seven source/test hash is unchanged. No test was rerun for this CSS-only change.

Independently viewed final768×900 and1280×900 JPEGs (`/tmp/beamal-course-content-{768,1280}-final.jpg`), plus390×844 JPEG `/tmp/beamal-course-content-390-final-error.jpg`. Button tops now visibly align; content/error text, Close and footer actions have adequate space. No blocking overlap/clipping seen. Parent reports fresh exact8-file candidate1537/1537 andbuild19.15s with bundlemain-RDcnq_T4.js; this remains Parent-run evidence, not reviewer-executed tests/build.

An initial final390 capture was rejected: it was390×457 with a small top-left thumbnail and blank area. Parent replaced the same file after a stable Edit→Review and explicit390×844 capture. Reviewer reopened the current `/tmp/beamal-course-content-390-final.jpg` with view_image and independently verified JPEG390×844 using file. Current English Review shows readable course title, optional Chinese unknown state, complete English description,2.5–6recommended ages, unsaved state, aligned Back/disabled Save, and complete footer hint, with no blocking clipping or overlap. The rejected thumbnail is historical evidence-capture failure, not a remaining product or evidence blocker. **All four current final images now pass this limited screenshot-only review.** Source/tests are unchanged; no additional test or browser operation was performed by this reviewer.
