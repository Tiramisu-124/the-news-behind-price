"""Import publisher observations. Never interpolate, convert currencies, or overwrite revisions."""
import argparse
import calendar
from datetime import date, datetime, timedelta, timezone
import hashlib
import html
import json
import math
from pathlib import Path
import re
import shutil
import sys
import tempfile
from urllib.parse import urljoin
from urllib.request import Request, urlopen

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
CACHE = ROOT / '.cache-data'
START = '2026-01-01'
WB_PAGE = 'https://www.worldbank.org/en/research/commodity-markets'
ABS_PAGE = 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release'
EIA_PAGE = 'https://www.eia.gov/dnav/pet/hist/RBRTED.htm'
NBS_PAGE = 'https://www.stats.gov.cn/sj/zxfb/'
PRODUCTS = ['beef', 'crude', 'gold', 'copper', 'beans', 'cotton', 'memory', 'milk', 'shirt', 'shuttle']
MARKETS = ['Global', 'Australia', 'China']


def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    temp.replace(path)


def fetch(url):
    # Public publisher downloads only; no credentials, access workarounds or third-party mirrors.
    req = Request(url, headers={'User-Agent': 'NewsBehindPrice-data/1.0 (public statistical data)'})
    with urlopen(req, timeout=45) as response:
        raw = response.read(25_000_001)
    if len(raw) > 25_000_000:
        raise ValueError('Source exceeds download size limit')
    CACHE.mkdir(exist_ok=True)
    digest = hashlib.sha256(raw).hexdigest()
    suffix = '.xlsx' if raw.startswith(b'PK') else '.html'
    path = CACHE / (digest + suffix)
    path.write_bytes(raw)
    return path, digest


def clean(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]*>', '', text))).strip()


