// Browser checks for the Australian editorial redesign. Requires Playwright + Chromium (test-only).
// Run: node tests/redesign-browser.cjs   (serves the repo under the GitHub Pages project path)
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp'};

(async () => {
  const root = path.resolve(__dirname, '..'), prefix = '/the-news-behind-price/';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404); return res.end(); }
    const file = path.resolve(root, url.pathname.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(data); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}${prefix}`;
  const story = JSON.parse(fs.readFileSync(path.join(root, 'data/stories/petrol.json'), 'utf8'));
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_EXECUTABLE ? {executablePath: process.env.CHROME_EXECUTABLE} : {})});
  const errors = [];
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto(base);

    // Ten products, Shuttlecocks featured by default, no country selector.
    await page.waitForSelector('.disc-item');
    assert.equal(await page.locator('.disc-item').count(), 10);
    await page.waitForFunction(() => document.querySelector('#fName').textContent === 'Shuttlecocks');
    assert.equal(await page.locator('select, [data-market], #city').count(), 0, 'no market selector');
    await page.waitForFunction(() => /No verified Australian price/.test(document.querySelector('#fPrice').textContent));

    // Selecting Petrol shows the latest transcribed ACCC observation, not a mock-up value.
    await page.click('.disc-item[data-id="petrol"]');
    await page.waitForFunction(() => document.querySelector('#fName').textContent === 'Petrol' && /A\$/.test(document.querySelector('#fPrice').textContent));
    const last = story.series.observations.at(-1);
    assert.match(await page.textContent('#fPrice'), new RegExp('A\\$' + (last.price / 100).toFixed(2).replace('.', '\\.')));
    assert.doesNotMatch(await page.textContent('body'), /72\.99|2\.14 \/ L/);

    // Beef shows an index, never a dollar amount.
    await page.click('.disc-item[data-id="beef"]');
    await page.waitForFunction(() => /index points/.test(document.querySelector('#fPrice').textContent));
    assert.doesNotMatch(await page.textContent('#fPrice'), /A\$/);

    // Keyboard navigation on the rail.
    await page.focus('.disc-item[data-id="beef"]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#fName').textContent === 'Bananas');

    // Category filtering without reload.
    await page.click('#catNav button[data-cat="living"]');
    assert.equal(await page.locator('.disc-item').count(), 2);
    await page.waitForFunction(() => document.querySelector('#fName').textContent === 'Electricity');
    await page.click('#catNav button[data-cat="all"]');

    // Petrol story: chart, timeline, linking.
    await page.goto(base + '#/story/petrol');
    await page.waitForSelector('#chart svg');
    assert.equal(await page.locator('#timeline li').count(), story.events.length);
    assert.equal(await page.locator('details.table tbody tr').count(), story.series.observations.length);
    assert.equal(await page.locator('#ranges button[data-range="1m"]').isDisabled(), true, '1M disabled with < 3 observations');
    await page.click('#ev-excise-cut h3');
    assert.ok(await page.locator('#ev-excise-cut.active').count());
    await page.waitForFunction(() => [...document.querySelectorAll('#chart svg text')].some(t => t.textContent === '1 Apr'));
    assert.ok(await page.locator('#home[hidden]').count(), 'home hidden on story view');

    // Phase 2 products open an honest preview page.
    await page.goto(base + '#/story/rent');
    await page.waitForSelector('.s-pending');
    assert.match(await page.textContent('#story'), /No verified Australian price series yet/);

    // Mobile: no horizontal page scroll.
    const mobile = await browser.newPage({viewport: {width: 390, height: 844}});
    await mobile.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    for (const hash of ['#/', '#/story/petrol']) {
      await mobile.goto(base + hash); await mobile.waitForTimeout(800);
      const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `horizontal overflow ${overflow}px on ${hash}`);
    }
    assert.deepEqual(errors, []);
    console.log('redesign browser checks passed');
  } finally {
    await browser.close(); server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
