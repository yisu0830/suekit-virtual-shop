import snapshot from '../analytics.json';
export const websiteId = '50b7f572-2676-4362-b56e-6ddbea82141c';
export const shopMetrics = Object.freeze(snapshot);
export async function loadShopMetrics() {
  if (location.protocol === 'file:') return shopMetrics;
  const response = await fetch('https://suekit-analytics.jiongxiaosu0830.workers.dev/analytics.json', {
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('统计数据暂时无法读取');
  const data = await response.json();
  if (data.websiteId !== websiteId || data.schemaVersion !== 1) throw new Error('统计来源不匹配');
  return data;
}
