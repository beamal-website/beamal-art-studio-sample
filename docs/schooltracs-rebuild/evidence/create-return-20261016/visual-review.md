# Create-return final screenshot-only visual review

2026-10-16. Independent limited visual PASS: no blocking clipping, edge-spacing, alignment or obscured mobile-form-footer problem is visible in the five specified final screenshots. This is a screenshot assessment only, not proof of a live journey, Save acknowledgement, focus location, scroll restoration, keyboard behavior, responsive DOM bounds, authorization or data persistence.

I opened each of the five images individually with view_image and checked image metadata read-only. No repository edit, browser control, DB operation, Git operation, test or build was performed. Only this report was written under /tmp.

Base directory: `docs/schooltracs-rebuild/evidence/create-return-20261016/`.

| Final image actually inspected | Confirmed pixels / format | Visible observations | Limit |
|---|---|---|---|
| `course-768-en-final.jpg` | 768 × 1024, JPEG | Header brand/logo, Courses title and Export/Import/Create/Class type settings have visible breathing room. Four filters form a consistent two-column arrangement. Name, Category, Level and Follows term headers line up with the row; the two-line Course name stays inside its cell. There is a visible right gutter for the page-level controls. | Fees content continues beyond the table's visible right edge; local table horizontal scrolling is permitted and is not classified as whole-page overflow. The screenshot cannot establish actual scrollWidth or test scrolling. |
| `fee-390-en.png` | 390 × 844, JPEG bytes despite .png extension | The fixed brand/header remains legible, with left/right spacing. Visible Fee names and amounts fit within their displayed columns; multi-line names have room and separators align consistently. The last visible row continues below the captured viewport in an ordinary scrolled list. | This capture is already scrolled into list rows, so page title/table heading and any form footer are not in frame. Their absence here is not evidence of a hidden control or a verified header/footer. The narrow Fee descriptions wrap into several short lines, including separators near line ends; this is a minor density/readability detail, not a blocker. Root already plans the format-correct .jpg rename; I did not rename it. |
| `shared-fee-1280-en.jpg` | 1280 × 900, JPEG | Brand/header and open sidebar have clear margins. Course names, category/level and Online Store states stay aligned across rows. Courses with multiple Fees show stacked Fee lines with readable labels and prices. The two-line Nature Sketchbook Workshop name fits. Content does not collide with the sidebar. | The capture is vertically scrolled into the table body; the table heading is above the frame. The screenshot demonstrates the visible body layout only, not header stickiness, focus, a relationship write or a successful save. |
| `course-error-390-zh-final.jpg` | 390 × 844, JPEG | The modal is inset from both screen edges. Title and close control remain visible. The scrolled form fields, radio options, long booking-expiry explanation and Online Store toggle have readable spacing. The full red duplicate-name message is visible above the footer line. Cancel and Create are completely visible inside the bottom footer with bottom/right breathing room; the footer does not cover the message in this final frame. | Only the captured lower form area is visible. This does not prove automatic error scrolling/focus, busy locking, field validation, or all body positions. |
| `course-cancel-390-zh.jpg` | 390 × 844, JPEG | The Chinese Course title and all four toolbar buttons fit in the viewport. Filters retain a two-column layout with clear gaps and inside margins. The long Course name wraps to two lines without touching the checkbox or category. Visible Name/Category headings are aligned with their row. | Further table columns continue outside the local table view; that is allowed horizontal table behavior. The visible Nature/Workshop/Intermediate controls do not, by screenshot alone, prove Cancel restored state or that focus returned. |

## Evidence boundaries

- No earlier `course-768-en.png` or `course-error-390-zh.jpg` was used as final evidence.
- The five files were all JPEG images on inspection; only `fee-390-en.png` still has the known extension mismatch.
- Image dimensions establish the captured bitmap sizes, not independently measured browser CSS viewport dimensions.
- No screenshot shows an active focus indicator strongly enough to determine the actual focused DOM element. I make no focus assertion.
- The mobile form footer conclusion comes from `course-error-390-zh-final.jpg`; the Fee screenshot is a scrolled directory, not a form-footer test.
- No visible blocker requires reopening the frozen slice on screenshot evidence alone. Live runtime, exact-ID focus, Save/Cancel, data integrity, keyboard behavior and actual horizontal-scroll containment remain Root's separate acceptance evidence.

Root evidence housekeeping after this review: fee-390-en.png was renamed fee-390-en.jpg to match its unchanged JPEG bytes; no image was edited. Earlier source images were renamed with -before to identify them clearly.
