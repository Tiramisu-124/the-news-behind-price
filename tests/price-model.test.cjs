const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../price-model.js');
const observation=(date,price)=>({period:date.slice(0,7),observation_date:date,period_end:date.slice(0,7)+'-28',price});
test('monthly gaps are null, never interpolated',()=>{
  const data=model.plot({frequency:'monthly',observations:[observation('2026-01-01',100),observation('2026-03-01',120)]});
  assert.deepEqual(data.map(x=>x[1]),[100,null,120]);
  assert.equal(data[1][0],Date.UTC(2026,1,1));
});
test('daily and weekly missing observations stay missing',()=>{
  for(const [frequency,last,count] of [['daily','2026-01-03',3],['weekly','2026-01-15',3]]){
    const result=model.plot({frequency,observations:[observation('2026-01-01',2),observation(last,4)]});
    assert.equal(result.length,count);assert.equal(result[1][1],null);
  }
});
test('ten-day dates follow calendar periods across month boundaries',()=>{
  assert.equal(model.nextDate('2026-02-21','ten_day'),'2026-03-01');
  assert.equal(model.nextDate('2026-01-11','ten_day'),'2026-01-21');
});
test('normalised comparisons require reviewed compatibility and shared dates',()=>{
  const a={market:'Australia',comparison_group:'test-only-identical-grade',frequency:'monthly',price_type:'retail',observations:[observation('2026-01-01',10),observation('2026-02-01',12)]};
  const b={...a,market:'China',observations:[observation('2026-01-01',50),observation('2026-02-01',55)]};
  const result=model.comparison([a,b]);
  assert.equal(result.base,'2026-01');assert.deepEqual(result.series[0].observations.map(o=>o.price),[100,120]);
  assert.ok(Math.abs(result.series[1].observations[1].price-110)<1e-10);
  assert.equal(model.comparison([a,{...b,comparison_group:null}]),null);
  assert.equal(model.comparison([a,{...b,frequency:'daily'}]),null);
  assert.equal(model.comparison([a,{...b,price_type:'price_index'}]),null);
  assert.equal(model.comparison([a,{...b,observations:b.observations.slice(1)}]),null);
  assert.equal(model.comparison([a,a]),null);
});
test('empty and single-observation series do not invent points',()=>{
  assert.deepEqual(model.plot({frequency:'daily',observations:[]}),[]);
  assert.equal(model.plot({frequency:'daily',observations:[observation('2026-01-01',2)]}).length,1);
});
