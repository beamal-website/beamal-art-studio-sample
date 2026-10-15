# Package contents + factual Order summary — independent Stage A review

2026-10-16, Asia/Hong_Kong. Reviewer `/root/staff_leave_host_map`.

**限定範圍 PASS：41/41，沒有剩餘阻塞。** 已驗證暫存套票內容流程及實際 Order details 的原單快照摘要；沒有把尚未完成的保存、餘額計算、名冊或學生 My classes 接線當成完成。

HEAD: `53f43dd5aa6b5a2287e1b67c2b88a318b0a504b7` plus the frozen file hashes in `/tmp/beamal-package-independent-manifest.json`.

## Ownership and evidence boundary

- Root owns production host, live GUI and project full test/build. UI makers own package-content and Order-summary renderers.
- This reviewer wrote only `/tmp/beamal-package-independent-*` until Root explicitly expanded ownership to **one new repo file**, `sample/tests/package-content-host.test.mjs` (57 lines). No production source, other test, DB, Git index, commit or push was changed by this reviewer.
- No browser, screenshots or actual user database were operated. All host/event/focus/scroll checks below use the real host code in a native-shaped VM/DOM model. They do not replace Root's live-browser/viewport acceptance.
- Research authority is `/tmp/beamal-package-owner-20261016-core/research-contract.md`. The PDF/Notion observations in that document are the researcher's evidence, not this reviewer's fresh PDF or browser inspection.

## Final run

`BEAMAL_PACKAGE_CURRENT=1 node --test` with the four reviewer scripts plus the new formal host file: **41 tests, 41 pass, 0 fail; 1408.48 ms**.

Log: `/tmp/beamal-package-independent-final-margin-41.log` (previous41 and prior39 logs retained).

| Group | Count | Actual coverage |
| --- | ---: | --- |
| Preserved original real-entry assertions | 2 | Admin and Teacher real exact FeeName → Overview → package-content entry. Baseline genuinely failed before integration. |
| Independent actual host groups | 16 | Entry/roles/source, raw edits/order, invalidity, Review/Back/Cancel, exact return, same-name IDs, source version/relation changes, poll/history, reload races, keyboard, forged commands, row focus/scroll. |
| Independent pure package groups | 6 | Unknown saved composition, PDF-style variants, raw validation, roles, loading/error controls, escaping. |
| Independent factual Order groups | 10 | Snapshot units/state/unknowns/no inferred balance plus two actual Order-details integration cases. |
| New formal repo host groups | 7 | Actual row-change + renderer (three cases), actual enrollmentKeyboard (two), and conditional nearest-reveal geometry (two). |

Loops cover more permutations than the count of named groups. This is a targeted run, not the project full suite. Root remains responsible for `npm test --prefix sample` and `npm run build --prefix sample`.

## Preserved RED → GREEN evidence

1. **Actual baseline entry absent (expected integration RED):** baseline source SHA `e7bc5d74…`, Fee UI `8dbc45dc…` saved before integration. Both Admin/Teacher first prove real Fixed package / 720-minute source, then fail because no reachable `package-content-open` exists. Same assertions pass after integration. `/tmp/beamal-package-independent-baseline-entry-red.log`.
2. **Moving/removing rows jumped to top/first row:** Root flagged the host focus/scroll logic during GUI review; the failing move-first-to-second and remove-middle cases were independently reproduced in the VM before repair. Root's particular pre-fix GUI move-second-to-first did not establish that failure visually. Moving row A down retained the moved data but scroll487→0 and focus went to new row one; removing middle row similarly changed532→0 and focused row one instead of the nearest survivor. Two unchanged reviewer assertions now pass. `/tmp/beamal-package-independent-row-position-{red,green}.log`.
3. **Order reading-body Tab / composition Escape:** before Root's repair, the formal actual-keyboard tests were 3 existing row passes / 2 new keyboard RED. The reading body was rejected by the trap and composition Escape closed the overlay. Root added the explicit summary tab stop to the trap and the composition guard; all five formal tests pass unchanged. `/tmp/beamal-package-independent-formal-order-keyboard-red.log`, final41 log.

