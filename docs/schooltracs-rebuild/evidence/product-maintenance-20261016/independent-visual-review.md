# Products Stage A — screenshot-only independent visual review

Verdict: PASS for the supplied final screenshots. No blocking overlap, edge clipping, unreadable wrapping or inaccessible-looking footer was found in the images. No source, database or browser operation was performed by this reviewer.

The folder currently contains nine JPGs, rather than the eight stated in the request. All nine current files were opened with view_image. Pixel dimensions and SHA-256 values are recorded in /tmp/beamal-products-independent-visual-manifest.json; no older detail390 image/hash was reused.

| Current image | Actual file size | Visual result |
|---|---:|---|
| detail-390-zh.jpg | 390 × 844 | Header, Close and stacked footer actions are fully inside the modal with visible side padding. Facts have readable label/value separation. The lower Detail/Remark section is outside the current scroll viewport; this is a bounded reading body, not evidence those fields are missing. |
| price-error-390-zh.jpg | 390 × 844 | The long rejected price remains visible in its focused field. Its red explanation sits immediately below it and is fully readable, away from the fixed footer. No focus-ring/footer collision is visible. |
| review-390-zh.jpg | 390 × 844 | Labels and values remain separated, location wraps naturally, and Cancel/Back/disabled-looking Save with explanation fit inside the footer. Lower body content beyond the viewport is not counted as screenshot clipping. |
| create-review-390-en.jpg | 390 × 844 | A long English product name wraps into two readable lines rather than overflowing. Unknown facts visibly say Not provided. Footer actions and the unsaved explanation fit within the image. |
| stock-review-390-zh.jpg | 390 × 844 | Current stock4, adjustment2 and proposed stock6 are distinct and readable. The multiline reason and unsaved notice have sufficient separation. Header/footer remain entirely visible. |
| create-768-en.jpg | 768 × 900 | Two-column fields align with consistent gutters and bounded widths. The long translated name stays inside a native single-line input. This is the Back-return scrolled view supplied by Root, not a form-at-top screenshot; it is not used to infer whether the top helper is missing. The partly visible lower textarea belongs to the scrolling body, with the footer still clear. |
| detail-1280-zh.jpg | 1280 × 900 | The desktop two-column facts, Detail/translated Detail/Remark and all three footer actions are readable with generous margins; no edge crowding or overlap is visible. |
| review-1280-en.jpg | 1280 × 900 | Long name and location fit/wrap within the body. Multiline Remark is readable. The reading-body focus outline remains inside its border and clear of the footer; all footer actions and explanation are visible. |
| stock-review-768-zh.jpg | 768 × 900 | Explicit zero current stock and proposed5 are shown as separate facts. The short content is centred in a compact modal, with visible notice, footer and outer margins. |

Controls look consistently sized and roughly touch-friendly in these images, but screenshots do not establish exact CSS-pixel hit areas, keyboard reachability, contrast measurements or WCAG conformance. Gray Save buttons visually communicate the intentionally unavailable final persistence step; source-level disabled/no-write behaviour was covered separately by the39-case independent source acceptance.

Root reports separate live IAB checks across roles, widths, languages, keyboard navigation, validation, Review/Back/Cancel and final full-suite/build results. Those are Root's evidence, not live actions performed by this reviewer. These static images cannot independently prove native IME candidate behaviour, focus restoration, full scroll reachability or unchanged database tables.

No new blocking visual issue was found. No additional source changes or test reruns are requested by this visual review.
