# Current verification — 28 September 2026

- 16 automated flow tests pass; production build passes.
- Browser verified: manual Course input, weekday checkboxes, auto-filled editable Class code and duplicate-code rejection.
- Browser verified: language switch in top-right; logged-in avatar opens account.
- Monthly income chart and payment dates checked in browser. Excel workbook generation tested; actual browser download remains unverified.
- No Vercel deployment or public sample URL has been verified.

- Submission timestamps persist across repeat submissions; Teacher unpaid records display submission time in Hong Kong time.
- Record and weekly-slot lists sort descending. Hong Kong month-boundary aggregation is covered by a regression test.