4. **Correctly focused row could still be outside the visible body:** Root subsequently documented a real native390 failure: moved input top820.56 / bottom868.56 exceeded body bottom746.5 even while stable focus and bodyTop175 were retained. The two new formal geometry cases were run before repair: offscreen target genuinely RED (no nearest reveal), already-visible target GREEN (no extra scroll). Root now conditionally calls `scrollIntoView({block:'nearest',inline:'nearest'})` only when top/bottom is outside the body. Final7 formal tests all pass. `/tmp/beamal-package-independent-focus-visible-red.log` and final41 log. This reviewer verifies the actual host geometry branch through controlled bounds, not final browser pixel movement; Root owns that live retest.

The new formal file reads `src.js` relative to its own URL and executes the actual `renderPackageContent`, `changePackageContent` and `enrollmentKeyboard`; it has no `/tmp` imports or hardcoded workspace paths. Its surrounding DOM/auth/read helpers are intentionally small stubs, not claims to test the service authorization layer.

## Actual host behavior covered

- **Real surfaces:** Admin/Teacher × global Fees / Course catalogue / Course B detail. Known package Fee opens details; saved composition stays absent; linked Course names do not become components. Teacher forged Edit/Add/Review/Back cannot mutate the draft or call persistence.
- **Exact identity:** same-name Fee IDs use their own version, 720-minute versus 8-visit quota, source Course B and independent fresh draft. Closing/reopening does not retain unsaved content as official data.
- **Native draft:** adding reads un-emitted native fields; up/down/remove preserve raw strings and stable IDs. Removing all is legal but Review fails until Add recovers. Empty, zero, negative, fractional, exponential, >1440 and nonfinite durations stay raw, remain editable, focus/reveal an error and do not enter Review.
- **Review/Back:** 60+30 sums to90 segment minutes while saved package quota stays720. `0060`, names and ordering survive Review/Back; Review starts at top and Back restores edit scroll. Final submit is disabled; forged submit in Review is inert.
- **Cancel/return:** all three source surfaces × details/edit/review cancel back to readonly Fee overview, package opener and saved overview body scroll; then close back to the exact fresh Fee ID + Course occurrence, not the first same-name row. Original query/filter, Course month, groups and page/table positions are restored.
- **Source drift:** Fee version/price change retains rows, blocks Review, and explicit Reload rebases only exact saved context. Source Course B unlink or deletion remains blocked even after Reload; it does not switch to another related Course.
- **Background reads:** unchanged catalogue poll and late authorized history do not remount inputs, move caret selection/direction, change focused field or reset scroll. History is visible after closing the child.
- **Errors/races:** reload loading blocks draft actions and leaves Close available. 503 retains draft and shows generic error. Actual go/popstate and account ID/role/access-revision changes invalidate pending state; late success or401 cannot revive the child/owner. Close pending Reload → reopen same Fee never attaches the old draft/completion to the new child.
- **Keyboard:** native-shaped forward/back body traversal, first/last wrapping, background recapture, disabled controls excluded, composition Escape keeps draft; normal Escape returns exactly one layer. Current-price Edit cannot be replaced by a forged package command; monthly Fee, Student and anonymous entry are rejected.
- **Rows after repair:** stable moved row focus is retained; removal targets the nearest surviving row; deleting the final row focuses Add content. Already-visible focus keeps the viewport; offscreen focus requests only a nearest reveal. The original no-geometry scroll assertions remain intact. Production CSS applies min44×44 to package buttons, with no smaller min override found. This is source review; actual computed touch dimensions belong to Root's GUI evidence.

No exercised package UI route issued current Fee/Course/metadata persistence calls. No real HTTP/database mutation test or package-save implementation is claimed.

## Factual Order summary boundary

The verified implementation is the pure `orderPackageSummaryMarkup` and its actual integration into **Order details**, one summary per exact item.

- Only `item.pricing` supplies package quota. Current Fee changes, top-level fake totals, another child's supplied order, fake balance, validity, component props and booking-expiry configuration cannot fill missing snapshot facts.
- Exact `paid` uses Original purchased quota; all other/missing states use Quota on this order. Package positive safe-integer total + known unit preserves minutes / visits / legacy lessons-as-visits. Zero or invalid package total is unknown, not a fabricated zero quota.
- Selected lessons `[]` is known0; missing/null/non-array is unknown. Selected count is independent from quota. No720/60→12, attendance consumption, derived remaining, validity or current contents are invented.
- Remaining balance / validity / contents stay Not provided because no formal source contract exists for them in this slice, including a fake supplied balance0.
- Same-name items with720minutes and8visits render separately and do not combine units; input objects are unchanged. Actual Order details emits each exact Course/Fee item's summary before its selected lesson list.
- Chinese quota visits/legacy lessons uses 次; selected lessons remains 堂. English independent cases retain their original assertions.

