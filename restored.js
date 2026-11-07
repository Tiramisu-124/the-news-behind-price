const items=window.EDITORIAL_CASES,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2});
let active=items[0],category=active.category,chart=echarts.init($('chart')),saved=[];
try{saved=JSON.parse(localStorage.getItem('followed-products')||'[]')}catch{}
function render(){
 const q=active.quotes[$('city').value];
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===category));
 $('products').innerHTML=items.filter(x=>x.category===category).map(x=>{const p=x.quotes[$('city').value];return '<button data-product="'+x.id+'" aria-pressed="'+(x.id===active.id)+'"><div class="product-illustration"><img alt="" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/'+x.icon+'.svg"></div><h3>'+esc(x.name)+'</h3><small>'+esc(p.label)+'</small><strong>'+(x.priceDisplay||fmt(p.price))+'</strong><small>'+esc(p.unit)+' · '+esc(p.date)+'</small></button>'}).join('');
 document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{active=items.find(x=>x.id===b.dataset.product);render()});
 $('category').textContent=active.category;$('productTitle').textContent=active.name;$('description').textContent=q.label;$('price').textContent=active.priceDisplay||fmt(q.price);$('unit').textContent=q.unit;
 const points=(q.history.length?q.history:[[q.date,q.price]]).map(([d,v])=>[d.replace('Listing checked ',''),v]).map(([d,v])=>[/^[A-Za-z]{3}$/.test(d)?d+' '+q.date.match(/\d{4}/)[0]:d,v]);
 $('dateRange').textContent=points[0][0]+' — '+points.at(-1)[0];$('change').textContent=points.length>1?'Period '+((points.at(-1)[1]/points[0][1]-1)*100).toFixed(1)+'%':'Single quote';
 $('dataNote').textContent=points.length>1?'Lines connect recorded observations; intermediate prices are not measured.':'Only one dated quote is available; this does not establish a trend.';
 $('table').innerHTML=points.map(([d,v])=>'<tr><td>'+esc(d)+'</td><td>'+fmt(v)+' '+esc(q.unit)+'</td><td><a href="'+esc(q.url)+'" target="_blank" rel="noopener noreferrer">Price source ↗</a></td></tr>').join('');
 const values=points.map(p=>p[1]);const keys=[...new Set([0,points.length-1,values.indexOf(Math.min(...values)),values.indexOf(Math.max(...values))])];
 chart.setOption({animation:false,grid:{left:18,right:20,top:25,bottom:55,containLabel:true},tooltip:{trigger:'axis',renderMode:'richText',valueFormatter:v=>fmt(v)+' '+q.unit},xAxis:{type:'time'},yAxis:{type:'value',scale:true},dataZoom:points.length>1?[{type:'slider',height:18,bottom:0}]:[],series:[{type:'line',data:points.map(([d,v])=>[Date.parse(d),v]),showSymbol:false,symbolSize:7,markPoint:{symbol:'circle',symbolSize:7,label:{show:false},data:keys.map(i=>({coord:[Date.parse(points[i][0]),points[i][1]],value:points[i][1]}))},lineStyle:{color:'#3269ff',width:3},itemStyle:{color:'#3269ff'},areaStyle:{color:'#dce7ff',opacity:.5}}]},true);
 if(active.chartKind==='dram-index'){
 $('dateRange').textContent='Q1 2026 · reported change';$('change').textContent='Historical price table pending';
 $('dataNote').textContent='The document reports a 93–98% quarterly rise in global DRAM contract prices. A retail price history will be plotted once the dated price table is supplied.';
 chart.clear();chart.setOption({graphic:{type:'text',left:'center',top:'middle',style:{text:'RAM price history awaiting data',fill:'#65715e',fontSize:16}}});
 $('table').innerHTML='<tr><td>Q1 2026</td><td>+93–98% QoQ (contract-price change)</td><td><a href="'+active.indexSource+'">TrendForce ↗</a></td></tr>';
 }
 const explanation=($('city').value==='china'?active.chinaAnalysis:active.analysis)||active.analysis||'Editorial explanation is being prepared.';
 $('editorExplanation').innerHTML='<p>'+esc(explanation)+'</p>'+(active.steps?'<ol>'+active.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'')+(active.other?'<p>'+esc(active.other)+'</p>':'');
 $('story').innerHTML=active.source?'<h3>'+esc(active.headline)+'</h3><p>'+esc(active.summary)+'</p><a href="'+esc(active.source)+'" target="_blank" rel="noopener noreferrer">Read '+esc(active.publisher)+' ↗</a><p>Related reporting provides context; it does not establish the cause of every recorded price change.</p>':'<h3>Reporting in progress</h3><p>A verified news link has not yet been added for this product.</p>';
 if(active.priceContext)$('editorExplanation').innerHTML+='<details><summary>Price events and sources · 2024–2026</summary>'+active.priceContext.map(t=>/^https:\/\//.test(t)?'<p><a href="'+esc(t)+'" target="_blank" rel="noopener noreferrer">Price report ↗</a></p>':'<p>'+esc(t)+'</p>').join('')+'</details>';
 if(active.regionExplanation)$('editorExplanation').innerHTML+='<h4>China and Australia</h4><p>'+esc(active.regionExplanation)+'</p><p>'+esc(active.conclusion)+'</p>';
 if(active.news)$('story').innerHTML='<p>'+esc(active.intro)+'</p>'+active.news.map(n=>'<article class="news-entry"><h3>'+esc(n.title)+'</h3><p>'+esc(n.summary)+'</p><a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer">Read original report ↗</a></article>').join('');
 $('save').textContent=saved.includes(active.id)?'★ Following':'☆ Follow';$('save').setAttribute('aria-pressed',saved.includes(active.id));
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{category=b.dataset.filter;active=items.find(x=>x.category===category);render()});
$('city').addEventListener('change',()=>{setRegion($('city').value);render()});
$('prev').onclick=()=>$('products').scrollBy({left:-300,behavior:'smooth'});$('next').onclick=()=>$('products').scrollBy({left:300,behavior:'smooth'});
function search(){const term=$('search').value.trim().toLowerCase().replace('memory','ram');const found=items.find(x=>(x.name+' '+x.id).toLowerCase().includes(term));$('empty').hidden=!!found;if(found){active=found;category=found.category;render();$('discover').scrollIntoView({behavior:'smooth'})}}
$('searchForm').onsubmit=e=>{e.preventDefault();search()};document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.query;search()});
$('save').onclick=()=>{saved=saved.includes(active.id)?saved.filter(x=>x!==active.id):[...saved,active.id];try{localStorage.setItem('followed-products',JSON.stringify(saved))}catch{}render()};
$('methodBtn').onclick=$('methodBtn2').onclick=()=>$('method').showModal();$('closeDialog').onclick=()=>$('method').close();window.addEventListener('resize',()=>chart.resize());render();
