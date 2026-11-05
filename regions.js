
const regions={
sydney:{name:'Sydney',image:'assets/sydney.webp',prices:[39.90,1.89,109,5.20]},
melbourne:{name:'Melbourne',image:'https://www.agoda.com/wp-content/uploads/2024/01/Featured-image-Melbourne-CBD-1024x576.jpg',prices:[37.50,1.82,105,4.90]}
};
const items=[['Badminton shuttlecocks','per dozen'],['Unleaded petrol','per litre'],['DDR5 memory · 16GB','per module'],['Flat white','per cup']];
function setRegion(key){const region=regions[key]||regions.sydney;document.getElementById('city').value=regions[key]?key:'sydney';document.querySelector('.hero').style.backgroundImage='linear-gradient(90deg,#f3ece9f5,#f3ece9bd 35%,#f3ece900 70%),url("'+region.image+'")';document.title='The News Behind Price — '+region.name;document.getElementById('city-heading').textContent=region.name+' prices';document.getElementById('city-prices').innerHTML=items.map((item,i)=>'<article class="local-card"><h3>'+item[0]+'</h3><strong>A$ '+region.prices[i].toFixed(2)+'</strong><small>'+item[1]+' · '+region.name+'</small><small>Illustrative example · Not a market quote</small></article>').join('');try{localStorage.setItem('price-region',regions[key]?key:'sydney')}catch{}}
document.getElementById('city').onchange=e=>setRegion(e.target.value);
let initialRegion='sydney';try{initialRegion=localStorage.getItem('price-region')||initialRegion}catch{}setRegion(initialRegion);
