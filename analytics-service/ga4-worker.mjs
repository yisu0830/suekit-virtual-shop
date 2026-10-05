const WEBSITE = '50b7f572-2676-4362-b56e-6ddbea82141c';
const TIMEZONE = 'Asia/Singapore';
const DAY = 86400000;
const OFFSET = 8 * 3600000;
const KEY = 'daily-analytics';
const VARIANT_NAMES = {"nav:default": "默认导航栏", "nav:shrink": "滚动吸顶变色", "nav:float": "悬浮岛导航", "nav:mega": "巨型菜单", "nav:dropdown": "下拉菜单", "hero:split": "左右布局", "hero:center": "居中布局", "feat:plain": "文本卡片", "feat:icon": "图标卡片", "feat:illus": "插画卡片", "trust:marquee": "跑马灯", "testi:scroll": "横向滚动", "faq:accordion": "手风琴折叠", "cta:banner": "横幅", "footer:columns": "三列链接", "footer:solid": "实底按钮", "footer:line": "线框按钮", "footer:text": "文字按钮", "footer:pill": "胶囊按钮", "footer:icon": "图标按钮", "sidebar:default": "默认侧边栏", "input:default": "默认输入框", "textarea:area": "多行文本框", "number:default": "默认数字输入框", "select:default": "默认下拉选择", "radio:default": "默认单选框", "checkbox:default": "默认多选框", "switch:default": "默认开关", "upload:default": "默认上传", "date:default": "默认日期选择"};
const COMPONENT_NAMES = {"nav": "导航", "hero": "Hero 首屏", "feat": "功能卡片", "trust": "信任条", "testi": "用户评价", "faq": "常见问题", "cta": "CTA 行动号召", "footer": "页脚", "sidebar": "侧边栏", "input": "输入框", "textarea": "多行文本框", "number": "数字输入框", "select": "下拉选择", "radio": "单选框", "checkbox": "多选框", "switch": "开关", "upload": "上传", "date": "日期选择"};
const LABELS = { 'page_view': '访问网站', selection_start: '开始选择', variant_select: '切换样式', component_select: '选择组件', scene_select: '切换场景', format_select: '切换格式', selection_cancel: '取消选择', copy_success: '复制成功', copy_click: '点击复制', copy_failure: '复制失败' };

