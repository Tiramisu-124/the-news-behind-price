
const catalog = window.EDITORIAL_CASES;
const byId = id => document.getElementById(id);
const country = () => byId('city').value;
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format = n => n.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
let selected = catalog[0];
function showStory(item) {
  selected = item;
  const quote = item.quotes[country()];
  const history = quote.history.map(([date,value]) => '<li><small>'+date+'</small>'+format(value)+'</li>').join('');
  const report = item.source ? '<h3>'+escapeText(item.headline)+'</h3><p>'+escapeText(item.summary)+'</p><a href="'+item.source+'">Read '+escapeText(item.publisher)+' ↗</a>' : '<p>Reporting in progress.</p>';
  const analysis = country()==='china' ? item.chinaAnalysis : item.analysis;
  const explanation = (analysis||'').split(/(?<=[.!?])\s+/).filter(s=>!/fictional|illustrative|example Australian|plotted values/i.test(s)).join(' ');
  byId('case-content').innerHTML = '<div class="case-layout"><article class="case-panel"><small>'+item.category+'</small><h3>'+item.name+'</h3><strong class="case-price">'+format(quote.price)+' <small>'+quote.unit+'</small></strong><p>'+escapeText(quote.label)+' · '+quote.date+'</p><a href="'+escapeText(quote.url)+'">Price source ↗</a>'+(history?'<h4>Recorded prices</h4><ul class="history">'+history+'</ul>':'')+'</article><article class="case-panel"><small>Original report</small>'+report+'</article></div><article class="case-panel connection"><small>Team analysis · Member '+item.member+'</small><h3>How does the story affect prices?</h3><p>'+escapeText(explanation||'Analysis in preparation.')+'</p>'+(item.steps?'<ol class="causal-chain">'+item.steps.map(s=>'<li>'+escapeText(s)+'</li>').join('')+'</ol><p>'+escapeText(item.other)+'</p>':'')+'</article>';
  document.querySelectorAll('[data-product]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.product===item.id)));
}
function renderRails() {
  const groups = [...new Set(catalog.map(item=>item.category))];
  byId('case-filters').innerHTML = groups.map((group,i)=>{
    const cards=catalog.filter(item=>item.category===group).map(item=>{
      const q=item.quotes[country()];
      return '<button class="quote-card" data-product="'+item.id+'"><img alt="" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/'+item.icon+'.svg"><span><b>'+item.name+'</b><small>'+escapeText(q.label)+'</small><strong>'+format(q.price)+' '+q.unit+'</strong><small>'+q.date+'</small></span></button>';
    }).join('');
    return '<div class="rail-title"><h3>'+group+'</h3><div><button data-rail="'+i+'" data-dir="-1" aria-label="Previous '+group+'">←</button><button data-rail="'+i+'" data-dir="1" aria-label="Next '+group+'">→</button></div></div><div class="quote-rail" id="rail-'+i+'">'+cards+'</div>';
  }).join('');
  document.querySelectorAll('[data-rail]').forEach(b=>b.onclick=()=>{const rail=byId('rail-'+b.dataset.rail);rail.scrollBy({left:Number(b.dataset.dir)*(rail.firstElementChild.offsetWidth+16),behavior:'smooth'})});
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>showStory(catalog.find(item=>item.id===b.dataset.product)));
  showStory(selected);
}
byId('city').addEventListener('change',renderRails);
byId('methodBtn').onclick=()=>byId('method').showModal();
byId('closeDialog').onclick=()=>byId('method').close();
byId('search').oninput=()=>byId('search').setCustomValidity('');
byId('searchForm').onsubmit=event=>{
 event.preventDefault();
 const key=byId('search').value.trim().toLowerCase();
 const item=catalog.find(x=>(x.name+' '+x.id+' '+x.category).toLowerCase().includes(key));
 if(!item){byId('search').setCustomValidity('No matching product.');byId('search').reportValidity();return;}
 showStory(item);document.querySelector('[data-product="'+item.id+'"]').scrollIntoView({block:'center',inline:'center'});
};
renderRails();
