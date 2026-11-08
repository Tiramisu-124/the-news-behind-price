(function (root) {
  'use strict';
  const time = value => Date.parse(value + 'T00:00:00Z');
  function nextDate(date, frequency) {
    const d = new Date(time(date));
    if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
    else if (frequency === 'ten_day') {
      if (d.getUTCDate() === 1) d.setUTCDate(11);
      else if (d.getUTCDate() === 11) d.setUTCDate(21);
      else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1); }
    } else d.setUTCDate(d.getUTCDate() + (frequency === 'weekly' ? 7 : 1));
    return d.toISOString().slice(0, 10);
  }
  function plot(series) {
    const observations = series.observations;
    if (!observations.length) return [];
    const byDate = new Map(observations.map(o => [o.observation_date, o.price]));
    const points = [];
    for (let d = observations[0].observation_date; d <= observations.at(-1).observation_date; d = nextDate(d, series.frequency)) points.push([time(d), byDate.get(d) ?? null]);
    return points;
  }
  function comparison(series) {
    if (series.length < 2 || new Set(series.map(s => s.market)).size < 2) return null;
    const first = series[0];
    if (!first.comparison_group || series.some(s => s.comparison_group !== first.comparison_group || s.frequency !== first.frequency || s.price_type !== first.price_type)) return null;
    // Compatibility is an explicit reviewed declaration, never guessed from product names.
    const common = first.observations.filter(o => series.every(s => s.observations.some(p => p.period === o.period && p.observation_date === o.observation_date && p.period_end === o.period_end && p.price > 0)));
    if (common.length < 2) return null;
    const base = common[0];
    return {base:base.period, series:series.map(s => {
      const denominator = s.observations.find(o => o.period === base.period).price;
      return {...s,observations:s.observations.filter(o => o.observation_date >= base.observation_date).map(o => ({...o,price:o.price/denominator*100}))};
    })};
  }
  const api = {time,nextDate,plot,comparison};
  if (typeof module !== 'undefined') module.exports = api;
  else root.PriceModel = api;
})(typeof window === 'undefined' ? globalThis : window);