const PROPERTY = '557412742';
const HOST = 'suekit.jiongxiaosu0830.workers.dev';
export function reportingWindow(now) {
  const endExclusive = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  return {startAt:endExclusive-DAY,endExclusive,weekStartAt:endExclusive-7*DAY};
}
const stamp = ms => new Date(ms+OFFSET).toISOString().slice(0,10);
const numeric = value => {const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid GA4 count');return n;};
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export async function accessToken(env,fetcher=fetch,now=Date.now()) {
  if(!env.GA4_SERVICE_ACCOUNT)throw new Error('GA4_SERVICE_ACCOUNT is not configured');
  const account=JSON.parse(env.GA4_SERVICE_ACCOUNT);
  if(!account.client_email||!account.private_key)throw new Error('Invalid GA4 credentials');
  const encode = value => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const seconds=Math.floor(now/1000);
  const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:seconds,exp:seconds+3600});
  const pem=account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+base64url(signature)}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`GA4 authorization: ${response.status}`);
  const data=await response.json();if(!data.access_token)throw new Error('Missing GA4 token');return data.access_token;
}
const exact = (fieldName,value) => ({filter:{fieldName,stringFilter:{matchType:'EXACT',value}}});
export async function collect(env,now=Date.now(),fetcher=fetch,tokenProvider=accessToken) {
  // Deliberately fixed to SueKit: the shop property is never a reporting source.
  if(env.GA4_PROPERTY_ID && env.GA4_PROPERTY_ID!==PROPERTY)throw new Error('Unexpected reporting property');
  const token=await tokenProvider(env,fetcher,now);
  const w=reportingWindow(now), from30=w.endExclusive-30*DAY;
  async function report(start,dimensions,metrics,eventName) {
    const filters=[exact('hostName',HOST)];if(eventName)filters.push(exact('eventName',eventName));
    const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:stamp(start),endDate:stamp(w.startAt)}],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),dimensionFilter:{andGroup:{expressions:filters}},limit:'10000',keepEmptyRows:false}),signal:AbortSignal.timeout(40000)});
    if(!response.ok)throw new Error(`GA4 report: ${response.status}`);
    const data=await response.json();
    if(data.error||numeric(data.rowCount||0)>(data.rows||[]).length)throw new Error('Incomplete GA4 report');
    if(data.metadata?.timeZone && data.metadata.timeZone!==TIMEZONE)throw new Error('Unexpected GA4 timezone');
    if(data.metadata?.subjectToThresholding||data.metadata?.samplingMetadatas?.length||data.metadata?.dataLossFromOtherRow)throw new Error('GA4 report is thresholded or sampled');
    return (data.rows||[]).map(row=>[...(row.dimensionValues||[]).map(x=>x.value),...(row.metricValues||[]).map(x=>numeric(x.value))]);
  }
  const totals=async start=>{const rows=await report(start,[],['screenPageViews','totalUsers','sessions']);if(rows.length>1)throw new Error('Invalid GA4 totals');const [pageviews,visitors,sessions]=rows[0]||[0,0,0];return {pageviews,visitors,sessions};};
  const yesterday=await totals(w.startAt),week=await totals(w.weekStartAt),month=await totals(from30);
  const hourlyRows=await report(w.startAt,['dateHour'],['screenPageViews']);
  const dailyRows=await report(from30,['date'],['totalUsers','screenPageViews','sessions']);
  const monday=w.startAt-((new Date(w.startAt+OFFSET).getUTCDay()+6)%7)*DAY;
  const weekStart=monday-11*7*DAY;
  const first=new Date(w.startAt+OFFSET),monthStart=Date.UTC(first.getUTCFullYear(),first.getUTCMonth()-11,1)-OFFSET;
  const weekly=[],monthly=[];
  // Query unique users for each calendar period rather than summing daily uniques.
  for(let i=0;i<12;i++) {
    const start=weekStart+i*7*DAY,end=Math.min(start+7*DAY,w.endExclusive);
    const response=await periodReport(start,end);weekly.push({date:stamp(start),label:stamp(start).slice(5).replace('-','/'),...response});
  }
  for(let i=0;i<12;i++) {
    const d=new Date(monthStart+OFFSET),start=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+i,1)-OFFSET,end=Math.min(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+i+1,1)-OFFSET,w.endExclusive);
    monthly.push({date:stamp(start),label:stamp(start).slice(0,7),...await periodReport(start,end)});
  }
  async function periodReport(start,end) {
    const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:stamp(start),endDate:stamp(end-DAY)}],metrics:[{name:'screenPageViews'},{name:'totalUsers'},{name:'sessions'}],dimensionFilter:exact('hostName',HOST)}),signal:AbortSignal.timeout(40000)});
    if(!response.ok)throw new Error(`GA4 period: ${response.status}`);
    const data=await response.json();if(data.error||numeric(data.rowCount||0)>(data.rows||[]).length||(data.rows||[]).length>1||data.metadata?.subjectToThresholding||data.metadata?.samplingMetadatas?.length||data.metadata?.dataLossFromOtherRow||(data.metadata?.timeZone&&data.metadata.timeZone!==TIMEZONE))throw new Error('Incomplete GA4 period');
    const [pageviews,visitors,sessions]=(data.rows?.[0]?.metricValues||[{value:'0'},{value:'0'},{value:'0'}]).map(x=>numeric(x.value));return {pageviews,visitors,sessions};
  }
  const dates=new Map(dailyRows.map(([date,visitors,pageviews,sessions])=>[date,{visitors,pageviews,sessions}]));
  const daily=Array.from({length:30},(_,i)=>{const date=stamp(from30+i*DAY);return {date,label:date.slice(5).replace('-','/'),...(dates.get(date.replaceAll('-',''))||{visitors:0,pageviews:0,sessions:0})};});
  const hours=new Map(hourlyRows);
  const hourly=Array.from({length:24},(_,i)=>({label:stamp(w.startAt).slice(5).replace('-','/')+` ${String(i).padStart(2,'0')}:00`,pageviews:hours.get(stamp(w.startAt).replaceAll('-','')+String(i).padStart(2,'0'))||0}));
  if(hourly.reduce((n,x)=>n+x.pageviews,0)!==yesterday.pageviews||daily.reduce((n,x)=>n+x.pageviews,0)!==month.pageviews||daily.slice(-7).reduce((n,x)=>n+x.pageviews,0)!==week.pageviews)throw new Error('Inconsistent GA4 series');
  const ranked=rows=>rows.map(([name,count])=>({name:name==='(direct)'?'直接访问':String(name),count})).sort((a,b)=>b.count-a.count).slice(0,10);
  const sources=ranked(await report(from30,['sessionSource'],['sessions']));
  const devices=ranked(await report(from30,['deviceCategory'],['totalUsers']));
  const browsers=ranked(await report(from30,['browser'],['totalUsers']));
  const countries=ranked(await report(from30,['country'],['totalUsers']));
  const actions=(await report(from30,['eventName'],['eventCount'])).filter(([name])=>name in LABELS&&name!=='page_view').map(([event,count])=>({event,name:LABELS[event],count}));
  const copy=Object.fromEntries(['copy_click','copy_success','copy_failure'].map(event=>[event,actions.find(x=>x.event===event)?.count||0]));
  let components=[],variants=[],formats=[];
  if(env.GA4_CUSTOM_DIMENSIONS!=='false') {
    components=(await report(from30,['customEvent:component'],['eventCount','totalUsers'],'component_select')).filter(([id])=>id!=='(not set)').map(([id,count,visitors])=>({id,name:COMPONENT_NAMES[id]||id,count,visitors})).sort((a,b)=>b.count-a.count).slice(0,10);
    variants=(await report(from30,['customEvent:component','customEvent:variant'],['eventCount'],'variant_select')).map(([id,variant,count])=>({name:`${COMPONENT_NAMES[id]||id} · ${VARIANT_NAMES[id+':'+variant]||variant}`,count})).sort((a,b)=>b.count-a.count).slice(0,10);
    formats=ranked(await report(from30,['customEvent:format'],['eventCount'],'format_select'));
  }
  return {schemaVersion:1,websiteId:WEBSITE,provider:'Google Analytics 4',projectId:PROPERTY,sourceMode:'daily-cache',timezone:TIMEZONE,observedAt:new Date(now).toISOString(),nextUpdateAt:new Date(w.endExclusive+DAY+3600000).toISOString(),reportDate:stamp(w.startAt),collectionStartedAt:'2026-10-05',dashboardUrl:`https://analytics.google.com/analytics/web/#/a150222986p${PROPERTY}/reports/intelligenthome`,windowLabel:'昨日',hourlyTitle:'昨日浏览趋势',weeklyLabel:'最近 7 个完整日',...yesterday,hourly,daily:daily.slice(-7),weeklyTotal:week.pageviews,weeklyVisitors:week.visitors,periods:{yesterday,week,month},trends:{daily,weekly,monthly},sources,devices,browsers,countries,components,variants,formats,actions,copy,funnel:null,paths:[],capabilities:{usage:env.GA4_CUSTOM_DIMENSIONS!=='false',funnel:false,paths:false},tools:actions.slice(0,5).map(x=>({name:x.name,clicks:x.count})),pages:[],rankingTitle:'热门操作'};
}
export async function refresh(env,now=Date.now(),fetcher=fetch,tokenProvider=accessToken) {
  const data=await collect(env,now,fetcher,tokenProvider);
  await env.ANALYTICS_CACHE.put(KEY,JSON.stringify(data));return data;
}
export default {
  async scheduled(controller,env,ctx){ctx.waitUntil(refresh(env,controller.scheduledTime));},
  async fetch(request,env){
    const origin=request.headers.get('Origin');const allowed=new Set(['https://yisu0830.github.io','http://127.0.0.1:8765','http://localhost:8765']);
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',Vary:'Origin','X-Content-Type-Options':'nosniff'};
    if(origin&&!allowed.has(origin))return new Response('{"error":"Origin not allowed"}',{status:403,headers});
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    if(new URL(request.url).pathname!=='/analytics.json')return new Response('{"error":"Not found"}',{status:404,headers});
    if(!['GET','HEAD'].includes(request.method))return new Response('{"error":"Method not allowed"}',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
    const snapshot=await env.ANALYTICS_CACHE.get(KEY,'json');
    if(!snapshot)return new Response('{"error":"Daily analytics not initialized"}',{status:503,headers});
    const stale=Date.now()>Date.parse(snapshot.nextUpdateAt)+2*3600000;
    return new Response(request.method==='HEAD'?null:JSON.stringify({...snapshot,stale}),{headers});
  }
};