**Roster and Student My classes snapshot-source integration is not delivered or claimed here.** Their current DTOs provide order/session identifiers rather than pricing snapshots. This agreed boundary avoids borrowing current Fee data or falsely treating an order identifier as a package balance.

## Five-axis review

- **Correctness:** Fee owner, exact source Course relation, version digest, current role/location and parent connection guard the package draft. Saved facts, temporary components and immutable order snapshot facts remain separate. All evidenced row-position, focused-control visibility and keyboard problems are fixed in the final tests.
- **Simplicity:** one local child state under the existing Fee overview, one pure composition renderer, one small factual summary renderer. No new persistence/entity or deduction model is introduced while ownership policy is unsettled.
- **Architecture:** history/poll painting skips active child; navigation/identity disposal and async state-owner checks prevent stale re-entry. Existing current-price save remains separate. Order details uses the same factual per-item renderer without current-cache fallback.
- **Privacy:** only current source-authorized Fee data is used; Teacher is readonly and cannot invoke Admin draft operations. Raw names/IDs/errors are escaped. The summary only renders supplied authorized item snapshots and does not read other family/current Fee data. No new backend permission/data-expansion claim is made.
- **Performance:** pure render/validation is linear in draft rows/items; no per-row API requests, balance reconstruction or N+1 source fetch was added. No scale benchmark was performed. The absent persisted composition contract is not filled with guessed computation.

## Harness-only corrections, not product defects

- The HTML attribute model was corrected to decode entities into real input `.value`; raw names were otherwise falsely double-escaped by the model. Raw preservation assertions remain strict.
- When the VM replaces `#app`, its old `#modal-root` stub is not a real current descendant. Navigation checks assert authoritative owner/modal cleared plus current app markup has no child, rather than interpreting a disconnected stub string as a live overlay.
- Pure Order tests corrected a helper default that swallowed an explicitly undefined status, and bound known zero count to the actual `0 lessons` DD text. Unknown/zero assertions were retained.
- Formal focus options cross VM realms were checked by exact `preventScroll === true` field rather than prototype-sensitive object deep equality. Stable ID and scroll assertions remain unchanged.

## Unfinished policies and limits

- Final Save stays disabled. No formal composition owner, shared Fee propagation policy, segmented scheduling/attendance, minutes/visits ledger, refund or makeup deduction policy is decided.
- No independent live GUI/viewport/accessibility-tree/native IME session or physical focus/scroll testing. Root's actual browser evidence must remain attributed to Root.
- No project full suite/build, live DB operation, Git staging/commit/push or unrelated repo edits by this reviewer.
- This is bounded Stage A package-content/Order-details UI acceptance; it is not completion of the whole system or Goal.

Evidence/scripts and exact source/test hashes: `/tmp/beamal-package-independent-manifest.json`.

Final source SHA256: `01d8c1b85701546416d64342580711cda51afee2825c0db6bc7d6bc1237d1874`.
Final sole reviewer repo-test SHA256: `815da0b4c581b6bc5e812acd847c8c1bfa107e89fcbb939783b3cfd0ec9d92c6`.

## Final CSS-only focus-ring margin follow-up

Root's native-phone check found the correctly focused control almost aligned with the body's bottom edge (field746.56 versus body746.5), leaving its focus outline clipped by the footer. Root added only `scroll-margin-block:8px` to `.package-content-fields input`; the 3px outline plus3px outline offset remain unchanged. Source review confirms the rule targets package-content inputs and does not change their48px height, width, ordinary layout spacing or any other component. Removing exactly that one declaration restores the prior CSS hash; every other recorded production/test hash is identical.

The unchanged41 cases passed again (1408.48ms). This validates the scoped source and behavioral regression, not physical outline pixels; final native-browser margin/footer visibility is Root's acceptance responsibility. No repo file was edited by this reviewer during this follow-up.

Final CSS SHA256: `57fa0692b7948bb172ebdbd176f512d070ab66079d92ac48b1b8e42a2e60b346`.
