# Price-data audit

Audited 8 November 2026. Baseline: `672961da922b46cea04bfe375535b9b27277a461`.
The priority import window starts January 2026. No observation has been generated, interpolated, currency-converted or inferred from a percentage change.

## Coverage of all ten products and all three markets

The generated [30-cell coverage table](COVERAGE.md) reports the actual imported period range, observation count, frequency and price type for every product/market. The machine-readable equivalent is `data/source-registry.json` (`availability` and `imported_series`). “Unavailable” means **no suitable series was imported and verified in this implementation**, not proof that no provider has data.

| Product | Global | Australia | China |
|---|---|---|---|
| Beef | 2026-01–2026-10; 10 monthly benchmark prices | 2026-01–2026-09; 9 Sydney beef/veal CPI observations | Unavailable |
| Crude oil | 2026-01–2026-10; 10 World Bank monthly observations; 2026-01-02–2026-11-03; 213 EIA daily observations | Unavailable | Unavailable |
| Gold | 2026-01–2026-10; 10 monthly benchmark prices | Unavailable | Unavailable |
| Copper | 2026-01–2026-10; 10 monthly benchmark prices | Unavailable | 2026-01-01/10–2026-10-21/31; 28 ten-day period averages |
| Coffee | 2026-01–2026-10; 10 Arabica + 10 Robusta monthly prices | Unavailable | Unavailable |
| Cotton | 2026-01–2026-10; 10 monthly benchmark prices | Unavailable | 2026-01-01/10–2026-10-21/31; 28 ten-day period averages |
| RAM / DDR4 | Unavailable | Unavailable | Unavailable |
| Milk | Unavailable | 2026-01–2026-09; 9 Sydney CPI observations | Unavailable |
| T-shirts | Unavailable | Unavailable | Unavailable |
| Shuttlecocks | Unavailable | Unavailable | Unavailable |

These are 357 observations across 12 series at initial import. Monthly ranges denote whole reporting months; the NBS endpoints denote January 1–10 and October 21–31. No November monthly average is claimed. NBS February 11–20 and October 1–10 are absent from the imported releases and remain gaps; no reason for absence is inferred. Daily EIA blanks and non-trading dates remain gaps. The generated coverage file is authoritative after subsequent updates; this table documents the initial import.

## Existing project and evidence classification

The live entry point loads `editorial-data.js`, local ECharts, `regions.js`, and `restored.js`. `data.js`, `app.js`, and `editorial.js` are older unused code paths. All ten original products, two categories, editorial text, and linked reporting are retained. The 17,000-line editorial data file is unchanged.

`CONTENT_GUIDE.md` explicitly calls the country series illustrative examples. The active file has subsequently accumulated source-linked records, derived values, ranges and older observations. A source URL or an internal `verified` label is not independent verification. None of those legacy arrays is automatically promoted into the new database. The previous selector changed landmarks **and** selected country quotes/research views in `restored.js`; it did not offer Global. Many supposed country prices were the same international series converted at a single 30 October 2026 exchange rate.

| Product | Legacy evidence and problem |
|---|---|
| Beef | Australian FY2022–23 to FY2024–25 upstream EYCI averages and a 2024 estimated retail indicator; China 2024 quarterly and Jan–Feb 2025 wholesale values. Real-source claims, but outdated, mixed periods and converted units. |
| Crude | Source-linked EIA history displayed as AUD/CNY using fixed-date FX. Neither is a domestic crude market. The replacement is freshly fetched EIA USD daily history and separate World Bank monthly Brent. |
| Gold | International benchmarks and regional reporting; fixed-date FX displays cannot establish historical local-currency prices. Fresh World Bank data imported only under Global. |
| Copper | International/FX histories do not establish domestic observations. New LME benchmark and Chinese 1# prices are separate grades and frequencies. |
| Coffee | UN Comtrade trade-value/net-weight proxies and legacy domestic research, with missing values and fixed-rate currency conversion. Product mix and contracts prevent treating unit values as a fixed-grade price. |
| Cotton | Mix of Comtrade export/import unit values, 3128B monthly prices and derived quarterly means. These are not one comparable series; the original research remains editorial context. |
| RAM | Active view shows a reported quarterly percentage change and no dated retail-price table. Unused `data.js` contains sparse TrendForce spot-price claims. Neither supports a licensed continuous DDR4 history. |
| Milk | Australian before/after pack-size prices from 2024 and Chinese annual versus year-end raw-milk figures. Not a common monthly series. |
| T-shirts | Australian annual apparel import unit values and Chinese cotton-input prices. Neither measures same-specification T-shirt retail prices. |
| Shuttlecocks | China AS-05 reports from 2024–2025 and Australian AS-30 recollection/range/lower bound. Different models and uncertain dates/values; no exact 2026 price series. |

