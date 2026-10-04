import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { reportingWindow, analyticsQueries, collect, refresh } from './worker.mjs';
const now=Date.parse('2026-10-05T01:00:00+08:00');
const replies={
 yesterday:[[3,2,2]],week:[[5,4,4]],month:[[5,4,4]],
 hourly:[['2026-10-04T09:00:00',3]],daily:[['2026-10-03',2,2,2],['2026-10-04',2,3,2]],
 weekly:[['2026-09-28',4,5,4]],monthly:[['2026-10-01',4,5,4]],
 sources:[['直接访问',4]],devices:[['Desktop',4]],browsers:[['Chrome',4]],countries:[],
 components:[['nav',2,2]],variants:[],formats:[],actions:[['copy_click',2],['copy_success',1],['copy_failure',1]],
 funnel:[[4,2,1]],paths:[['$pageview → component_select → copy_success',1]],
};
const ids=new Map(analyticsQueries(now).queries.map(q=>[q.name,q.id]));
const fetcher=async(url,options)=>{
 assert.equal(url,'https://us.posthog.com/api/projects/645031/query/');
 const body=JSON.parse(options.body);
 assert.match(body.query.query,/properties\.\$host = 'suekit\.jiongxiaosu0830\.workers\.dev'/);
 return Response.json({results:replies[ids.get(body.name)]});
};
test('UTC+8 day boundaries cross month and year correctly',()=>{
 const w=reportingWindow(Date.parse('2027-01-01T01:00:00+08:00'));
 assert.equal(new Date(w.startAt).toISOString(),'2026-12-30T16:00:00.000Z');
 assert.equal(new Date(w.endExclusive).toISOString(),'2026-12-31T16:00:00.000Z');
});
test('complete summary, sessions, rolling trends, funnel and paths are consistent',async()=>{
 const d=await collect({POSTHOG_READ_KEY:'test'},now,fetcher);
 assert.equal(d.visitors,2);assert.equal(d.sessions,2);assert.equal(d.pageviews,3);
 assert.equal(d.hourly.length,24);assert.equal(d.hourly[9].pageviews,3);
 assert.equal(d.trends.daily.length,30);assert.equal(d.trends.weekly.length,12);assert.equal(d.trends.monthly.length,12);
 assert.equal(d.trends.weekly.at(-1).date,'2026-09-28');
 assert.equal(d.trends.monthly.at(-1).date,'2026-10-01');
 assert.equal(d.periods.month.visitors,4); // Unique visitors are not added across days.
 assert.equal(d.copy.copy_failure,1);assert.equal(d.funnel.conversionRate,.25);
 assert.deepEqual(d.paths[0],{steps:['访问网站','选择组件','复制成功'],count:1});
 assert.equal(d.components[0].name,'导航');
 assert.equal(d.nextUpdateAt,'2026-10-05T17:00:00.000Z');
 assert.equal(JSON.stringify(d).includes('test'),false);
});
test('empty traffic has unknown conversion rates rather than fabricated zero percent',async()=>{
 const d=await collect({POSTHOG_READ_KEY:'test'},now,async(url,options)=>{
 const id=ids.get(JSON.parse(options.body).name);return Response.json({results:['yesterday','week','month','funnel'].includes(id)?[[0,0,0]]:[]});
 });
 assert.equal(d.funnel.conversionRate,null);assert.equal(d.funnel.copyRate,null);
 assert.equal(d.visitors,0);assert.deepEqual(d.paths,[]);
});
test('API failures, inconsistent series or inverted funnel never overwrite cache',async()=>{
 let writes=0;const env={POSTHOG_READ_KEY:'test',ANALYTICS_CACHE:{put:async()=>writes++}};
 await assert.rejects(refresh(env,now,async()=>new Response('',{status:401})));
 for(const [id,changed] of [['yesterday',[[99,2,2]]],['funnel',[[4,1,2]]]]){
 await assert.rejects(refresh(env,now,async(url,options)=>{
 const name=JSON.parse(options.body).name;return Response.json({results:ids.get(name)===id?changed:replies[ids.get(name)]});
 }));}
 assert.equal(writes,0);
});
test('public requests read cache only; cross-origin and unsupported methods are refused',async()=>{
 const env={ANALYTICS_CACHE:{get:async()=>null}};
 assert.equal((await worker.fetch(new Request('https://example.com/analytics.json'),env)).status,503);
 assert.equal((await worker.fetch(new Request('https://example.com/analytics.json',{method:'POST'}),env)).status,405);
 assert.equal((await worker.fetch(new Request('https://example.com/analytics.json',{headers:{Origin:'https://unrelated.example'}}),env)).status,403);
 const data=await collect({POSTHOG_READ_KEY:'test'},now,fetcher);
 const r=await worker.fetch(new Request('https://example.com/analytics.json',{headers:{Origin:'https://yisu0830.github.io'}}),{ANALYTICS_CACHE:{get:async()=>data}});
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://yisu0830.github.io');
 assert.equal((await r.json()).provider,'PostHog');
});
