import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { reportingWindow, collect, refresh } from './worker.mjs';

const now = Date.parse('2026-10-05T01:00:00+08:00');
const replies = {
  'SueKit yesterday totals': [[3, 2]],
  'SueKit seven day totals': [[5, 4]],
  'SueKit yesterday hourly': [['2026-10-04T09:00:00', 3]],
  'SueKit seven day daily': [['2026-10-03', 2], ['2026-10-04', 3]],
  'SueKit popular actions': [['copy_success', 6]],
};
const fetcher = async (url, options) => {
  assert.equal(url, 'https://us.posthog.com/api/projects/645031/query/');
  const body = JSON.parse(options.body);
  assert.match(body.query.query, /properties\.\$host = 'suekit\.jiongxiaosu0830\.workers\.dev'/);
  return Response.json({ results: replies[body.name] });
};
test('UTC+8 complete day boundaries cross month and year correctly', () => {
  const w = reportingWindow(Date.parse('2027-01-01T01:00:00+08:00'));
  assert.equal(new Date(w.startAt).toISOString(), '2026-12-30T16:00:00.000Z');
  assert.equal(new Date(w.endExclusive).toISOString(), '2026-12-31T16:00:00.000Z');
});
test('aggregate counts, zero-filled buckets, and next daily update are consistent', async () => {
  const data = await collect({ POSTHOG_READ_KEY: 'test' }, now, fetcher);
  assert.equal(data.visitors, 2); assert.equal(data.pageviews, 3);
  assert.equal(data.hourly.length, 24); assert.equal(data.hourly[9].pageviews, 3);
  assert.equal(data.daily.length, 7); assert.equal(data.weeklyTotal, 5);
  assert.equal(data.reportDate, '2026-10-04');
  assert.equal(data.nextUpdateAt, '2026-10-05T17:00:00.000Z');
  assert.equal(data.tools[0].name, '复制成功');
  assert.equal(JSON.stringify(data).includes('test'), false);
});
test('failed or inconsistent collection never overwrites the previous cache', async () => {
  let writes = 0;
  const env = { POSTHOG_READ_KEY: 'test', ANALYTICS_CACHE: { put: async () => writes++ } };
  await assert.rejects(refresh(env, now, async () => new Response('', { status: 401 })));
  await assert.rejects(refresh(env, now, async (url, options) => {
    const response = await fetcher(url, options);
    const data = await response.json();
    if (JSON.parse(options.body).name === 'SueKit yesterday totals') data.results = [[99, 2]];
    return Response.json(data);
  }));
  assert.equal(writes, 0);
});
test('public reads only serve cached aggregates; empty cache is unavailable', async () => {
  const env = { ANALYTICS_CACHE: { get: async () => null } };
  assert.equal((await worker.fetch(new Request('https://example.com/analytics.json'), env)).status, 503);
  assert.equal((await worker.fetch(new Request('https://example.com/analytics.json', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://example.com/analytics.json', { headers: { Origin: 'https://unrelated.example' } }), env)).status, 403);
  const data = await collect({ POSTHOG_READ_KEY: 'test' }, now, fetcher);
  const response = await worker.fetch(new Request('https://example.com/analytics.json', { headers: { Origin: 'https://yisu0830.github.io' } }), { ANALYTICS_CACHE: { get: async () => data } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://yisu0830.github.io');
  assert.equal((await response.json()).provider, 'PostHog');
});
