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

## Follow-up review of PR #1

Reviewed the existing PR at `608f571219a6f96ff214c99734761db5c6e5b973`, without regenerating the site or re-importing its published database. The initial hosted validation run was successful and the PR had no merge conflict.

- Rechecked all 31 cached publisher snapshots by SHA-256 and reconstructed their source records: all 357 stored observations and 12 series definitions matched. Published JSON, CSV, registry and coverage stayed unchanged.
- Fixed a stale “Latest recorded index” label when switching from an index to an unavailable market.
- Fixed the ECharts publication-marker tooltip callback: axis tooltips receive an array, but marker tooltips can receive a single object. The old formatter raised `params.filter is not a function`; both callback shapes now work. Marker text distinguishes a documented publication date from a date inferred from the source URL.
- Added an isolated `--dry-run` for the actual scheduled-source download/import/export path. Local checks returned World Bank 70, ABS 18 and EIA 213 observations, with zero new records or revisions and no changes to committed data. The PR workflow now runs this check on a hosted runner with read-only repository permissions and retains diagnostics.
- Scheduled updates now run data/export tests after fetching new data, before PR creation. Changes to an ABS publisher series identifier are quarantined for review along with unit/specification changes.
- Twelve Python tests and five Node tests passed. Added browser regressions cover the real `/the-news-behind-price/` path, daily gaps, China's period table and CNY units, Sydney index labelling, index-to-empty switching, period/value tooltips and marker tooltips. These targeted checks passed in Chromium; the earlier 30-market/product baseline was retained rather than rebuilding it.

**Remaining operational boundary:** the connected GitHub tool cannot read the repository's Actions PR-creation setting. The new hosted check exercises downloads and data processing but intentionally does not create another PR or deploy. Confirm “Allow GitHub Actions to create and approve pull requests” after merging, then run the update workflow once. NBS remains manual; no licensed DDR4 history or incompatible comparison has been enabled. This permission limitation does not cause the site to publish unverified data: a blocked update retains the committed database and reports failure.