Legacy source-linked numbers are **unverified in this audit**, not all declared fictitious. Illustrative values, derived proxies and unverified claims are excluded from the active price layer. Original journalism is preserved as context, with no new claim that its numbers are verified by the new database.

## Sources, rights and scope

Full per-source access, licence, frequency, bulk-download and automation decisions appear in [the source registry](data/source-registry.json). [Source policy](data/source-policy.json) records why each unavailable market is empty.

- **World Bank**: official [monthly workbook](https://www.worldbank.org/en/research/commodity-markets) downloaded and byte-for-byte matched to the supplied XLSX, SHA-256 `3c8d9d8dbb48342fdbf24777c39a8ce8964cc2fd0958f72f6779e6e4ad99cde2`. Updated 3 November; last period October. Read only `Monthly Prices`, never forecasts or `Monthly Indices`. Preserve original USD units, grade definitions, and [dataset licence conditions](https://data.worldbank.org/summary-terms-of-use). Cotlook A is a quoted physical commodity price despite “Index” in its name.
- **EIA**: [daily Brent table](https://www.eia.gov/dnav/pet/hist/RBRTED.htm), released 4 November, latest observation 3 November. XLS also available; importer uses the equivalent public HTML table to avoid another library. [Reuse conditions](https://www.eia.gov/about/copyrights_reuse.php).
- **ABS**: [September 2026 CPI, Table 10](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/sep-2026/6401010.xlsx), released 28 October. Only original Sydney beef/veal and milk expenditure-class indices imported. The index base is September 2025=100, checked in the source. Sydney is explicit; these are neither national averages nor dollar prices. Broad clothing and coffee/tea/cocoa classes are excluded. [CC BY 4.0 conditions](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer).
- **NBS**: 28 public statistical releases individually fetched and parsed with source URLs, table-row locators and hashes. Ten-day periods retained, not converted to daily/monthly observations. [Terms permit statistical-data use and attributed quotations](https://www.stats.gov.cn/english/nbs/200701/t20070104_59236.html); the site prominently credits NBS. Only statistical values are reproduced; no NBS page design or articles are bundled into the site. Manual review/import rather than unsupported API polling.
- **NSW FuelCheck**: supplied RDF is catalogue metadata with distribution links, not a price table. Its retail petrol/diesel data cannot replace crude oil. No artificial national fuel average was calculated.
- **Other reviewed candidates**: ABS broader classes, ABARES financial-year estimates/forecasts, MOA monitoring/PDFs, NDRC releases, SGE historical data, TrendForce/DRAMeXchange, and legacy Comtrade/report links. See the registry for access/reuse uncertainties. No claim that a portal's existence proves a suitable licensed historical series. Restricted memory data were not downloaded; SGE access failed; no substitute was invented.

## Integrity and comparison

Every observation includes reporting period, period start/end, publication date (nullable when unknown), verification status, check date, source URL, SHA-256 and table locator. Series metadata supplies stable product/market/region/specification/currency/unit/type/frequency. `observations.csv` repeats these fields for a standalone flat database.

The x-axis uses UTC dates. Monthly/ten-day values are positioned at period start solely for plotting and labelled with their real period in the tooltip/table. Missing periods break lines. The table gives exact stored numeric values. Dated editorial publications have timeline markers; unknown event dates remain unknown. Publication timing is not claimed to prove causation.

Comparison uses price / price at a common valid base period × 100, but requires an explicitly reviewed compatibility group, identical frequency/type, at least two common observation periods and more than one market. All current groups are null: the available domestic CPI, Chinese grades and international benchmarks do not meet these criteria. The disabled control explains why; raw USD/AUD/CNY are never combined on one price axis.

## Update safety

Scheduled imports propose a review PR for World Bank, ABS and EIA. NBS is manual. Existing verified values are immutable during refresh; revisions are listed with both old and proposed observations. Missing records never delete history. Unexpected units/specifications, malformed values, duplicate dates and future dates fail validation. Source failure leaves prior data intact and produces diagnostics. No workflow auto-merges or deploys. Merging the implementation remains the owner's decision.
