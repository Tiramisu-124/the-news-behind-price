// Local-market policy: currency conversion alone never establishes local provenance.
window.LOCAL_MARKET_ARCHIVE = JSON.parse(JSON.stringify(window.EDITORIAL_CASES));
for (const item of window.EDITORIAL_CASES) {
  for (const region of ['australia', 'china']) {
    const q = item.quotes[region];
    const converted = q.originalUnit && !q.originalUnit.includes('Australian cents');
    const unavailable = converted || ['memory', 'copper', 'gold'].includes(item.id);
    if (item.bundleRegions?.[region]) {
      item.bundleRegions[region].series = item.bundleRegions[region].series.filter(s => !s.originalUnit);
      if (!item.bundleRegions[region].series.length) delete item.bundleRegions[region];
    }
    if (unavailable) {
      item.quotes[region] = { price: null, priceDisplay: 'Not available', unit: region === 'china' ? 'CNY' : 'AUD', label: 'Local price source awaiting verification', date: 'Not available', url: '', history: [], missingLocal: true };
      if (item.docViews) delete item.docViews[region];
    }
  }
}
const localGold = window.EDITORIAL_CASES.find(i => i.id === 'gold');
localGold.quotes.australia = {
  price: 6097.49, unit: 'AUD / 1 oz cast bar', label: 'The Perth Mint · indicative sell price · 1 ounce gold cast bar',
  date: '2026-11-07', history: [['2026-11-07', 6097.49]], url: 'https://www.perthmint.com/gold-silver-prices/',
  sourceTimestamp: '07 November 2026, 05:59:57 AM (as published)',
  sourceNote: 'Manually checked snapshot. The source updates its prices; this saved observation is not a live feed. Final prices are confirmed by the dealer.'
};
localGold.quotes.china = {
  price: 957.92, unit: 'CNY / gram', label: 'Shanghai Gold Exchange · Au99.99 daily close',
  date: '2026-09-01', history: [['2026-09-01', 957.92]],
  url: 'https://www.sge.com.cn/sjzx/quotation_daily_new?end_date=2026-09-01&inst_ids=&p=&start_date=2026-09-01',
  sourceNote: 'Historical exchange close, not a live quote or jewellery retail price. This is a different instrument from the Australian dealer bar quote.'
};
function renderLocalProvenance(item, region, quote, series, view) {
  const panel = document.getElementById('priceSource');
  const regionName = region === 'china' ? 'China' : 'Australia';
  const missing = quote.missingLocal;
  if (missing) {
    chart.clear();
    chart.setOption({graphic:{type:'text',left:'center',top:'middle',style:{text:'Local price data not yet available',fontSize:15,fill:'#65715e'}}});
    document.getElementById('price').textContent = 'Not available';
    document.getElementById('dateRange').textContent = regionName;
    document.getElementById('change').textContent = 'No verified local series';
    document.getElementById('table').innerHTML = '<tr><td colspan="3">No local observations available.</td></tr>';
    document.getElementById('dataNote').textContent = 'International benchmarks and converted import/export unit values are excluded from this local view. No replacement prices have been estimated.';
  }
  const urls = [...new Set((missing ? [] : series ? series.observations.map(o=>o.url) : view ? view.urls : [item.docViews?.[region]?.url || quote.url]).filter(Boolean))];
  panel.innerHTML = '<strong>Data source · '+regionName+'</strong><p>'+ (missing ? 'No verified local price source connected.' : urls.map(url=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(url).hostname)+' ↗</a>').join(' · '))+'</p><p>'+ (missing ? 'Status: unavailable' : 'Status: historical / saved observation · Price date: '+esc(quote.sourceTimestamp || quote.date))+'</p><p>'+esc(quote.sourceNote || 'Source links describe the original records. These observations do not update automatically; market indicators and retail prices are identified separately.')+'</p>';
  const market = document.getElementById('marketAvailability');
  market.hidden = !['gold','copper','crude','beans','cotton'].includes(item.id);
  market.textContent = 'Live local market feed: not connected. A verified feed with publication permission is required. Historical observations are not labelled live.';
  if (missing) {
    document.getElementById('editorExplanation').innerHTML = '<p>No verified local price series is connected for this product in '+regionName+'. A local price explanation will be added with its supporting evidence.</p>';
    document.getElementById('story').innerHTML = '<h3>Local reporting pending</h3><p>Reporting will be linked to the selected local market once its price source is verified.</p>';
  }
}
