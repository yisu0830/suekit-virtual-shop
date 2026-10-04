const WEBSITE = '50b7f572-2676-4362-b56e-6ddbea82141c';
const TIMEZONE = 'Asia/Singapore';
const DAY = 86400000;
const OFFSET = 8 * 3600000;
const KEY = 'daily-analytics';
const LABELS = { selection_start: '开始选择', variant_select: '切换样式', component_select: '选择组件', scene_select: '切换场景', format_select: '切换格式', selection_cancel: '取消选择', copy_success: '复制成功', copy_click: '点击复制', copy_failure: '复制失败' };

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
export async function collect(env, now = Date.now(), fetcher = fetch) {
  if (!env.POSTHOG_READ_KEY) throw new Error('POSTHOG_READ_KEY is not configured');
  const window = reportingWindow(now);
  const utc = ms => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const range = start => `properties.app = 'suekit' AND properties.$host = 'suekit.jiongxiaosu0830.workers.dev' AND timestamp >= toDateTime('${utc(start)}', 'UTC') AND timestamp < toDateTime('${utc(window.endExclusive)}', 'UTC')`;
  async function query(sql, name) {
    const response = await fetcher('https://us.posthog.com/api/projects/645031/query/', {
      method: 'POST', headers: { Authorization: `Bearer ${env.POSTHOG_READ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql }, name, refresh: 'blocking' }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`PostHog query ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.results) || data.hasMore || data.error) throw new Error('Incomplete PostHog query');
    return data.results;
  }
  // Only aggregate results are requested. No visitor identities leave PostHog.
  const [stats, weekly, hourly, daily, events] = await Promise.all([
    query(`SELECT count(), uniqExact(distinct_id) FROM events WHERE ${range(window.startAt)} AND event = '$pageview'`, 'SueKit yesterday totals'),
    query(`SELECT count(), uniqExact(distinct_id) FROM events WHERE ${range(window.weekStartAt)} AND event = '$pageview'`, 'SueKit seven day totals'),
    query(`SELECT formatDateTime(timestamp, '%Y-%m-%dT%H:00:00', 'Asia/Singapore'), count() FROM events WHERE ${range(window.startAt)} AND event = '$pageview' GROUP BY 1 ORDER BY 1 LIMIT 24`, 'SueKit yesterday hourly'),
    query(`SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Asia/Singapore'), count() FROM events WHERE ${range(window.weekStartAt)} AND event = '$pageview' GROUP BY 1 ORDER BY 1 LIMIT 7`, 'SueKit seven day daily'),
    query(`SELECT event, count() FROM events WHERE ${range(window.weekStartAt)} AND event IN ('selection_start','variant_select','component_select','scene_select','format_select','selection_cancel','copy_success','copy_click','copy_failure') GROUP BY event ORDER BY count() DESC LIMIT 9`, 'SueKit popular actions'),
  ]);
  if (stats.length !== 1 || weekly.length !== 1) throw new Error('Missing analytics totals');
  const hours = buckets(hourly.map(([x,y]) => ({x,y})), window.startAt, 3600000, 24);
  const days = buckets(daily.map(([x,y]) => ({x,y})), window.weekStartAt, DAY, 7);
  const pageviews = count(stats[0][0]), weeklyTotal = count(weekly[0][0]);
  if (hours.reduce((sum, row) => sum + row.pageviews, 0) !== pageviews || days.reduce((sum, row) => sum + row.pageviews, 0) !== weeklyTotal) throw new Error('Inconsistent analytics series');
  const tools = events.map(([event, clicks]) => {
    if (typeof event !== 'string') throw new Error('Invalid event name');
    return { event, name: LABELS[event] || event, clicks: count(clicks) };
  }).sort((a,b) => b.clicks-a.clicks).slice(0,5);
  return {
    schemaVersion: 1, websiteId: WEBSITE, provider: 'PostHog', projectId: '645031', sourceMode: 'daily-cache', timezone: TIMEZONE,
    observedAt: new Date(now).toISOString(), nextUpdateAt: new Date(window.endExclusive + DAY + 3600000).toISOString(),
    reportDate: localStamp(window.startAt).slice(0,10), windowLabel: '昨日', hourlyTitle: '昨日浏览趋势', weeklyLabel: '最近 7 个完整日',
    visitors: count(stats[0][1]), pageviews, hourly: hours, daily: days, weeklyTotal, weeklyVisitors: count(weekly[0][1]),
    tools, pages: [], rankingTitle: '热门操作',
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
