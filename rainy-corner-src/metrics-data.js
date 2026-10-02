import { customerTraffic } from './visitors.js';

// Values read from the authenticated Cloudflare dashboard on 2026-10-02.
// Missing series remain null until the source supplies actual observations.
export const shopMetrics = Object.freeze({
  sourceMode: 'snapshot',
  observedAt: '2026-10-02',
  windowLabel: '近 24 小时',
  assetRequests: customerTraffic.assetRequests,
  cacheHitRate: 91.48,
  statusCounts: { '2xx': 305, '3xx': 139, '4xx': 14, '5xx': 0 },
  hourly: null,
  daily: null,
  weeklyTotal: null,
  tools: null,
  sourceUrl: 'https://dash.cloudflare.com/b7429ba2b689e9642ded771fd7728a55/workers/services/view/suekit/production/metrics',
});
