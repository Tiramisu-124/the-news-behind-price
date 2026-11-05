
let selectedCase=window.EDITORIAL_CASES[0].id;
const caseEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderCase(){
const c=window.EDITORIAL_CASES.find(x=>x.id===selectedCase),city=document.getElementById('city').value,values=c[city]||c.australia;
document.getElementById('case-filters').innerHTML=window.EDITORIAL_CASES.map(x=>'<button data-case="'+x.id+'" aria-pressed="'+(x.id===c.id)+'" class="'+(x.id===c.id?'selected':'')+'">'+caseEscape(x.category)+'</button>').join('');
const lo=Math.min(...values)*.9,hi=Math.max(...values)*1.05;
const xy=values.map((v,i)=>[60+i*170,200-(v-lo)/(hi-lo)*155]);
const line=xy.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');
document.getElementById('case-content').innerHTML=`
<div class="case-layout"><article class="case-panel"><span class="eyebrow">${caseEscape(c.category)} · ${caseEscape(city==="china"?"China · 中国":"Australia · 澳大利亚")}</span><h3>${caseEscape(c.name)}</h3><p class="demo-label">ILLUSTRATIVE PRICES · Not observed market data</p><strong class="case-price">${values.at(-1).toFixed(2)} <small>${caseEscape(c.unit.replace("AUD",city==="china"?"CNY":"AUD"))}</small></strong><span class="case-change">${((values.at(-1)/values[0]-1)*100).toFixed(1)}% over example period</span><svg viewBox="0 0 640 250" role="img" aria-label="Illustrative price trend; exact values follow below"><path d="${line}" fill="none" stroke="#3269ff" stroke-width="3"/>${xy.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#3269ff"/><text x="'+p[0]+'" y="234" text-anchor="middle">Example '+(i+1)+'</text>').join('')}</svg><p class="example-values">${values.map((v,i)=>'Example '+(i+1)+': '+v.toFixed(2)).join(' · ')}</p><p>No real observation dates are assigned. These numbers are not taken from the linked report.</p></article>
<article class="case-panel"><span class="eyebrow">01 · ORIGINAL REPORT / SOURCE</span><h3>${caseEscape(c.headline)}</h3><p>${caseEscape(c.summary)}</p><p class="source">${caseEscape(c.publisher)}</p><a class="read-link" href="${caseEscape(c.source)}" target="_blank" rel="noopener noreferrer">Read the original source ↗</a><p>The source provides background; it does not validate the illustrative country prices.</p></article></div>
<article class="case-panel connection"><span class="eyebrow">02 · THE CONNECTION — TEAM ANALYSIS</span><h3>How could this news reach the price tag?</h3><span class="demo-label">Sample interpretation · Replace with your team's reporting</span><ol class="causal-chain">${c.steps.map(s=>'<li>'+caseEscape(s)+'</li>').join('')}</ol><p>${caseEscape(city==="china"?c.chinaAnalysis:c.analysis)}</p><div class="case-layout"><div><h4>What else could affect the price?</h4><p>${caseEscape(c.other)}</p></div><div><h4>Evidence for your team to add</h4><p>${caseEscape(c.evidence)}</p></div></div><p class="draft-credit">Author: team member to add · Review status: draft example · Observation dates: to add</p></article>`;
document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{selectedCase=b.dataset.case;renderCase()});
}
document.getElementById('city').addEventListener('change',renderCase);renderCase();
