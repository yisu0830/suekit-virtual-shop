import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker,{collect,refresh,accessToken,reportingWindow} from './ga4-worker.mjs';
const now=Date.parse('2026-10-06T01:00:00+08:00');
const tokenProvider=async()=> 'mock-read-only-token';
function mockReport(url,options){
 assert.equal(url,'https://analyticsdata.googleapis.com/v1beta/properties/557412742:runReport');
 const body=JSON.parse(options.body);assert.match(JSON.stringify(body.dimensionFilter),/suekit\.jiongxiaosu0830\.workers\.dev/);
 assert.equal(options.headers.Authorization,'Bearer mock-read-only-token');
 const dims=(body.dimensions||[]).map(x=>x.name),metrics=body.metrics.map(x=>x.name);
 const row=(d,m)=>({dimensionValues:d.map(value=>({value})),metricValues:m.map(value=>({value:String(value)}))});
 const rows=[];
 if(dims[0]==='date')rows.push(row(['20261005'],[2,3,2]));
 else if(dims[0]==='dateHour')rows.push(row(['2026100509'],[3]));
 else if(!dims.length&&body.dateRanges[0].endDate==='2026-10-05')rows.push(row([],metrics.map(m=>m==='screenPageViews'?3:2)));
 return Promise.resolve(Response.json({rows,rowCount:rows.length,metadata:{timeZone:'Asia/Singapore'}}));
}
test('SueKit reports never read the independent shop property and keep unique totals',async()=>{
 const data=await collect({},now,mockReport,tokenProvider);
 assert.equal(data.provider,'Google Analytics 4');assert.equal(data.projectId,'557412742');
 assert.equal(data.pageviews,3);assert.equal(data.periods.month.visitors,2);
 assert.equal(data.hourly[9].pageviews,3);assert.equal(data.trends.daily.length,30);
 assert.equal(data.trends.weekly.length,12);assert.equal(data.trends.monthly.length,12);
 assert.equal(data.funnel,null);assert.deepEqual(data.paths,[]);
 assert.equal(JSON.stringify(data).includes('mock-read-only-token'),false);
 await assert.rejects(collect({GA4_PROPERTY_ID:'557381679'},now,mockReport,tokenProvider),/Unexpected reporting property/);
});
test('failed, truncated, thresholded, wrong-timezone or inconsistent reports preserve the previous cache',async()=>{
 let writes=0;const env={ANALYTICS_CACHE:{put:async()=>writes++}};
 for(const fetcher of [async()=>new Response('',{status:403}),async()=>Response.json({rowCount:10,rows:[]}),async()=>Response.json({metadata:{subjectToThresholding:true}}),async()=>Response.json({metadata:{timeZone:'UTC'}})])await assert.rejects(refresh(env,now,fetcher,tokenProvider));
 await assert.rejects(refresh(env,now,async(url,options)=>{
  const body=JSON.parse(options.body);if(body.dimensions?.[0]?.name==='dateHour')return Response.json({rows:[],rowCount:0});return mockReport(url,options);
 },tokenProvider),/Inconsistent/);
 assert.equal(writes,0);
});
test('public endpoint only reads cached aggregates and rejects cross-origin writes',async()=>{
 const env={ANALYTICS_CACHE:{get:async()=>({provider:'Google Analytics 4',nextUpdateAt:new Date(now).toISOString()})}};
 assert.equal((await worker.fetch(new Request('https://example.com/analytics.json',{method:'POST'}),env)).status,405);
 assert.equal((await worker.fetch(new Request('https://example.com/analytics.json',{headers:{Origin:'https://evil.example'}}),env)).status,403);
 const response=await worker.fetch(new Request('https://example.com/analytics.json',{headers:{Origin:'https://yisu0830.github.io'}}),env);
 assert.equal(response.status,200);assert.equal((await response.json()).provider,'Google Analytics 4');
});
test('service-account assertion is cryptographically signed and requests read-only access',async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const der=Buffer.from(await webcrypto.subtle.exportKey('pkcs8',pair.privateKey));
 const private_key='-----BEGIN PRIVATE KEY-----\n'+der.toString('base64')+'\n-----END PRIVATE KEY-----';
 const token=await accessToken({GA4_SERVICE_ACCOUNT:JSON.stringify({client_email:'test@example.iam.gserviceaccount.com',private_key})},async(url,options)=>{
  assert.equal(url,'https://oauth2.googleapis.com/token');
  const assertion=options.body.get('assertion'),[header,payload,signature]=assertion.split('.');
  const claims=JSON.parse(Buffer.from(payload,'base64url'));
  assert.equal(claims.scope,'https://www.googleapis.com/auth/analytics.readonly');
  assert.equal(claims.exp-claims.iat,3600);
  assert.equal(await webcrypto.subtle.verify('RSASSA-PKCS1-v1_5',pair.publicKey,Buffer.from(signature,'base64url'),new TextEncoder().encode(header+'.'+payload)),true);
  return Response.json({access_token:'test-token'});
 },now);
 assert.equal(token,'test-token');
});
test('Singapore report days cross calendar boundaries',()=>{
 const w=reportingWindow(Date.parse('2027-01-01T01:00:00+08:00'));
 assert.equal(new Date(w.startAt).toISOString(),'2026-12-30T16:00:00.000Z');
});
