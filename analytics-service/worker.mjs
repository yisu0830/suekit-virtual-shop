const WEBSITE = '50b7f572-2676-4362-b56e-6ddbea82141c';
const TIMEZONE = 'Asia/Singapore';
const DAY = 86400000;
const OFFSET = 8 * 3600000;
const KEY = 'daily-analytics';
const VARIANT_NAMES = {"nav:default": "默认导航栏", "nav:shrink": "滚动吸顶变色", "nav:float": "悬浮岛导航", "nav:mega": "巨型菜单", "nav:dropdown": "下拉菜单", "hero:split": "左右布局", "hero:center": "居中布局", "feat:plain": "文本卡片", "feat:icon": "图标卡片", "feat:illus": "插画卡片", "trust:marquee": "跑马灯", "testi:scroll": "横向滚动", "faq:accordion": "手风琴折叠", "cta:banner": "横幅", "footer:columns": "三列链接", "footer:solid": "实底按钮", "footer:line": "线框按钮", "footer:text": "文字按钮", "footer:pill": "胶囊按钮", "footer:icon": "图标按钮", "sidebar:default": "默认侧边栏", "input:default": "默认输入框", "textarea:area": "多行文本框", "number:default": "默认数字输入框", "select:default": "默认下拉选择", "radio:default": "默认单选框", "checkbox:default": "默认多选框", "switch:default": "默认开关", "upload:default": "默认上传", "date:default": "默认日期选择"};
const COMPONENT_NAMES = {"nav": "导航", "hero": "Hero 首屏", "feat": "功能卡片", "trust": "信任条", "testi": "用户评价", "faq": "常见问题", "cta": "CTA 行动号召", "footer": "页脚", "sidebar": "侧边栏", "input": "输入框", "textarea": "多行文本框", "number": "数字输入框", "select": "下拉选择", "radio": "单选框", "checkbox": "多选框", "switch": "开关", "upload": "上传", "date": "日期选择"};
const LABELS = { '$pageview': '访问网站', selection_start: '开始选择', variant_select: '切换样式', component_select: '选择组件', scene_select: '切换场景', format_select: '切换格式', selection_cancel: '取消选择', copy_success: '复制成功', copy_click: '点击复制', copy_failure: '复制失败' };

