# the-news-behind-price
An interactive journalism project exploring price changes in Australia.

## Verified price data

The site now separates Global, Australia and China datasets while retaining the original design and reporting. See [DATA_AUDIT.md](DATA_AUDIT.md), [actual imported coverage](COVERAGE.md), and [source registry](data/source-registry.json). Empty markets retain their products and show **Data unavailable**. Australian observations currently cover Sydney CPI indices, not monetary shelf prices.

`data/prices.json` is the browser's verified database. `data/observations.csv` is the flat export. `editorial-data.js` remains the unchanged journalism archive; its legacy quote arrays are not used to populate charts. Original source units and currencies are retained. There are no live provider calls from the browser and no API keys in the site.

### Preview and validate

Requires Python 3.10+ and Node.js 18+ for checks; the website itself is static and uses the existing bundled ECharts.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/price_data.py validate
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/price-model.test.cjs
python -m http.server 8000
```

Open `http://localhost:8000`. Serve over HTTP; fetching JSON from a `file://` page is not supported. All paths are relative and work under the `/the-news-behind-price/` GitHub Pages project path. Retain the repository's existing Pages publishing configuration. This implementation branch is for review; the public site changes only after you merge.

### Manual import

On a separate branch:

```sh
python scripts/price_data.py refresh
python scripts/price_data.py validate
```

This discovers the current official World Bank and ABS workbook links and fetches EIA's public daily table. XLSX parsing uses the sole added dependency, `openpyxl`. The 2026 NBS public release importer is explicitly manual:

```sh
python scripts/price_data.py refresh --full-nbs
```

Review `data/update-report.json`, `COVERAGE.md`, `data/source-registry.json`, the CSV and the source snapshots in ignored `.cache-data/` before committing. A snapshot's filename is its SHA-256 and matches the observation's source hash. `--as-of YYYY-MM-DD` supports reproducible date validation, but must never be used to approve unpublished future observations. The default is today's UTC date. The import window starts 2026-01-01; no historical gaps are filled.

Unexpected revisions do **not** replace old prices. Review each proposed change against its publisher snapshot, then make a deliberate, separately documented correction to `prices.json`. Preserve the previous record in Git and record the reason/evidence in the correcting PR. Regenerate exports with `python scripts/build_catalog.py` and validate again. New sources need a reviewed specification, original units, reuse terms and a policy entry before integration; never map retail fuel to crude, cotton to T-shirts, trade unit values to fixed-grade prices, or FX-converted global prices to a domestic market.

### Scheduled updates

`.github/workflows/update-prices.yml` checks World Bank, ABS and EIA weekly on Mondays at 22:23 UTC, and supports **Run workflow**. It opens or updates `automated/price-observations` as a review PR, uploads source evidence, and never merges or deploys. Failed providers retain prior verified records; diagnostics still go into the PR, and a partial failure marks the workflow failed. NBS and restricted/manual providers are excluded from the schedule.

After merging this implementation, repository Settings → Actions → General must permit **Allow GitHub Actions to create and approve pull requests**. The workflow declares contents-write and pull-requests-write permissions; organization policies may still restrict these. If PR creation is blocked, download the workflow diagnostic artifact and run the manual process. The workflow validates data before opening its PR because PRs created with `GITHUB_TOKEN` normally do not trigger another workflow. Separate `validate-data.yml` checks human-created PRs and main-branch changes.

### Comparisons and news

The common-base comparison control remains disabled unless explicitly compatible series share at least two valid periods across markets. The formula is `price / price_at_common_base_period * 100`. Do not enable comparison groups just because product names match. All currently imported cross-market combinations fail the compatibility requirement. Stories stay in their original editorial layer; timeline publication markers indicate context, not proof of causation.
