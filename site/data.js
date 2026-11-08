/* Loads the verified database and story files. Never fills gaps or invents values. */
(function (root) {
  'use strict';
  const cache = {};
  const getJSON = url => cache[url] || (cache[url] = fetch(url, {cache: 'no-cache'}).then(r => {
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }));

  const fmtDate = (iso, opts = {day: 'numeric', month: 'short', year: 'numeric'}) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', {...opts, timeZone: 'UTC'});
  const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;

  // Change is only reported between two observations of the same series that are close enough to be comparable.
  function recentChange(obs, maxGapDays = 10) {
    if (obs.length < 2) return null;
    const last = obs.at(-1), prev = obs.at(-2);
    if (days(prev.date, last.date) > maxGapDays) return null;
    return {pct: (last.price - prev.price) / prev.price * 100, from: prev, to: last};
  }

  async function summary(product) {
    const d = product.data;
    if (d.kind === 'story') {
      const story = await getJSON(d.file), s = story.series, obs = s.observations;
      const last = obs.at(-1);
      return {
        kind: 'retail', status: s.verification_status, value: last.price, date: last.date,
        display: 'A$' + (last.price / 100).toFixed(2), unit: 'per litre',
        spec: 'Regular unleaded, 5 largest cities average', publisher: 'ACCC',
        change: recentChange(obs), story
      };
    }
    if (d.kind === 'index') {
      const db = await getJSON('data/prices.json');
      const s = db.series.find(x => x.series_id === d.seriesId);
      if (!s || !s.observations.length) return {kind: 'none', note: 'Series unavailable.'};
      const obs = s.observations.map(o => ({date: o.observation_date, price: o.price, period: o.period}));
      const last = obs.at(-1);
      return {
        kind: 'index', status: 'verified', value: last.price, date: last.period_end || last.date, period: last.period,
        display: last.price.toFixed(1), unit: s.unit, spec: s.specification, publisher: 'ABS',
        change: recentChange(obs, 35)
      };
    }
    return {kind: 'none', note: d.note};
  }

  root.SiteData = {getJSON, summary, fmtDate, days, recentChange};
})(window);
