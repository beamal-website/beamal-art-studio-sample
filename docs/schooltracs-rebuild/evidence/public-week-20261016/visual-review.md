# Public mixed timetable — screenshot-only independent visual review

Date: 2026-10-16. Reviewer: staff_leave_host_map. Scope: Root-supplied actual JPEG screenshots viewed at original size with `view_image`; file pixel dimensions independently checked using `sips`. No browser, source edits, DB operations, test suite or build performed. This is independent screenshot critique, **not independent live GUI acceptance**.

**Verdict: PASS for the six selected current screenshots. No visible blocking layout defect or unresolved actionable visual issue.** Earlier duplicate-title and capture-evidence observations are resolved in the selected evidence below.

| File under /tmp/beamal-public-week-evidence | Actual dimensions | What is visible |
|---|---:|---|
| public-1280-zh.jpg | 1280 × 2708 | Full desktop public page, four controls on a row, seven day columns, two weekly sections, course names/colors, separate Class/Trial labels, card buttons and footer |
| public-390-zh.jpg | 390 × 4916 | Full mobile public page, stacked controls and single-column day list, all fourteen dates in two weekly sections, multiple same-day cards, no horizontal text/button clipping visible |
| public-768-en.jpg | 768 × 3071 | Full tablet public page, four controls in a row, two-column day layout, readable English actions, two weekly sections and footer |
| trial-390-zh.jpg | 390 × 844 | **Actual Trial modal**, selected 水彩探索 on 2026-10-30 at13:00 for60minutes with Maya, complete header/close X, form fields, scrollable body and Cancel/Next footer |
| admin-1280-en-top.jpg | 1280 × 900 | Admin preview with one visible Public timetable title, Back, controls, legends, upper day cards and fixed Refresh/Close footer |
| admin-390-en.jpg | 390 × 844 | Current full-size mobile Admin preview with one visible title, header X, stacked controls with consistent margins, legend beginning in scrollable body and Refresh/Close footer |

## Observed layout

- Public logo/navigation, headings, controls, legend and day cards have consistent visible left/right spacing. Nothing in these screenshots visibly runs beyond image width or overlaps another text/control.
- Same-day course cards remain separate, with names and color markers. Class and Trial are separately labelled; meaning is not color-only. Chinese and English action text fits the supplied responsive layouts.
- Desktop uses seven columns, tablet two columns and mobile one day per row. Very tall public390/public768 images are full-page captures of sequential content; height itself is not evidence of crop or overflow. Empty dates and the second weekly group remain visible.
- The Admin duplicated body title has been visually removed on both desktop and mobile; the modal title remains. The scoped CSS hides only the nested weekly header visually and retains its accessible region label/heading in the DOM. The public page's own title is unchanged.
- Admin and Trial header/footer are visually distinct from their scrollable bodies. Lower fields/cards continuing beyond the body's viewport edge are expected scrollable content, not proof of inaccessible overlap. Supplied screenshots alone do not prove scrolling to every lower field or Manage button.
- The selected Chinese Trial screenshot now contains the actual form and correct chosen lesson facts. The complete header X and footer Cancel/Next buttons are visible inside the390×844 image; labels and inputs have comfortable spacing. No false booking or saved-success message appears. Its notice clearly says Trial applications are not yet open and the action is review, not a completed booking.
- Source Edit Save is outside this slice and is not claimed or verified here.

## Evidence corrections and exclusions

The initial trial-390-zh capture showed the public filtered page; the selected current file was replaced with a native actual-modal capture and independently re-opened. An intermediate admin390 capture was390×274 with a shrunk thumbnail; it was rejected as mobile evidence, then replaced with the current390×844 file and independently re-opened. These were evidence-capture problems, not established product defects.

Optional trial-390-en.jpg is **not included in this accepted six-image set**. Its header framing raised a capture question, and Root explicitly excluded it from the final evidence rather than relying on it. No English Trial modal-layout claim is made from that optional file. The accepted English coverage here is the public tablet page and Admin desktop/mobile preview.

## Limits

These screenshots do not independently prove DOM scrollWidth equality, real keyboard focus/IME behavior, full navigation chains, linked source editing correctness, actual save results, screen-reader behavior or performance. Root owns those runtime claims. Prior original independent targeted source/VM checks remain separate. Only the scoped duplicate-title CSS was additionally read after the concrete screenshot observation; source SHA256 manifest was refreshed, with public-timetable-ui.css as the only changed file since logic acceptance. No unchanged logic tests were rerun for that CSS-only change.
