const regions = {
  global: {name:'Global',image:'assets/sydney.webp'},
  australia: {name:'Australia',image:'assets/sydney.webp'},
  china: {name:'China',image:'https://images.unsplash.com/photo-1668333140118-84e827fe42ca?auto=format&fit=crop&w=2000&q=85'}
};
function setRegion(key) {
  key = Object.hasOwn(regions,key) ? key : 'global';
  const region = regions[key];
  document.getElementById('city').value = key;
  document.querySelector('.hero').style.backgroundImage = 'linear-gradient(90deg,#f3ece9f5,#f3ece9bd 35%,#f3ece900 70%),url("'+region.image+'")';
  document.title = 'The News Behind Price — '+region.name;
  try {localStorage.setItem('price-country',key);} catch {}
}
let initialRegion = 'global';
try {initialRegion=localStorage.getItem('price-country')||initialRegion;} catch {}
setRegion(initialRegion);
