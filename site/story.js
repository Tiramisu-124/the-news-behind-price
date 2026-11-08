/* Product detail view: price chart linked to a news timeline. */
(function (root) {
  'use strict';
  const {PRODUCTS, CATEGORIES} = root.Catalogue;
  const D = root.SiteData;
  const el = () => document.getElementById('story');
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).label || '';
  const ts = iso => Date.parse(iso + 'T00:00:00Z');
  const short = iso => D.fmtDate(iso, {day: 'numeric', month: 'short'});
  const GAP_DAYS = 10;
  let chart = null, current = null;

  /* Editorial copy for the Petrol story. Facts are attributed; mechanisms are labelled as such. */
  const PETROL_WHY = [
    {tag: 'Verified', q: 'What happened?', body: `
      <p>A war involving Iran began on 28 February 2026, according to ABC News reporting. Strikes and retaliation led to precautionary shutdowns of oil and gas facilities across the region and disrupted shipping through the Strait of Hormuz.</p>
      <p>At home, the federal government temporarily cut fuel excise from 1 April, partly restored it from 1 July and fully restored it on 3 August (ACCC).</p>`},
    {tag: 'Mechanism', q: 'How does a war overseas reach an Australian bowser?', body: `
      <p>Australia imports most of its petrol already refined, much of it from Asian refineries. The ACCC says local retail prices are “largely determined by movements in international refined fuel benchmark prices” together with the Australian dollar.</p>
      <ol class="chain"><li><b>Crude oil</b> supply is disrupted</li><li><b>Refined petrol</b> prices in Asia (Singapore Mogas 95) rise</li><li><b>Wholesale</b> terminal gate prices in Australia follow within one to two weeks (AIP)</li><li><b>Excise and GST</b> are added</li><li><b>Pump prices</b> adjust, often over a further week or more</li></ol>
      <p class="note">This chain is a widely documented market mechanism. It explains why prices can move, but it does not by itself measure how much of any single move each event caused.</p>`},
    {tag: 'Evidence', q: 'What do the Australian price records show?', body: `<div id="evidence"></div>`},
    {tag: 'Other factors', q: 'What else could explain the changes?', body: `
      <ul><li><b>Tax policy.</b> The excise cut and its restoration were government decisions. They explain part of the April fall and the August rise, independent of world oil prices.</li>
      <li><b>The exchange rate.</b> Fuel is bought in US dollars. A weaker Australian dollar raises local costs even when world prices are flat.</li>
      <li><b>Price cycles and margins.</b> Some cities, such as Perth, have regular weekly price cycles. Retail margins also change from week to week.</li>
      <li><b>Where you live.</b> This series averages the five largest cities. Regional prices and those in smaller capitals differ.</li></ul>`},
    {tag: 'Uncertain', q: 'What remains uncertain?', body: `
      <ul><li>We do not estimate how many cents of any change were caused by the war, the excise, the exchange rate or margins.</li>
      <li>Sources describe the April excise cut differently: SBS reported 26.3 cents a litre at the announcement; the ACCC and ABC describe a 32 cent cut. We have flagged this for editorial review.</li>
      <li>Our series is selected daily averages, not every day. No observations are shown between 2 September and 14 October, or after 21 October, in this preview.</li>
      <li>The prices on this page were transcribed from ACCC PDF reports and are awaiting a second check against each report.</li></ul>`}
  ];

  const CONNECTED = {
    petrol: [
      {id: 'airfares', label: 'Same cause · fuel costs', title: 'Airfares', text: 'Qantas says it will keep raising fares as the conflict lifts its fuel bill.', src: {publisher: 'ABC News', date: '2026-11-06', url: 'https://abc.net.au/news/2026-11-06/qantas-jetstar-fare-increases-fuel-prices/107355602'}},
      {id: 'electricity', label: 'Possible link · under review', title: 'Electricity', text: 'Qatar halted LNG production early in the conflict. Whether that reached Australian power bills has not been established.', src: {publisher: 'InDaily / The New Daily', date: '2026-03-03', url: 'https://www.indailysa.com.au/news/just-in/2026/03/03/middle-east-oil-and-gas-shutdowns'}}
    ]
  };

  function header(p, lead) {
    return `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All</a> / <span>${esc(catLabel(p.category))}</span> / <span aria-current="page">${esc(p.name)}</span></nav>
      <div class="s-top">
        <figure class="s-photo"><img src="${p.photo || p.disc}" alt="${esc(p.alt)}" width="480" height="530" decoding="async"></figure>
        <div class="s-head">
          <p class="eyebrow">${esc(catLabel(p.category))}</p>
          <h1>${esc(p.name)}</h1>
          <p class="s-headline">${esc(p.headline)}</p>
          ${lead}
        </div>
      </div>`;
  }

  // ---------- Petrol (full story)
  function observationsAround(obs, date) {
    const before = [...obs].reverse().find(o => o.date < date && D.days(o.date, date) <= 21);
    const after = obs.find(o => o.date >= date && D.days(date, o.date) <= 14);
    return {before, after};
  }

  function aroundHTML(obs, date) {
    const {before, after} = observationsAround(obs, date);
    if (before && after) {
      const pct = (after.price - before.price) / before.price * 100;
      return `<p class="around"><span class="label">Prices recorded around this date</span><span class="v">${before.price.toFixed(1)} → ${after.price.toFixed(1)} c/L</span><span class="d">${short(before.date)} → ${short(after.date)} · <b class="${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%</b></span></p>`;
    }
    const one = after || before;
    if (one) return `<p class="around"><span class="label">Nearest recorded price</span><span class="v">${one.price.toFixed(1)} c/L</span><span class="d">${short(one.date)}</span></p>`;
    return `<p class="around muted"><span class="label">No price recorded within two weeks of this date</span></p>`;
  }

  async function renderPetrol(p) {
    const story = await D.getJSON(p.data.file);
    const s = story.series, obs = s.observations, last = obs.at(-1);
    const ch = D.recentChange(obs);
    const pending = s.verification_status !== 'verified';
    const lead = `
      <dl class="stats">
        <div><dt>Latest observed price</dt><dd class="big">A$${(last.price / 100).toFixed(2)} <small>/ L</small></dd><dd class="sub">${last.price.toFixed(1)} cents per litre</dd></div>
        <div><dt>Change</dt><dd class="big ${ch && ch.pct >= 0 ? 'up' : 'down'}">${ch ? (ch.pct >= 0 ? '+' : '−') + Math.abs(ch.pct).toFixed(1) + '%' : '—'}</dd><dd class="sub">${ch ? 'since ' + short(ch.from.date) : 'No comparable earlier observation'}</dd></div>
        <div><dt>Observed on</dt><dd class="big date">${D.fmtDate(last.date)}</dd><dd class="sub">Published ${D.fmtDate(last.report_date)}</dd></div>
        <div><dt>Source</dt><dd class="big src">ACCC</dd><dd class="sub">Weekly fuel price monitoring</dd></div>
      </dl>
      <p class="spec"><b>What is measured:</b> ${esc(s.specification)}. <b>Coverage:</b> ${D.fmtDate(obs[0].date)} to ${D.fmtDate(last.date)}, ${obs.length} observations.</p>
      ${pending ? '<p class="status-flag"><span aria-hidden="true">●</span> Preview data: transcribed from ACCC reports and awaiting a second editorial check.</p>' : ''}`;

    el().innerHTML = `<div class="s-wrap">
      ${header(p, lead)}
      <section class="s-chart" aria-labelledby="chartTitle">
        <div class="chart-col">
          <div class="chart-head">
            <h2 id="chartTitle">Price trend in Australia</h2>
            <div class="ranges" role="group" aria-label="Time range" id="ranges"></div>
          </div>
          <p class="axis-note">A$ per litre · regular unleaded · 5 largest cities</p>
          <div id="chart" class="chart" role="img" aria-label="Line chart of ${obs.length} observed daily average petrol prices from ${D.fmtDate(obs[0].date)} to ${D.fmtDate(last.date)}. Use the data table or the timeline below for exact values."></div>
          <ul class="legend">
            <li><span class="k-line"></span>Observed prices, joined when days apart</li>
            <li><span class="k-dot"></span>Longer gap, no observations in between (not an estimate)</li>
            <li><span class="k-news"></span>News event, select to read</li>
          </ul>
          <details class="table">
            <summary>View the ${obs.length} observations as a table</summary>
            <table><caption class="sr-only">Daily average retail petrol prices, 5 largest cities</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Cents per litre</th><th scope="col">A$ per litre</th><th scope="col">ACCC report</th></tr></thead>
              <tbody>${obs.map(o => `<tr><td>${D.fmtDate(o.date)}</td><td>${o.price.toFixed(1)}</td><td>${(o.price / 100).toFixed(3)}</td><td><a href="${esc(o.source_url)}" rel="noopener" target="_blank">${D.fmtDate(o.report_date)}</a></td></tr>`).join('')}</tbody>
            </table>
          </details>
          <p class="source-line">Source: <a href="${esc(s.source_url)}" target="_blank" rel="noopener">${esc(s.source_name)}</a>. ${esc(s.methodology)}</p>
        </div>
        <aside class="why-brief">
          <h2>Why did the price move?</h2>
          <p>Petrol rose sharply after the conflict began and shipping through the Strait of Hormuz was disrupted. A temporary excise cut then pulled pump prices down from April, and they climbed again as the cut was wound back and new attacks hit supply routes.</p>
          <p class="note">Events close together in time are not proof of cause. <a href="#why">Read the full explanation</a></p>
        </aside>
      </section>

      <section class="s-timeline" aria-labelledby="tlTitle">
        <div class="sec-head"><h2 id="tlTitle">Key events</h2><p class="it">Select an event to mark it on the chart.</p></div>
        <ol class="timeline" id="timeline">
          ${story.events.map(ev => `
          <li id="ev-${ev.id}" data-id="${ev.id}" tabindex="0" aria-describedby="ev-${ev.id}-sum">
            <span class="tl-dot" aria-hidden="true"></span>
            <time datetime="${ev.date}">${D.fmtDate(ev.date)}</time>
            <div class="tl-body">
              <h3>${esc(ev.title)}</h3>
              <p id="ev-${ev.id}-sum">${esc(ev.summary)}</p>
              <p class="why-here"><b>Why it matters here:</b> ${esc(ev.relevance)}</p>
              <p class="src"><a href="${esc(ev.url)}" target="_blank" rel="noopener">${esc(ev.publisher)}: “${esc(ev.headline)}” <span aria-hidden="true">↗</span></a> <span class="pub">${D.fmtDate(ev.published)}</span>
              ${ev.editorial_status === 'needs_review' ? `<span class="review" title="${esc(ev.review_note)}">Needs editorial review</span>` : ''}</p>
              ${ev.review_note ? `<p class="review-note">${esc(ev.review_note)}</p>` : ''}
            </div>
            <div class="tl-price">${aroundHTML(obs, ev.date)}</div>
          </li>`).join('')}
        </ol>
        <p class="caution">Price changes shown beside events are observations around that date, not a measure of the event’s effect.</p>
      </section>

      <section class="s-why" id="why" aria-labelledby="whyTitle">
        <div class="sec-head"><h2 id="whyTitle">Why did the price move?</h2><p class="it">What we know, how it could work, and what we can’t yet say.</p></div>
        <div class="why-grid">${PETROL_WHY.map((w, i) => `
          <section class="why-item"><p class="why-num">${String(i + 1).padStart(2, '0')}</p><div><p class="tag tag-${w.tag.toLowerCase().replace(/\s/g, '-')}">${w.tag}</p><h3>${w.q}</h3>${w.body}</div></section>`).join('')}
        </div>
      </section>

      ${connectedHTML(p)}
      ${sourcesFooter(story)}
    </div>`;

    // Evidence paragraph computed from the data so text and chart cannot disagree.
    const find = d => obs.find(o => o.date === d);
    const a = obs[0], peak = obs.reduce((m, o) => o.price > m.price ? o : m), low = obs.filter(o => o.date > peak.date).reduce((m, o) => o.price < m.price ? o : m);
    const cut = find('2026-04-01');
    document.getElementById('evidence').innerHTML = `
      <p>On ${D.fmtDate(a.date)}, before the war, the five-city average was <b>${a.price.toFixed(1)} c/L</b>. By ${D.fmtDate(peak.date)} it had reached <b>${peak.price.toFixed(1)} c/L</b>, ${(((peak.price - a.price) / a.price) * 100).toFixed(1)}% higher.</p>
      ${cut ? `<p>On ${D.fmtDate(cut.date)}, the first day of the excise cut, it was <b>${cut.price.toFixed(1)} c/L</b>. The lowest price recorded after the peak was <b>${low.price.toFixed(1)} c/L</b> on ${D.fmtDate(low.date)}${low.date === '2026-06-30' ? ', the last day before the cut was partly unwound' : ''}.</p>` : ''}
      <p>The latest observation in this preview is <b>${last.price.toFixed(1)} c/L</b> on ${D.fmtDate(last.date)}.</p>
      <p class="note">These figures show what was observed and when. On their own they do not prove which event caused which change.</p>`;

    current = {story, obs};
    initChart(story);
    bindTimeline(story);
  }

  function connectedHTML(p) {
    const items = CONNECTED[p.id] || [];
    if (!items.length) return '';
    return `<section class="s-connected" id="connected" aria-labelledby="conTitle">
      <div class="sec-head"><h2 id="conTitle">Connected stories</h2><p class="it">The same events also reach:</p></div>
      <ul class="con-list">${items.map(c => {
        const q = PRODUCTS.find(x => x.id === c.id);
        return `<li><a class="con" href="#/story/${c.id}"><img src="${q.disc}" alt="" width="96" height="96" loading="lazy"><span class="con-text"><span class="eyebrow">${esc(c.label)}</span><span class="con-title">${esc(c.title)}</span><span class="it">${esc(c.text)}</span></span><span class="arrow" aria-hidden="true">→</span></a>
          <p class="con-src">Reporting: <a href="${esc(c.src.url)}" target="_blank" rel="noopener">${esc(c.src.publisher)}, ${D.fmtDate(c.src.date)}</a></p></li>`;
      }).join('')}</ul></section>`;
  }

  function sourcesFooter(story) {
    const reports = [...new Map(story.series.observations.map(o => [o.source_url, o.report_date])).entries()];
    return `<footer class="s-sources" id="data">
      <h2>Data and sources</h2>
      <div class="src-grid">
        <div><h3>Price series</h3><p>${esc(story.series.specification)}. ${esc(story.series.frequency_note)}</p>
          <p><b>Status:</b> ${story.series.verification_status === 'verified' ? 'Verified' : 'Transcribed, awaiting editorial verification.'} ${esc(story.status_note)}</p></div>
        <div><h3>ACCC reports used</h3><ul class="plain">${reports.map(([u, d]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">Weekly fuel price monitoring report, ${D.fmtDate(d)}</a></li>`).join('')}</ul></div>
        <div><h3>Background benchmarks</h3><p>International benchmarks such as Brent crude are stored for context only and are never shown as Australian prices. ${esc(story.context_benchmarks[0].note)}</p>
          <p><a href="#/sources">How we check prices →</a></p></div>
      </div></footer>`;
  }

  // ---------- Chart
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function chartSeries(obs) {
    const solid = [], dotted = [];
    obs.forEach((o, i) => {
      const prev = obs[i - 1];
      if (prev && D.days(prev.date, o.date) > GAP_DAYS) {
        solid.push([ts(o.date) - 1, null]);
        dotted.push([ts(prev.date), prev.price / 100], [ts(o.date), o.price / 100], [ts(o.date) + 1, null]);
      }
      solid.push({value: [ts(o.date), o.price / 100], obs: o});
    });
    return {solid, dotted};
  }

  function rangeStart(key, obs) {
    const last = ts(obs.at(-1).date), day = 864e5;
    return {all: ts(obs[0].date), ytd: ts(obs.at(-1).date.slice(0, 4) + '-01-01'), '6m': last - 182 * day, '3m': last - 91 * day, '1m': last - 30 * day}[key];
  }

  function initChart(story) {
    const node = document.getElementById('chart');
    if (!root.echarts) { node.innerHTML = '<p class="muted">Chart library could not load. The data table below lists every observation.</p>'; return; }
    if (chart) chart.dispose();
    chart = root.echarts.init(node, null, {renderer: 'svg'});
    const obs = story.series.observations;
    const {solid, dotted} = chartSeries(obs);
    const ink = css('--ink-l'), muted = css('--muted-l'), rule = css('--rule-l'), accent = css('--accent');
    const prices = obs.map(o => o.price / 100);
    const yMin = Math.floor((Math.min(...prices) - .1) * 10) / 10, yMax = Math.ceil((Math.max(...prices) + .15) * 10) / 10;
    const news = story.events.map(e => ({value: [ts(e.date), yMax], ev: e}));

    const fmtA = v => 'A$' + v.toFixed(2);
    chart.setOption({
      animation: !reduceMotion(),
      useUTC: true,
      grid: {left: 52, right: 18, top: 22, bottom: 34},
      textStyle: {fontFamily: 'Inter Tight, system-ui, sans-serif', color: muted},
      xAxis: {type: 'time', min: rangeStart('all', obs) - 5 * 864e5, max: ts(obs.at(-1).date) + 8 * 864e5,
        axisLine: {lineStyle: {color: ink}}, axisTick: {show: false},
        axisLabel: {color: muted, hideOverlap: true, formatter: {month: '{MMM}', year: '{yyyy}', day: '{d} {MMM}'}},
        splitLine: {show: false}},
      yAxis: {type: 'value', min: yMin, max: yMax, interval: .2, axisLabel: {color: muted, formatter: v => v.toFixed(2)}, splitLine: {lineStyle: {color: rule}}},
      tooltip: {trigger: 'item', backgroundColor: css('--paper'), borderColor: rule, textStyle: {color: ink, fontSize: 13}, extraCssText: 'box-shadow:none;border-radius:2px;max-width:260px;white-space:normal',
        formatter: prm => {
          if (prm.seriesName === 'News') return `<b>${D.fmtDate(prm.data.ev.date)}</b><br>${esc(prm.data.ev.title)}<br><span style="color:${muted}">${esc(prm.data.ev.publisher)} · select to read</span>`;
          const o = prm.data && prm.data.obs; if (!o) return '';
          return `<b>${D.fmtDate(o.date)}</b><br>${fmtA(o.price / 100)} per litre (${o.price.toFixed(1)} c/L)<br><span style="color:${muted}">ACCC report, ${D.fmtDate(o.report_date)}</span>`;
        }},
      series: [
        {name: 'Gaps', type: 'line', data: dotted, symbol: 'none', silent: true, connectNulls: false, lineStyle: {color: muted, width: 1.2, type: [2, 4]}, z: 1},
        {name: 'Price', type: 'line', data: solid, connectNulls: false, symbol: 'circle', symbolSize: 7, showSymbol: true,
          itemStyle: {color: ink}, lineStyle: {color: ink, width: 1.8},
          emphasis: {scale: 1.6}, z: 3, markLine: {data: []}},
        {name: 'News', type: 'scatter', data: news, symbol: 'circle', symbolSize: 11, cursor: 'pointer',
          itemStyle: {color: css('--paper'), borderColor: accent, borderWidth: 2}, emphasis: {scale: 1.4, itemStyle: {color: accent}}, z: 5}
      ]
    });
    chart.on('click', prm => { if (prm.seriesName === 'News') selectEvent(prm.data.ev.id, {from: 'chart'}); });
    const ro = new ResizeObserver(() => chart && chart.resize());
    ro.observe(node);
    renderRanges(obs);
  }

  function renderRanges(obs) {
    const box = document.getElementById('ranges');
    const keys = [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['ytd', 'YTD'], ['all', 'All']];
    const enough = k => obs.filter(o => ts(o.date) >= rangeStart(k, obs)).length >= 3;
    box.innerHTML = keys.map(([k, l]) => {
      const ok = enough(k);
      return `<button type="button" data-range="${k}" aria-pressed="${k === 'all'}" ${ok ? '' : 'disabled'} title="${ok ? '' : 'Fewer than three observations in this period'}">${l}</button>`;
    }).join('');
    box.onclick = e => {
      const b = e.target.closest('button[data-range]'); if (!b || b.disabled) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      chart.setOption({xAxis: {min: rangeStart(b.dataset.range, obs) - 3 * 864e5}});
    };
  }

  // ---------- Linking chart and timeline
  function selectEvent(id, {from} = {}) {
    if (!current) return;
    const ev = current.story.events.find(e => e.id === id); if (!ev) return;
    document.querySelectorAll('#timeline li').forEach(li => li.classList.toggle('active', li.dataset.id === id));
    const accent = css('--accent');
    chart && chart.setOption({series: [{}, {markLine: {symbol: 'none', silent: true, animation: !reduceMotion(),
      lineStyle: {color: accent, type: 'dashed', width: 1.2},
      label: {formatter: short(ev.date), color: accent, fontWeight: 600, position: 'insideEndTop'},
      data: [{xAxis: ts(ev.date)}]}}, {}]});
    if (chart) {
      const idx = current.story.events.indexOf(ev);
      chart.dispatchAction({type: 'downplay', seriesIndex: 2});
      chart.dispatchAction({type: 'highlight', seriesIndex: 2, dataIndex: idx});
    }
    const behavior = reduceMotion() ? 'auto' : 'smooth';
    if (from === 'chart') {
      const li = document.getElementById('ev-' + id);
      li.scrollIntoView({behavior, block: 'center'});
      li.focus({preventScroll: true});
    } else {
      const c = document.getElementById('chart').getBoundingClientRect();
      if (c.top < 0 || c.bottom > innerHeight) document.getElementById('chartTitle').scrollIntoView({behavior, block: 'start'});
    }
  }

  function bindTimeline() {
    const tl = document.getElementById('timeline');
    tl.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      const li = e.target.closest('li[data-id]'); if (li) selectEvent(li.dataset.id, {from: 'timeline'});
    });
    tl.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('li[data-id]')) { e.preventDefault(); selectEvent(e.target.dataset.id, {from: 'timeline'}); }
    });
  }

  // ---------- Products whose stories arrive in Phase 2
  async function renderPreview(p) {
    let s;
    try { s = await D.summary(p); } catch (e) { s = {kind: 'none', note: 'Price data could not be loaded.'}; }
    let dataBox;
    if (s.kind === 'index') dataBox = `<dl class="stats"><div><dt>Latest price index</dt><dd class="big">${s.display}</dd><dd class="sub">${esc(s.unit)}</dd></div><div><dt>Period</dt><dd class="big date">${D.fmtDate(s.period + '-01', {month: 'long', year: 'numeric'})}</dd></div><div><dt>Source</dt><dd class="big src">ABS</dd><dd class="sub">Monthly CPI, Sydney</dd></div></dl>
      <p class="spec">${esc(s.spec)}. This is an index, so no dollar price is shown.</p>`;
    else dataBox = `<div class="unavail-box"><p class="label">Australian price data</p><p class="unavail">No verified Australian price series yet</p><p>${esc(s.note)}</p></div>`;
    el().innerHTML = `<div class="s-wrap">${header(p, dataBox)}
      <section class="s-pending"><p class="eyebrow">Story in development</p>
        <h2>${esc(p.theme)}</h2><p>${esc(p.summary)}</p>
        <p class="note">The full story, price chart and verified news timeline for ${esc(p.name.toLowerCase())} are planned for Phase 2. Nothing on this page is a price estimate.</p>
        <p><a class="read dark" href="#/story/petrol">See the finished Petrol story <span aria-hidden="true">→</span></a></p></section></div>`;
  }

  async function render(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (chart) { chart.dispose(); chart = null; }
    current = null;
    if (!p) { el().innerHTML = '<div class="s-wrap"><h1>Story not found</h1><p><a href="#/">Back to all products</a></p></div>'; return; }
    document.title = p.name + ' — The News Behind Price';
    el().innerHTML = '<div class="s-wrap"><p class="muted">Loading…</p></div>';
    try {
      if (p.storyReady) await renderPetrol(p); else await renderPreview(p);
    } catch (e) {
      el().innerHTML = `<div class="s-wrap">${header(p, '<p class="unavail">This story could not be loaded.</p>')}</div>`;
      console.error(e);
    }
  }

  // ---------- Data & sources page
  async function renderSources() {
    const box = document.getElementById('sources');
    document.title = 'Data and sources — The News Behind Price';
    const rows = await Promise.all(PRODUCTS.map(async p => [p, await D.summary(p).catch(() => ({kind: 'none'}))]));
    const status = s => s.kind === 'retail' ? (s.status === 'verified' ? 'Retail price · verified' : 'Retail price · transcribed, awaiting review')
      : s.kind === 'index' ? 'Price index (no dollar price) · verified' : 'Not yet available';
    box.innerHTML = `<div class="s-wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All</a> / <span aria-current="page">Data &amp; sources</span></nav>
      <h1>Data and sources</h1>
      <p class="s-headline">Every figure on this site should lead back to a public record. Where we have no reliable Australian price, we say so.</p>
      <section class="principles"><h2>Our rules</h2><ol>
        <li><b>Australian prices first.</b> Prices are shown in Australian dollars. International benchmarks are kept as background and labelled as such, never converted and shown as local prices.</li>
        <li><b>Retail, wholesale and index are different.</b> A price index is shown as index points, never as a dollar amount.</li>
        <li><b>No invented points.</b> Gaps stay visible. We do not interpolate, estimate or reuse figures from design mock-ups.</li>
        <li><b>Real dates.</b> Each figure shows the date it describes and when it was published, not the date we last looked.</li>
        <li><b>Timing is not cause.</b> News and prices that move together are presented as context, with other explanations alongside.</li></ol></section>
      <section><h2>Data available for each product</h2>
        <table class="avail"><thead><tr><th scope="col">Product</th><th scope="col">Australian data</th><th scope="col">Notes</th></tr></thead>
        <tbody>${rows.map(([p, s]) => `<tr><th scope="row"><a href="#/story/${p.id}">${esc(p.name)}</a></th><td>${status(s)}</td><td>${esc(s.kind === 'none' ? s.note : s.spec)}</td></tr>`).join('')}</tbody></table></section>
      <section><h2>The data pipeline</h2><p>Verified series live in <code>data/prices.json</code>, with source URLs, publisher snapshot hashes and cell locations. Scheduled updates propose changes as pull requests and never publish automatically. See the repository’s README and DATA_AUDIT for the full method.</p></section>
    </div>`;
  }

  root.Story = {render, renderSources};
})(window);