// Fixed UTC+8 calendar boundaries; each refresh reports the last complete day.
export function reportingWindow(now) {
  const endExclusive = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  return { startAt: endExclusive - DAY, endAt: endExclusive - 1, weekStartAt: endExclusive - 7 * DAY, endExclusive };
}
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid analytics count');
  return value;
}
function localStamp(ms) { return new Date(ms + OFFSET).toISOString().slice(0, 19); }
function bucketStamp(value) {
  if (typeof value !== 'string') throw new Error('Invalid series timestamp');
  const normalized = value.replace(' ', 'T');
  if (/Z$|[+-]\d\d:\d\d$/.test(normalized)) return localStamp(Date.parse(normalized));
  if (!/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d(?::\d\d)?)?$/.test(normalized)) throw new Error('Invalid series timestamp');
  return normalized;
}
export function buckets(points, start, size, length) {
  if (!Array.isArray(points)) throw new Error('Missing analytics series');
  const values = new Map();
  for (const point of points) {
    const stamp = bucketStamp(point.x).slice(0, size === DAY ? 10 : 13);
    if (values.has(stamp)) throw new Error('Duplicate analytics bucket');
    values.set(stamp, count(point.y));
  }
  return Array.from({ length }, (_, i) => {
    const stamp = localStamp(start + i * size);
    return { label: stamp.slice(5, 10).replace('-', '/') + (size === DAY ? '' : ` ${stamp.slice(11, 13)}:00`), pageviews: values.get(stamp.slice(0, size === DAY ? 10 : 13)) ?? 0 };
  });
}
export function analyticsQueries(now = Date.now()) {
  const w = reportingWindow(now);
  const utc = ms => new Date(ms).toISOString().slice(0,19).replace('T',' ');
  const range = start => `properties.app = 'suekit' AND properties.$host = 'suekit.jiongxiaosu0830.workers.dev' AND timestamp >= toDateTime('${utc(start)}', 'UTC') AND timestamp < toDateTime('${utc(w.endExclusive)}', 'UTC')`;
  const sessionValid = "properties.$session_id IS NOT NULL AND properties.$session_id != ''";
  const totals = start => `SELECT count() AS pageviews, uniqExact(distinct_id) AS visitors, uniqExact(properties.$session_id) AS sessions FROM events WHERE ${range(start)} AND event = '$pageview'`;
  const actions = Object.keys(LABELS).filter(x=>x!=='$pageview').map(x=>`'${x}'`).join(',');
  const from30 = w.endExclusive - 30 * DAY;
  const monday = w.startAt - ((new Date(w.startAt + OFFSET).getUTCDay() + 6) % 7) * DAY;
  const weekStart = monday - 11 * 7 * DAY;
  const d = new Date(w.startAt + OFFSET);
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth()-11,1)-OFFSET;
  const trend = (start, stamp, limit) => `SELECT formatDateTime(${stamp}, '%Y-%m-%d', 'Asia/Singapore') AS period, uniqExact(distinct_id) AS visitors, count() AS pageviews, uniqExact(properties.$session_id) AS sessions FROM events WHERE ${range(start)} AND event = '$pageview' GROUP BY 1 ORDER BY 1 LIMIT ${limit}`;
  const breakdown = property => `SELECT coalesce(nullIf(toString(properties.${property}), ''), '未知') AS name, uniqExact(distinct_id) AS visitors FROM events WHERE ${range(from30)} AND event = '$pageview' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`;
  const flow = `WITH base AS (SELECT timestamp, event, properties.$session_id AS sid FROM events WHERE ${range(from30)} AND ${sessionValid}), views AS (SELECT sid, min(timestamp) AS viewed FROM base WHERE event = '$pageview' GROUP BY sid), selected AS (SELECT b.sid AS sid, min(b.timestamp) AS selected_at FROM base b JOIN views v ON b.sid = v.sid WHERE b.event = 'component_select' AND b.timestamp >= v.viewed GROUP BY b.sid), copied AS (SELECT b.sid AS sid, min(b.timestamp) AS copied_at FROM base b JOIN selected s ON b.sid = s.sid WHERE b.event = 'copy_success' AND b.timestamp >= s.selected_at GROUP BY b.sid)`;
  const q = [
    ['yesterday', '昨日访客、浏览量与访问次数', totals(w.startAt)],
    ['week', '最近 7 日访客、浏览量与访问次数', totals(w.weekStartAt)],
    ['month', '最近 30 日访客、浏览量与访问次数', totals(from30)],
    ['hourly', '昨日每小时浏览趋势', `SELECT formatDateTime(timestamp, '%Y-%m-%dT%H:00:00', 'Asia/Singapore'), count() FROM events WHERE ${range(w.startAt)} AND event = '$pageview' GROUP BY 1 ORDER BY 1 LIMIT 24`],
    ['daily', '按天趋势｜最近 30 日', trend(from30, 'timestamp', 30)],
    ['weekly', '按周趋势｜最近 12 周', trend(weekStart, "toStartOfWeek(toTimeZone(timestamp, 'Asia/Singapore'), 1)", 12)],
    ['monthly', '按月趋势｜最近 12 月', trend(monthStart, "toStartOfMonth(toTimeZone(timestamp, 'Asia/Singapore'))", 12)],
    ['sources', '访问来源｜最近 30 日', `SELECT source AS name, count() AS sessions FROM (SELECT properties.$session_id AS sid, coalesce(nullIf(toString(argMin(properties.$referring_domain, timestamp)), ''), '直接访问') AS source FROM events WHERE ${range(from30)} AND event = '$pageview' AND ${sessionValid} GROUP BY sid) GROUP BY source ORDER BY 2 DESC, 1 LIMIT 10`],
    ['devices', '设备｜最近 30 日', breakdown('$device_type')],
    ['browsers', '浏览器｜最近 30 日', breakdown('$browser')],
    ['countries', '地区｜最近 30 日', breakdown('$geoip_country_name')],
    ['components', '组件使用｜最近 30 日', `SELECT toString(properties.component) AS component, count() AS selections, uniqExact(distinct_id) AS visitors FROM events WHERE ${range(from30)} AND event = 'component_select' GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 10`],
    ['variants', '样式使用｜最近 30 日', `SELECT toString(properties.component) AS component, toString(properties.variant) AS variant, count() AS changes FROM events WHERE ${range(from30)} AND event = 'variant_select' GROUP BY 1,2 ORDER BY 3 DESC,1,2 LIMIT 10`],
    ['formats', '输出格式｜最近 30 日', `SELECT toString(properties.format) AS format, count() AS changes FROM events WHERE ${range(from30)} AND event = 'format_select' GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 10`],
    ['actions', '操作与复制｜最近 30 日', `SELECT event AS operation, count() AS times FROM events WHERE ${range(from30)} AND event IN (${actions}) GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 9`],
    ['funnel', '转化漏斗｜访问 → 选择组件 → 复制成功', `${flow} SELECT (SELECT count() FROM views) AS visits, (SELECT count() FROM selected) AS selected, (SELECT count() FROM copied) AS copied`],
    ['paths', '操作路径｜最近 30 日前 8 步', `SELECT path, count() AS sessions FROM (SELECT arrayStringConcat(arraySlice(arrayCompact(arrayMap(x -> x.2, arraySort(x -> x.1, groupArray((timestamp, event))))),1,8), ' → ') AS path FROM events WHERE ${range(from30)} AND ${sessionValid} AND event IN ('$pageview',${actions}) GROUP BY properties.$session_id) GROUP BY path ORDER BY 2 DESC,1 LIMIT 8`],
  ].map(([id,name,sql])=>({id,name,sql}));
  return { queries:q, window:w, from30, weekStart, monthStart };
}
function stats(rows) {
  if (rows.length !== 1 || rows[0].length !== 3) throw new Error('Missing analytics totals');
  const [pageviews,visitors,sessions] = rows[0].map(count);
  if(visitors > pageviews || sessions > pageviews) throw new Error('Invalid totals');
  return {pageviews,visitors,sessions};
}
function trendRows(rows, stamps) {
  const values = new Map(rows.map(([stamp, visitors, pageviews, sessions])=>[bucketStamp(stamp).slice(0,10), {visitors:count(visitors),pageviews:count(pageviews),sessions:count(sessions)}]));
  return stamps.map(stamp=>({label:stamp.slice(5).replace('-', '/'), date:stamp, ...(values.get(stamp)||{visitors:0,pageviews:0,sessions:0})}));
}
export async function collect(env, now = Date.now(), fetcher = fetch) {
  if (!env.POSTHOG_READ_KEY) throw new Error('POSTHOG_READ_KEY is not configured');
  const {queries,window:w,from30,weekStart,monthStart} = analyticsQueries(now);
  async function query(q) {
    const response = await fetcher('https://us.posthog.com/api/projects/645031/query/', {
      method:'POST', headers:{Authorization:`Bearer ${env.POSTHOG_READ_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({query:{kind:'HogQLQuery',query:q.sql},name:q.name,refresh:'blocking'}),signal:AbortSignal.timeout(40000),
    });
    if(!response.ok) throw new Error(`PostHog query ${q.id}: ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data.results)||data.hasMore||data.error) throw new Error(`Incomplete PostHog query ${q.id}`);
    return data.results;
  }
  const result={};
  // Small batches respect the provider's concurrent query limits.
  for(let i=0;i<queries.length;i+=3) await Promise.all(queries.slice(i,i+3).map(async q=>{result[q.id]=await query(q);}));
  const yesterday=stats(result.yesterday), week=stats(result.week), month=stats(result.month);
  const hourly=buckets(result.hourly.map(([x,y])=>({x,y})),w.startAt,3600000,24);
  const dayStamps=Array.from({length:30},(_,i)=>localStamp(from30+i*DAY).slice(0,10));
  const weekStamps=Array.from({length:12},(_,i)=>localStamp(weekStart+i*7*DAY).slice(0,10));
  const first=new Date(monthStart+OFFSET);
  const monthStamps=Array.from({length:12},(_,i)=>new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1)).toISOString().slice(0,10));
  const daily=trendRows(result.daily,dayStamps), weekly=trendRows(result.weekly,weekStamps), monthly=trendRows(result.monthly,monthStamps).map(row=>({...row,label:row.date.slice(0,7)}));
  if(hourly.reduce((s,r)=>s+r.pageviews,0)!==yesterday.pageviews || daily.reduce((s,r)=>s+r.pageviews,0)!==month.pageviews || daily.slice(-7).reduce((s,r)=>s+r.pageviews,0)!==week.pageviews) throw new Error('Inconsistent analytics series');
  const ranks=(rows)=>rows.map(([name,value])=>({name:String(name),count:count(value)}));
  const actions=ranks(result.actions).map(row=>({...row,event:row.name,name:LABELS[row.name]||row.name}));
  const copy=Object.fromEntries(['copy_click','copy_success','copy_failure'].map(event=>[event, actions.find(row=>row.event===event)?.count||0]));
  if(result.funnel.length!==1) throw new Error('Missing conversion counts');
  const [visits,selected,copied]=result.funnel[0].map(count);
  if(copied>selected||selected>visits||visits!==month.sessions) throw new Error('Inconsistent conversion counts');
  return {
    schemaVersion:1,websiteId:WEBSITE,provider:'PostHog',projectId:'645031',sourceMode:'daily-cache',timezone:TIMEZONE,
    observedAt:new Date(now).toISOString(),nextUpdateAt:new Date(w.endExclusive+DAY+3600000).toISOString(),
    reportDate:localStamp(w.startAt).slice(0,10),collectionStartedAt:'2026-10-04',dashboardUrl:'https://us.posthog.com/project/645031/dashboard/2168674',
    windowLabel:'昨日',hourlyTitle:'昨日浏览趋势',weeklyLabel:'最近 7 个完整日',
    ...yesterday,hourly,daily:daily.slice(-7),weeklyTotal:week.pageviews,weeklyVisitors:week.visitors,
    periods:{yesterday,week,month},trends:{daily,weekly,monthly},
    sources:ranks(result.sources),devices:ranks(result.devices),browsers:ranks(result.browsers),countries:ranks(result.countries),
    components:result.components.map(([id,value,visitors])=>({id:String(id),name:COMPONENT_NAMES[id]||String(id),count:count(value),visitors:count(visitors)})),
    variants:result.variants.map(([id,variant,value])=>({name:`${COMPONENT_NAMES[id]||id} · ${VARIANT_NAMES[id+':'+variant]||variant}`,count:count(value)})),formats:ranks(result.formats),
    actions,copy,funnel:{visits,selected,copied,selectionRate:visits?selected/visits:null,conversionRate:visits?copied/visits:null,copyRate:selected?copied/selected:null},
    paths:result.paths.map(([path,value])=>({steps:String(path).split(' → ').map(event=>LABELS[event]||event),count:count(value)})),
    tools:actions.slice(0,5).map(row=>({name:row.name,clicks:row.count})),pages:[],rankingTitle:'热门操作',
  };
}
export async function refresh(env, now = Date.now(), fetcher = fetch) {
  // Commit one complete snapshot only after every request and validation succeeds.
  const data = await collect(env, now, fetcher);
  await env.ANALYTICS_CACHE.put(KEY, JSON.stringify(data));
  return data;
}
export default {
  async scheduled(controller, env, ctx) { ctx.waitUntil(refresh(env, controller.scheduledTime)); },
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = new Set(['https://yisu0830.github.io', 'http://127.0.0.1:8765', 'http://localhost:8765']);
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (origin && !allowed.has(origin)) return new Response('{"error":"Origin not allowed"}', { status: 403, headers });
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    if (new URL(request.url).pathname !== '/analytics.json') return new Response('{"error":"Not found"}', { status: 404, headers });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('{"error":"Method not allowed"}', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
    const snapshot = await env.ANALYTICS_CACHE.get(KEY, 'json');
    if (!snapshot) return new Response('{"error":"Daily analytics not initialized"}', { status: 503, headers });
    // GET only reads KV. Public visits cannot trigger extra PostHog requests.
    const stale = Date.now() > Date.parse(snapshot.nextUpdateAt) + 2 * 3600000;
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ ...snapshot, stale }), { headers });
  },
};
