'use strict';
const items=window.EDITORIAL_CASES, $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:4});
const link=(url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>';
let database={series:[]},registry={},loadState='loading';
let active=items[0],category=active.category,saved=[],seriesChoices={},compare=false;
const chart=echarts.init($('chart'));
try {const stored=JSON.parse(localStorage.getItem('followed-products')||'[]');if(Array.isArray(stored))saved=stored;}catch{}
const market=()=>regions[$('city').value].name;
const available=product=>database.series.filter(s=>s.product_id===product&&s.market===market()&&s.observations.length);
const selected=product=>available(product).find(s=>s.series_id===seriesChoices[product+market()])||available(product)[0];
const units=s=>(s.currency?s.currency+' / ':'')+s.unit;
const reason=product=>registry.availability?.find(a=>a.product_id===product&&a.market===market())?.reason||'No verified historical series has been imported for this product and market.';

function newsForProduct(){
  const region=$('city').value;
  let news=active.regionalNews?.[region]||active.news;
  const bundles=active.bundleRegions?(region==='global'?Object.values(active.bundleRegions):[active.bundleRegions[region]].filter(Boolean)):[];
  if(bundles.length)news=bundles.flatMap(b=>b.stories).map(s=>({...s,title:s.headline_original,summary:s.facts_confirmed}));
  if(!news&&region==='global'&&active.regionalNews)news=Object.values(active.regionalNews).flat();
  if(!news&&active.source)news=[{title:active.headline,summary:active.summary,url:active.source,publisher:active.publisher}];
  return [...new Map((news||[]).map(n=>[n.url,n])).values()].map(n=>{
    const inUrl=n.url?.match(/\/(20\d{2})[/-](\d{2})[/-](\d{2})/);
    const published=n.published||n.newsDate||(inUrl?inUrl.slice(1,4).join('-'):null);
    return {...n,published,date_basis:n.published||n.newsDate?'Publication date':'Date in source URL'};
  });
}
function renderEditorial(news){
  const explanation=($('city').value==='china'?active.chinaAnalysis:active.analysis)||active.analysis||'Editorial explanation is being prepared.';
  $('editorExplanation').innerHTML='<p>'+esc(explanation)+'</p>'+(active.steps?'<ol>'+active.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'')+(active.other?'<p>'+esc(active.other)+'</p>':'');
  if(active.priceContext)$('editorExplanation').innerHTML+='<details><summary>Price events and sources · 2024–2026</summary>'+active.priceContext.map(t=>/^https:\/\//.test(t)?'<p>'+link(t,'Price report')+'</p>':'<p>'+esc(t)+'</p>').join('')+'</details>';
  if(active.regionExplanation)$('editorExplanation').innerHTML+='<h4>China and Australia</h4><p>'+esc(active.regionExplanation)+'</p><p>'+esc(active.conclusion)+'</p>';
  const stories=news.filter(n=>n.how_does_the_story_affect_prices);
  if(stories.length)$('editorExplanation').innerHTML=stories.map(s=>'<section><h4>'+esc(s.title)+'</h4><ul>'+s.how_does_the_story_affect_prices.map(m=>'<li>'+esc(m.mechanism)+(m.evidence_grade==='C'?' (possible mechanism; causality not established)':' (reported evidence)')+'</li>').join('')+'</ul><p>'+esc(s.expected_direction)+'; '+esc(s.possible_lag)+'</p><p>'+esc(s.limitations)+'</p></section>').join('');
  $('story').innerHTML=(active.intro?'<p>'+esc(active.intro)+'</p>':'')+(news.length?news.map((n,i)=>'<article class="news-entry" id="news-'+i+'">'+(n.published?'<small>'+esc(n.date_basis+': '+n.published)+'</small>':'<small>Undated editorial context</small>')+'<h3>'+esc(n.title)+'</h3><p>'+esc(n.summary)+'</p>'+link(n.url,'Read original report')+'</article>').join(''):'<h3>Reporting in progress</h3><p>A verified news link has not yet been added for this product.</p>')+'<p>Editorial context is preserved separately from verified price observations. Related reporting does not establish the cause of a price change.</p>';
}
function render(){
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===category));
  $('products').innerHTML=items.filter(x=>x.category===category).map(x=>{
    const s=selected(x.id),latest=s?.observations.at(-1);
    return '<button data-product="'+x.id+'" aria-pressed="'+(x.id===active.id)+'"><div class="product-illustration"><img alt="" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/'+x.icon+'.svg"></div><h3>'+esc(x.name)+'</h3><small>'+esc(market()+(s?' · '+(s.price_type==='price_index'?'Price index':'Price observations'):''))+'</small><strong>'+(latest?fmt(latest.price):loadState==='loading'?'Loading…':'Data unavailable')+'</strong><small>'+(s?esc(units(s)+' · '+latest.period):'No verified series')+'</small></button>';
  }).join('');
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{active=items.find(x=>x.id===b.dataset.product);compare=false;render();});
  $('category').textContent=active.category;$('productTitle').textContent=active.name;
  const s=selected(active.id),news=newsForProduct();renderEditorial(news);
  $('save').textContent=saved.includes(active.id)?'★ Following':'☆ Follow';$('save').setAttribute('aria-pressed',saved.includes(active.id));
  const choices=available(active.id);
  $('seriesPicker').innerHTML=choices.length?'<label for="seriesSelect">Price series </label><select id="seriesSelect">'+choices.map(v=>'<option value="'+esc(v.series_id)+'" '+(v===s?'selected':'')+'>'+esc(v.source_name+' · '+v.frequency+' · '+v.specification)+'</option>').join('')+'</select>':'';
  if($('seriesSelect'))$('seriesSelect').onchange=()=>{seriesChoices[active.id+market()]=$('seriesSelect').value;compare=false;render();};
  const candidates=s?.comparison_group?database.series.filter(v=>v.product_id===active.id&&v.comparison_group===s.comparison_group):[];
  const comparison=PriceModel.comparison(candidates);
  $('compare').disabled=!comparison;$('compare').checked=compare&&!!comparison;
  $('comparisonNote').textContent=comparison?'Common base period '+comparison.base+' = 100. Changes in each original currency; not exchange-rate adjusted.':'Comparison unavailable: no compatible cross-market series with a common valid base period. Different grades, benchmarks and retail indices are not interchangeable.';
  if(!s){
    $('description').textContent=market()+' · '+(loadState==='error'?'The verified data files could not be loaded. Please retry.':reason(active.id));
    $('price').textContent=loadState==='loading'?'Loading…':'Data unavailable';$('unit').textContent='';$('change').textContent='';$('dateRange').textContent='No verified observations';
    $('dataNote').textContent='No placeholder prices are shown. Existing reporting remains available as editorial context.';
    $('sourceInfo').textContent='';$('table').innerHTML='<tr><td colspan="3">Data unavailable for '+esc(market())+'.</td></tr>';
    chart.clear();chart.setOption({graphic:{type:'text',left:'center',top:'middle',style:{text:loadState==='loading'?'Loading verified observations…':'Data unavailable',fill:'#65715e',fontSize:16}}});return;
  }
  const observations=s.observations,first=observations[0],latest=observations.at(-1);
  $('description').textContent=market()+' · '+s.region+' · '+s.specification;$('price').textContent=fmt(latest.price);$('unit').textContent=units(s);
  document.querySelector('.quote-row .minor').textContent=s.price_type==='price_index'?'Latest recorded index':'Latest recorded price';
  $('dateRange').textContent=first.period+' — '+latest.period;$('change').textContent=observations.length>1?'Period '+((latest.price/first.price-1)*100).toFixed(1)+'%':'Single observation';
  $('dataNote').textContent=(s.limitations||'')+' '+s.frequency+' observations in original units. Monthly and ten-day values describe reporting periods, not prices on the first day. Gaps are not filled; lines join adjacent reported periods only. '+(s.price_type==='price_index'?'This is a price index, not a monetary price. ':'')+(s.attribution||'');
  $('sourceInfo').innerHTML=link(s.source_url,s.source_name)+'<br>Latest observation: '+esc(latest.period)+' · Published: '+esc(latest.publication_date||'not specified')+' · Checked: '+esc(latest.last_checked)+'<br>'+link(s.licence_url,s.licence);
  $('table').innerHTML=observations.map(o=>'<tr><td>'+esc(o.period)+'</td><td>'+fmt(o.price)+' '+esc(units(s))+'</td><td>'+link(o.source_url,s.source_name)+'<small>Published: '+esc(o.publication_date||'not specified')+' · '+esc(o.source_locator)+'</small></td></tr>').join('');
  const plotted=compare&&comparison?comparison.series:[s];
  const datedNews=news.map((n,i)=>({...n,index:i})).filter(n=>n.published&&n.published>=first.observation_date&&n.published<=latest.period_end);
  chart.setOption({animation:false,aria:{enabled:true},legend:{show:plotted.length>1,top:0},grid:{left:18,right:20,top:35,bottom:55,containLabel:true},
    tooltip:{trigger:'axis',renderMode:'richText',formatter:params=>params.filter(p=>p.value?.[1]!=null).map(p=>{
      const source=plotted[p.seriesIndex],record=source.observations.find(o=>PriceModel.time(o.observation_date)===p.value[0]);
      return (record?.period||new Date(p.value[0]).toISOString().slice(0,10))+'\n'+p.seriesName+': '+fmt(p.value[1])+' '+(compare?'index (base 100)':units(source));
    }).join('\n')},xAxis:{type:'time'},yAxis:{type:'value',scale:true,name:compare?'Common base = 100':s.price_type==='price_index'?'Price index':''},
    dataZoom:observations.length>1?[{type:'slider',height:18,bottom:0}]:[],series:plotted.map((v,i)=>({name:v.market+' · '+v.source_name,type:'line',connectNulls:false,smooth:false,showSymbol:true,symbolSize:5,
      data:PriceModel.plot(v),lineStyle:{width:3},itemStyle:i===0?{color:'#3269ff'}:undefined,
      markLine:i===0?{symbol:'none',silent:false,lineStyle:{type:'dashed',color:'#81926d'},label:{show:false},data:datedNews.map(n=>({name:'Publication context: '+n.title,xAxis:PriceModel.time(n.published),newsIndex:n.index}))}:undefined}))},true);
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{category=b.dataset.filter;active=items.find(x=>x.category===category);compare=false;render();});
$('city').addEventListener('change',()=>{setRegion($('city').value);compare=false;render();});
$('compare').onchange=()=>{compare=$('compare').checked;render();};
chart.on('click',params=>{if(params.componentType==='markLine'&&params.data.newsIndex!=null)$('news-'+params.data.newsIndex)?.scrollIntoView({behavior:'smooth',block:'nearest'});});
$('prev').onclick=()=>$('products').scrollBy({left:-300,behavior:'smooth'});$('next').onclick=()=>$('products').scrollBy({left:300,behavior:'smooth'});
function search(){const term=$('search').value.trim().toLowerCase().replace('memory','ram');const found=items.find(x=>(x.name+' '+x.id).toLowerCase().includes(term));$('empty').hidden=!!found;if(found){active=found;category=found.category;compare=false;render();$('discover').scrollIntoView({behavior:'smooth'});}}
$('searchForm').onsubmit=e=>{e.preventDefault();search();};document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.query;search();});
$('save').onclick=()=>{saved=saved.includes(active.id)?saved.filter(x=>x!==active.id):[...saved,active.id];try{localStorage.setItem('followed-products',JSON.stringify(saved));}catch{}render();};
$('methodBtn').onclick=$('methodBtn2').onclick=()=>$('method').showModal();$('closeDialog').onclick=()=>$('method').close();window.addEventListener('resize',()=>chart.resize());render();
Promise.all(['prices','source-registry'].map(name=>fetch('./data/'+name+'.json').then(response=>{if(!response.ok)throw new Error('Data download failed');return response.json();}))).then(([prices,sources])=>{
  if(prices.schema_version!==1||!Array.isArray(prices.series))throw new Error('Unsupported data format');database=prices;registry=sources;loadState='ready';render();
}).catch(error=>{console.error(error);loadState='error';render();});
