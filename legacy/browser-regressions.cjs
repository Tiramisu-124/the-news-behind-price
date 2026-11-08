const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),prefix='/the-news-behind-price/';
 const server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost');
   if(!url.pathname.startsWith(prefix)){res.writeHead(404);return res.end();}
   const name=url.pathname.slice(prefix.length)||'index.html',file=path.resolve(root,name);
   if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
   fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const database=JSON.parse(fs.readFileSync(path.join(root,'data/prices.json'),'utf8'));
 const getSeries=id=>database.series.find(s=>s.series_id===id);
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+prefix);await page.waitForFunction(()=>loadState==='ready');
  async function choose(region,product){await page.selectOption('#city',region);await page.fill('#search',product);await page.locator('#searchForm button').click();}
  await choose('global','oil');await page.selectOption('#seriesSelect','eia-brent-daily');
  assert.equal(await page.locator('#price').innerText(),getSeries('eia-brent-daily').observations.at(-1).price.toLocaleString('en-US',{maximumFractionDigits:4}));
  assert.equal(await page.locator('#unit').innerText(),'USD / barrel');
  const daily=await page.evaluate(()=>chart.getOption().series[0].data);assert.ok(daily.some(p=>p[1]===null));
  assert.equal(await page.evaluate(()=>chart.getOption().xAxis[0].type),'time');
  await choose('china','copper');assert.equal(await page.locator('#unit').innerText(),'CNY / tonne');
  assert.equal(await page.locator('#table tr').count(),getSeries('nbs-copper').observations.length);
  assert.ok((await page.locator('#sourceInfo').innerText()).includes('National Bureau'));
  await choose('australia','milk');assert.equal(await page.locator('.quote-row .minor').innerText(),'Latest recorded index');
  assert.ok((await page.locator('#description').innerText()).includes('Sydney'));
  await page.selectOption('#city','global');
  assert.equal(await page.locator('#price').innerText(),'Data unavailable');
  assert.equal(await page.locator('.quote-row .minor').innerText(),'Latest recorded price');
  assert.equal(await page.locator('#sourceInfo').innerText(),'');
  await choose('global','coffee');
  const tooltip=await page.evaluate(()=>{
    const s=selected(active.id),o=s.observations[0],formatter=chart.getOption().tooltip[0].formatter;
    return formatter([{value:[PriceModel.time(o.observation_date),o.price],seriesIndex:0,seriesName:s.source_name}]);
  });assert.ok(tooltip.includes('2026-01'));assert.ok(tooltip.includes('USD / kg'));
  // ECharts invokes the same global formatter with a single item for a markLine hover.
  const marker=await page.evaluate(()=>chart.getOption().tooltip[0].formatter({componentType:'markLine',name:'Publication context',data:{name:'Publication context'},value:Date.UTC(2026,5,1)}));
  assert.ok(typeof marker==='string');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['Pages project subpath','daily gaps','China period table','Sydney index','empty-state label reset','period tooltip','publication marker tooltip']}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