def table_rows(text):
    return [[clean(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', row, re.S | re.I)]
            for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', text, re.S | re.I)]


def month_end(period):
    year, month = map(int, period.split('-'))
    return f'{period}-{calendar.monthrange(year, month)[1]:02d}'


def series(sid, product, market, region, specification, currency, unit, kind, frequency, source, url, licence, terms):
    return dict(series_id=sid, product_id=product, market=market, region=region,
                specification=specification, currency=currency, unit=unit, price_type=kind,
                frequency=frequency, source_name=source, source_url=url, licence=licence,
                licence_url=terms, comparison_group=None, observations=[])


def observation(s, period, start, end, price, publication, checked, url, digest, locator):
    if start < START or end > checked:
        return
    if price is None or isinstance(price, str) and price.strip() in ('', '...', '..', 'NA', '��'):
        return
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or price <= 0:
        raise ValueError(f'Invalid price for {s["series_id"]}: {price!r}')
    s['observations'].append(dict(period=period, observation_date=start, period_end=end, price=price,
                                  publication_date=publication, last_checked=checked,
                                  verification_status='verified', source_url=url,
                                  source_sha256=digest, source_locator=locator))


def import_world_bank(path, url, digest, checked):
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(workbook['Monthly Prices'].values)
    publication = datetime.strptime(rows[3][0].replace('Updated on ', ''), '%B %d, %Y').date().isoformat()
    definitions = [str(r[1]) for r in workbook['Description'].values if len(r) > 1 and r[1]]
    mapping = [('beef', 'Beef **', '($/kg)', 'kg', 'Beef'),
               ('crude', 'Crude oil, Brent', '($/bbl)', 'barrel', 'Crude oil, UK Brent'),
               ('gold', 'Gold', '($/troy oz)', 'troy oz', 'Gold'),
               ('copper', 'Copper', '($/mt)', 'metric tonne', 'Copper'),
               ('beans', 'Coffee, Arabica', '($/kg)', 'kg', 'Coffee, Arabica (ICO)'),
               ('beans', 'Coffee, Robusta', '($/kg)', 'kg', 'Coffee, Robusta (ICO)'),
               ('cotton', 'Cotton, A Index', '($/kg)', 'kg', 'Cotton')]
    result = []
    for product, heading, expected, unit, prefix in mapping:
        column = rows[4].index(heading)
        if rows[5][column] != expected:
            raise ValueError(f'World Bank unit changed: {heading}')
        specification = next(d.strip() for d in definitions if d.strip().startswith(prefix))
        sid = 'wb-' + product + ('-robusta' if 'Robusta' in heading else '-arabica' if 'Arabica' in heading else '')
        s = series(sid, product, 'Global', 'International benchmark', specification, 'USD', unit,
                   'commodity_benchmark', 'monthly', 'World Bank Pink Sheet', WB_PAGE,
                   'CC BY 4.0 with World Bank additional terms; underlying provider rights retained',
                   'https://data.worldbank.org/summary-terms-of-use')
        for row_number, row in enumerate(rows[6:], 7):
            if not re.fullmatch(r'\d{4}M\d{2}', str(row[0])):
                continue
            period = row[0].replace('M', '-')
            observation(s, period, period+'-01', month_end(period), row[column], publication, checked,
                        url, digest, f'Monthly Prices!{openpyxl.utils.get_column_letter(column+1)}{row_number}')
        result.append(s)
    return result


def import_abs(path, url, digest, checked, publication):
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(workbook['Data1'].values)
    result = []
    for product, label in [('beef', 'Beef and veal'), ('milk', 'Milk')]:
        heading = f'Index Numbers ;  {label} ;  Sydney ;'
        column = rows[0].index(heading)
        if rows[1][column] != 'Index Numbers' or rows[2][column] != 'Original' or rows[4][column] != 'Month':
            raise ValueError('ABS frequency, unit or seasonal basis changed')
        if next((r[column] for r in rows[10:] if r[0] == datetime(2025, 9, 1)), None) != 100:
            raise ValueError('ABS index reference base changed')
        s = series('abs-sydney-'+product, product, 'Australia', 'Sydney',
                   label+' consumer price index, Sydney; original (not seasonally adjusted)', None,
                   'index points (Sep 2025 = 100)', 'price_index', 'monthly', 'Australian Bureau of Statistics',
                   ABS_PAGE, 'CC BY 4.0', 'https://www.abs.gov.au/website-privacy-copyright-and-disclaimer')
        s['source_series_id'] = rows[9][column]
        s['limitations'] = 'Sydney expenditure-class index, not an AUD shelf price or an Australia-wide average.'
        for row_number, row in enumerate(rows[10:], 11):
            if not isinstance(row[0], datetime):
                continue
            period = row[0].strftime('%Y-%m')
            observation(s, period, period+'-01', month_end(period), row[column], publication, checked,
                        url, digest, f'Data1!{openpyxl.utils.get_column_letter(column+1)}{row_number}; {s["source_series_id"]}')
        result.append(s)
    return result


def import_eia(path, digest, checked):
    text = path.read_text(encoding='utf-8')
    plain = clean(text)
    if 'Europe Brent Spot Price FOB' not in plain or 'Dollars per Barrel' not in plain:
        raise ValueError('Unexpected EIA series or unit')
    release = re.search(r'Release Date:\s*(\d+/\d+/\d{4})', plain)
    publication = datetime.strptime(release[1], '%m/%d/%Y').date().isoformat() if release else None
    s = series('eia-brent-daily', 'crude', 'Global', 'Europe / Brent FOB', 'Europe Brent spot price FOB',
               'USD', 'barrel', 'commodity_benchmark', 'daily', 'U.S. Energy Information Administration',
               EIA_PAGE, 'Public domain U.S. government data; credit EIA', 'https://www.eia.gov/about/copyrights_reuse.php')
    for cells in table_rows(text):
        if len(cells) != 6:
            continue
        match = re.match(r'(\d{4})\s+([A-Za-z]{3})-\s*(\d{1,2})\s+to', cells[0])
        if not match:
            continue
        monday = datetime.strptime(' '.join(match.groups()), '%Y %b %d').date()
        for offset, value in enumerate(cells[1:]):
            if not value or value in ('-', '--', 'NA', 'W'):
                continue
            day = (monday + timedelta(days=offset)).isoformat()
            observation(s, day, day, day, float(value), publication, checked, EIA_PAGE, digest,
                        'Daily table; '+day)
    return [s]


def import_nbs(path, url, digest, checked):
    text = path.read_text(encoding='utf-8')
    plain = clean(text)
    match = re.search(r'(2026)年(\d{1,2})月([上中下])旬流通领域', plain)
    if not match:
        raise ValueError('NBS reporting period missing')
    year, month, third = match.groups()
    period = f'{year}-{int(month):02d}'
    start = period + {'上':'-01', '中':'-11', '下':'-21'}[third]
    end = period + {'上':'-10', '中':'-20', '下':month_end(period)[7:]}[third]
    pub = re.search(r'name="PubDate"\s+content="(\d{4}/\d{2}/\d{2})', text)
    publication = pub[1].replace('/', '-') if pub else None
    result = []
    for product, label, spec in [('copper', '电解铜（1#）', 'Electrolytic copper 1#, copper + silver >=99.95%'),
                                 ('cotton', '棉花（皮棉，白棉三级）', 'Lint cotton, white grade 3, fibre length >=28mm')]:
        found = [cells for cells in table_rows(text) if len(cells) == 5 and cells[0].replace(' ', '') == label]
        values = {float(c[2].replace(',', '')) for c in found if c[1] == '吨'}
        if len(values) != 1:
            raise ValueError(f'Missing/conflicting NBS rows or unit: {label}')
        s = series('nbs-'+product, product, 'China', 'China circulation market monitoring', spec, 'CNY',
                   'tonne', 'wholesale', 'ten_day', 'National Bureau of Statistics of China', NBS_PAGE,
                   'NBS statistical data use and attributed quotation terms (not CC licensed)',
                   'https://www.stats.gov.cn/english/nbs/200701/t20070104_59236.html')
        s['attribution'] = 'Quoted from the website of the National Bureau of Statistics, www.stats.gov.cn.'
        s['limitations'] = 'Reported early/middle/late-month market average; not a daily price. Manual source review.'
        observation(s, start+'/'+end, start, end, values.pop(), publication, checked, url, digest, label+'; 本期价格（元）')
        result.append(s)
    return result


def validate(database, today=None):
    today = today or datetime.now(timezone.utc).date().isoformat()
    seen = set()
    for s in database['series']:
        if s['series_id'] in seen:
            raise ValueError('Duplicate series')
        seen.add(s['series_id'])
        if s['product_id'] not in PRODUCTS or s['market'] not in MARKETS:
            raise ValueError('Unknown product/market')
        if s['price_type'] not in ('price_index', 'commodity_benchmark', 'wholesale', 'retail', 'farmgate'):
            raise ValueError('Unknown price type')
        if s['price_type'] == 'price_index' and s['currency'] is not None:
            raise ValueError('An index must not have a currency')
        if s['frequency'] not in ('daily', 'weekly', 'monthly', 'ten_day'):
            raise ValueError('Unsupported frequency')
        dates = []
        for o in s['observations']:
            start, end = o['observation_date'], o['period_end']
            date.fromisoformat(start); date.fromisoformat(end); date.fromisoformat(o['last_checked'])
            if not START <= start <= end <= today or o['last_checked'] > today:
                raise ValueError('Invalid/future reporting period')
            if o['publication_date']:
                date.fromisoformat(o['publication_date'])
                if not end <= o['publication_date'] <= today:
                    raise ValueError('Invalid publication date')
            if s['frequency'] == 'monthly' and (start[-2:] != '01' or end != month_end(start[:7]) or o['period'] != start[:7]):
                raise ValueError('Invalid monthly period')
            if s['frequency'] == 'daily' and (start != end or o['period'] != start):
                raise ValueError('Invalid daily period')
            if s['frequency'] == 'weekly' and (date.fromisoformat(end)-date.fromisoformat(start)).days != 6:
                raise ValueError('Invalid weekly period')
            if s['frequency'] == 'ten_day':
                expected = {'01': start[:7]+'-10', '11': start[:7]+'-20', '21': month_end(start[:7])}
                if expected.get(start[-2:]) != end or o['period'] != start+'/'+end:
                    raise ValueError('Invalid ten-day period')
            if not isinstance(o['price'], (int, float)) or isinstance(o['price'], bool) or not math.isfinite(o['price']) or o['price'] <= 0:
                raise ValueError('Invalid price')
            if o['verification_status'] != 'verified' or not o['source_url'].startswith('https://') or not re.fullmatch('[0-9a-f]{64}', o['source_sha256']):
                raise ValueError('Missing provenance')
            dates.append(start)
        if dates != sorted(set(dates)):
            raise ValueError('Duplicate or unordered dates')
    return True


def merge(existing, incoming):
    """Keep verified history immutable; conflicting revisions are review-only proposals."""
    result = {s['series_id']: json.loads(json.dumps(s)) for s in existing}
    conflicts = []
    additions = 0
    for new in incoming:
        sid = new['series_id']
        if sid not in result:
            result[sid] = {**new, 'observations': []}
        old = result[sid]
        identity = ['product_id', 'market', 'region', 'specification', 'currency', 'unit', 'price_type', 'frequency', 'source_series_id']
        if any(old.get(k) != new.get(k) for k in identity):
            conflicts.append(dict(series_id=sid, reason='Series definition changed', proposed=new))
            continue
        records = {o['observation_date']: o for o in old['observations']}
        incoming_dates = set()
        for o in new['observations']:
            key = o['observation_date']
            if key in incoming_dates:
                raise ValueError('Duplicate incoming observation')
            incoming_dates.add(key)
            previous = records.get(key)
            if previous and any(previous[k] != o[k] for k in ['price', 'period', 'period_end']):
                conflicts.append(dict(series_id=sid, reason='Publisher revision; retained verified value', previous=previous, proposed=o))
            elif not previous:
                records[key] = o
                additions += 1
        old['observations'] = sorted(records.values(), key=lambda o: o['observation_date'])
    return list(result.values()), conflicts, additions


def refresh(checked, full_nbs=False, data_dir=None):
    data_dir = Path(data_dir) if data_dir is not None else DATA
    incoming, logs = [], []
    def run(name, action):
        try:
            result = action()
            if not result or not any(s['observations'] for s in result):
                raise ValueError('No observations extracted; source layout may have changed')
            # NBS releases can be combined later; each release is validated here.
            validate({'series': result}, checked)
            incoming.extend(result)
            logs.append(dict(source=name, status='ok', records=sum(len(s['observations']) for s in result)))
            print(f'{name}: {sum(len(s["observations"]) for s in result)} observations', flush=True)
        except Exception as exc:
            logs.append(dict(source=name, status='failed', error=str(exc)))
            print(f'{name}: failed: {exc}', flush=True)

    def wb():
        page, _ = fetch(WB_PAGE)
        links = re.findall(r'href=["\']([^"\']*CMO-Historical-Data-Monthly.xlsx[^"\']*)', page.read_text(encoding='utf-8'))
        if not links:
            raise ValueError('Monthly workbook link missing')
        url = html.unescape(urljoin(WB_PAGE, links[0]))
        if not url.startswith('https://thedocs.worldbank.org/'):
            raise ValueError('Unexpected workbook host')
        path, digest = fetch(url)
        return import_world_bank(path, url, digest, checked)

    def abs_data():
        page, _ = fetch(ABS_PAGE)
        text = page.read_text(encoding='utf-8')
        links = re.findall(r'href=["\']([^"\']*/6401010.xlsx[^"\']*)', text)
        if not links:
            raise ValueError('ABS Table 10 link missing')
        url = html.unescape(urljoin(ABS_PAGE, links[0]))
        if not url.startswith('https://www.abs.gov.au/'):
            raise ValueError('Unexpected ABS workbook host')
        # Publication is read from the release metadata, not inferred from observation dates.
        published = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', text)
        if not published:
            published = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})', text)
        path, digest = fetch(url)
        return import_abs(path, url, digest, checked, published[1] if published else None)

    run('world-bank', wb)
    run('abs', abs_data)
    run('eia', lambda: import_eia(*fetch(EIA_PAGE), checked))
    # NBS is manual: explicit --full-nbs imports public releases for initial/reviewed refresh.
    # No unsupported NBS API or unattended crawling is enabled in the scheduled workflow.
    if full_nbs:
        links = {}
        for i in range(17):
            url = NBS_PAGE + (f'index_{i}.html' if i else '')
            try:
                path, _ = fetch(url)
                text = path.read_text(encoding='utf-8')
                for href, title in re.findall(r'<a[^>]+href="([^"]+)"[^>]*title=["\']([^"\']+)', text):
                    if re.match(r'2026年\d+月[上中下]旬流通领域', title):
                        links[urljoin(NBS_PAGE, href)] = title
            except Exception as exc:
                logs.append(dict(source='nbs-list', status='failed', error=str(exc)))
                break
        for url in sorted(links):
            def nbs(url=url):
                path, digest = fetch(url)
                return import_nbs(path, url, digest, checked)
            run(url, nbs)
    previous = read_json(data_dir / 'prices.json', {'schema_version': 1, 'series': []})
    combined, revisions, additions = merge(previous['series'], incoming)
    result = dict(schema_version=1, coverage_start=START, series=combined)
    validate(result, checked)
    write_json(data_dir / 'prices.json', result)
    write_json(data_dir / 'update-report.json', dict(last_checked=checked, sources=logs, additions=additions, revisions=revisions,
                                               policy='Existing observations retained. Review revisions before any replacement.'))
    registry = read_json(data_dir / 'source-registry.json', {})
    registry['imported_series'] = [{**{k:v for k,v in s.items() if k != 'observations'},
                                   'coverage_start': s['observations'][0]['period'] if s['observations'] else None,
                                   'coverage_end': s['observations'][-1]['period'] if s['observations'] else None,
                                   'record_count': len(s['observations']), 'last_checked': max((o['last_checked'] for o in s['observations']), default=None),
                                   'update_mode': 'manual' if s['series_id'].startswith('nbs-') else 'scheduled-review-pr'} for s in combined]
    write_json(data_dir / 'source-registry.json', registry)
    from build_catalog import build
    build(data_dir=data_dir, coverage_path=data_dir.parent / 'COVERAGE.md')
    print(json.dumps(dict(additions=additions, revisions=len(revisions), logs=logs), ensure_ascii=False))
    return not any(log['status'] == 'failed' for log in logs)


def dry_run(checked):
    """Exercise the actual refresh/export path in isolation, retaining diagnostics only."""
    CACHE.mkdir(exist_ok=True)
    report_path = CACHE / 'dry-run-report.json'
    write_json(report_path, {'status': 'started', 'last_checked': checked})
    with tempfile.TemporaryDirectory(prefix='refresh-check-', dir=CACHE) as temporary:
        staged = Path(temporary) / 'data'
        shutil.copytree(DATA, staged)
        try:
            success = refresh(checked, data_dir=staged)
            report = read_json(staged / 'update-report.json')
            report['status'] = 'passed' if success else 'failed'
            write_json(report_path, report)
            return success
        except Exception as exc:
            write_json(report_path, {'status': 'failed', 'last_checked': checked, 'error': str(exc)})
            raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['refresh', 'validate'])
    parser.add_argument('--as-of', default=datetime.now(timezone.utc).date().isoformat())
    parser.add_argument('--full-nbs', action='store_true', help='Manual review only: discover 2026 NBS release pages')
    parser.add_argument('--dry-run', action='store_true', help='Check scheduled sources in isolation; do not modify repository data')
    args = parser.parse_args()
    if args.command == 'validate':
        validate(read_json(DATA / 'prices.json'), args.as_of)
        print('Database validation passed')
    else:
        if args.dry_run and args.full_nbs:
            parser.error('--dry-run checks scheduled sources only; do not combine with --full-nbs')
        sys.exit(0 if (dry_run(args.as_of) if args.dry_run else refresh(args.as_of, args.full_nbs)) else 1)
