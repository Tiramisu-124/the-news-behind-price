# Verification — 8 November 2026

The checked flow is market/product selection → local verified JSON → dated chart/table/source attribution, with the original editorial layer displayed alongside.

| Boundary | Result |
|---|---|
| Publisher downloads → import | World Bank, ABS, EIA and 28 NBS release pages imported successfully; 357 observations / 12 series. |
| Scheduled-source repeat import | Re-fetched World Bank (70 records), ABS (18), EIA (213): zero additions, zero revisions; no duplicate records. |
| Data validation and integrity | 10 Python tests passed: schema, dates, CSV values, duplicates, invalid prices, unit/specification changes, immutable revisions, append-only imports, repeat imports, simulated source failures. |
| Date axis and comparisons | 5 Node tests passed: monthly/daily/weekly gaps, ten-day calendar boundaries, empty/single-observation series, common-base formula and incompatible-series rejection. |
| Browser → static files | Local HTTP returned 200; database and registry loaded successfully. Chromium had no page script errors. |
| Market → rendered result | All 30 product/market combinations checked; all 12 individual series matched database counts, latest values, units, dates and attribution. Unavailable markets showed no legacy price. |
| Navigation and retained features | Search, categories, follow persistence after reload, method dialog and Australia/China background switching passed. Original editorial data, older source files and assets unchanged. |
| Mobile | Sydney milk index checked at 390×844; no horizontal page overflow. Desktop inspected at 1440×1000. |
| Failed browser request | Deliberately blocked prices.json: informative unavailable state, no fallback to illustrative values, stories still visible. |

Desktop oil and China copper screenshots and a mobile milk screenshot were captured. The original CSS is preserved with a small additive rule set for data controls and wrapping. `git diff --check` passed. This is a static GitHub Pages site: there is no application server/API credential boundary.

The implementation is delivered on a review branch. The scheduled GitHub Actions job only becomes scheduled after merging into the default branch. Its download/validation path was exercised locally; hosted PR-creation permissions and the first scheduled run are not represented as already verified. The live GitHub Pages site is intentionally not changed before review/merge.
