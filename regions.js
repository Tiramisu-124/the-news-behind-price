
const regions={
australia:{name:'Australia',currency:'AUD',image:'assets/sydney.webp'},
china:{name:'China',currency:'CNY',image:'https://images.unsplash.com/photo-1668333140118-84e827fe42ca?auto=format&fit=crop&w=2000&q=85'}
};
function setRegion(key){key=key==='china'?'china':'australia';const region=regions[key];document.getElementById('city').value=key;document.querySelector('.hero').style.backgroundImage='linear-gradient(90deg,#f3ece9f5,#f3ece9bd 35%,#f3ece900 70%),url("'+region.image+'")';document.title='The News Behind Price — '+region.name;try{localStorage.setItem('price-country',key)}catch{}}
document.getElementById('city').onchange=e=>setRegion(e.target.value);
let initialRegion='australia';try{initialRegion=localStorage.getItem('price-country')||initialRegion}catch{}setRegion(initialRegion);
