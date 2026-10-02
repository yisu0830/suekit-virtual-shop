const SVG_NS = 'http://www.w3.org/2000/svg';
const numberFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });
const wholeNumberFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgEl(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function displayNumber(value, whole = false) {
  return finite(value) ? (whole ? wholeNumberFormat : numberFormat).format(value) : '—';
}

function emptyState(title, description, kind = 'chart') {
  const box = el('div', `metric-empty metric-empty--${kind}`);
  const mark = el('span', 'metric-empty-mark');
  mark.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i += 1) mark.append(el('i'));
  const copy = el('div', 'metric-empty-copy');
  copy.append(el('p', 'metric-empty-title', title), el('p', 'metric-empty-description', description));
  box.append(mark, copy);
  return box;
}

function section(title, kicker) {
  const box = el('section', 'metric-section');
  const header = el('div', 'metric-section-header');
  header.append(el('h3', '', title));
  if (kicker) header.append(el('span', 'metric-section-kicker', kicker));
  box.append(header);
  return box;
}

function drawChart(rows, title) {
  // Leave missing values as gaps. A continuous line must not imply unknown data.
  const entries = rows.map((row) => ({
    label: String(row?.label ?? ''),
    requests: finite(row?.requests) ? row.requests : null,
  }));
  if (!entries.some((entry) => entry.requests !== null)) return null;
  const width = 310;
  const height = 134;
  const left = 4;
  const right = width - 4;
  const top = 13;
  const bottom = height - 27;
  const max = Math.max(1, ...entries.map((entry) => entry.requests ?? 0));
  const x = (index) => entries.length === 1 ? width / 2 : left + index * (right - left) / (entries.length - 1);
  const y = (value) => bottom - value / max * (bottom - top);
  const wrapper = el('div', 'metric-chart');
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': title });
  const svgTitle = svgEl('title');
  svgTitle.textContent = title;
  svg.append(svgTitle);
  for (const fraction of [0, 0.5, 1]) {
    svg.append(svgEl('line', { x1: left, x2: right, y1: y(max * fraction), y2: y(max * fraction), class: 'metric-chart-grid' }));
  }
  let segment = [];
  const flush = () => {
    if (!segment.length) return;
    const line = segment.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    if (segment.length > 1) {
      svg.append(svgEl('path', { d: `${line} L ${segment.at(-1).x} ${bottom} L ${segment[0].x} ${bottom} Z`, class: 'metric-chart-area' }));
      svg.append(svgEl('path', { d: line, class: 'metric-chart-line' }));
    }
    segment = [];
  };
  entries.forEach((entry, index) => {
    if (entry.requests === null) flush();
    else segment.push({ x: x(index), y: y(entry.requests) });
  });
  flush();
  const readout = el('p', 'metric-chart-readout', '移动或聚焦图中圆点，查看请求次数');
  readout.setAttribute('aria-live', 'polite');
  const initialReadout = readout.textContent;
  entries.forEach((entry, index) => {
    if (entry.requests === null) return;
    const dot = svgEl('circle', {
      cx: x(index), cy: y(entry.requests), r: 3.1,
      tabindex: '0', role: 'img', class: 'metric-chart-dot',
      'aria-label': `${entry.label}，${displayNumber(entry.requests, true)} 次资源请求`,
    });
    const dotTitle = svgEl('title');
    dotTitle.textContent = `${entry.label} · ${displayNumber(entry.requests, true)} 次`;
    dot.append(dotTitle);
    const show = () => { readout.textContent = `${entry.label} · ${displayNumber(entry.requests, true)} 次资源请求`; };
    const reset = () => { readout.textContent = initialReadout; };
    dot.addEventListener('pointerenter', show);
    dot.addEventListener('focus', show);
    dot.addEventListener('pointerleave', reset);
    dot.addEventListener('blur', reset);
    svg.append(dot);
  });
  const tickIndices = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];
  for (const index of tickIndices) {
    const label = svgEl('text', {
      x: x(index), y: height - 5,
      'text-anchor': index === 0 ? 'start' : index === entries.length - 1 ? 'end' : 'middle',
      class: 'metric-chart-label',
    });
    label.textContent = entries[index].label;
    svg.append(label);
  }
  wrapper.append(svg, readout);
  return wrapper;
}

function toolRanking(tools) {
  const sorted = tools.filter((tool) => finite(tool?.clicks))
    .map((tool) => ({ name: String(tool.name || '未命名工具'), clicks: tool.clicks }))
    .sort((a, b) => b.clicks - a.clicks);
  if (!sorted.length) return null;
  const list = el('ol', 'metric-tools');
  const maximum = Math.max(1, ...sorted.map((tool) => tool.clicks));
  for (const [index, tool] of sorted.entries()) {
    const item = el('li', 'metric-tool');
    const row = el('div', 'metric-tool-row');
    const name = el('span', 'metric-tool-name');
    name.append(el('span', 'metric-tool-rank', String(index + 1).padStart(2, '0')), document.createTextNode(tool.name));
    row.append(name, el('span', 'metric-tool-value', `${displayNumber(tool.clicks, true)} 次`));
    const track = el('div', 'metric-tool-track');
    const bar = el('div', 'metric-tool-bar');
    bar.style.width = `${100 * tool.clicks / maximum}%`;
    track.setAttribute('aria-hidden', 'true');
    track.append(bar);
    item.append(row, track);
    list.append(item);
  }
  return list;
}

function formatObservedAt(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return `${String(value).slice(5,7)}月${String(value).slice(8,10)}日`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Singapore', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export function mountMetricsPanel(root, initialData = {}) {
  root.classList.add('metrics-panel');
  root.setAttribute('aria-label', 'suekit 流量与工具使用统计');
  function update(data = {}) {
    root.replaceChildren();
    const header = el('header', 'metrics-header');
    const title = el('h2', 'metrics-title', 'suekit流量与使用情况');
    const sourceMeta = el('div', 'metrics-source-meta');
    const snapshot = data.sourceMode !== 'live';
    const badge = el('span', 'metrics-data-badge', snapshot ? '数据快照' : '已更新数据');
    sourceMeta.append(badge);
    const observed = formatObservedAt(data.observedAt);
    if (observed) sourceMeta.append(el('span', 'metrics-observed-time', `最近更新：${observed}`));
    header.append(title, sourceMeta);

    const summary = el('section', 'metrics-summary');
    summary.setAttribute('aria-label', data.windowLabel || '近 24 小时统计');
    const total = el('div', 'metric-summary-card');
    const totalValue = el('p', 'metric-summary-value', displayNumber(data.assetRequests, true));
    totalValue.append(el('span', 'metric-summary-unit', '次'));
    total.append(el('p', 'metric-summary-label', '资源请求'), totalValue, el('p', 'metric-summary-caption', data.windowLabel || '近 24 小时'));
    const average = el('div', 'metric-summary-card');
    const averageValue = el('p', 'metric-summary-value', displayNumber(finite(data.assetRequests) ? data.assetRequests / 24 : null));
    averageValue.append(el('span', 'metric-summary-unit', '次'));
    average.append(el('p', 'metric-summary-label', '每小时平均'), averageValue, el('p', 'metric-summary-caption', '24 小时总量 ÷ 24'));
    summary.append(total, average);

    const hourly = section('每小时资源请求', '24H');
    const hourlyChart = Array.isArray(data.hourly) && data.hourly.length ? drawChart(data.hourly, '近 24 小时的每小时资源请求次数') : null;
    hourly.append(hourlyChart || emptyState('暂无逐小时明细', '当前仅有近 24 小时总量，接入明细后显示时段变化。'));

    const daily = section('近 7 天趋势', '7D');
    const dailyChart = Array.isArray(data.daily) && data.daily.length ? drawChart(data.daily, '近 7 天的每日资源请求次数') : null;
    if (finite(data.weeklyTotal)) {
      const weekly = el('p', 'metric-period-total', '7 天累计 ');
      weekly.append(el('strong', '', `${displayNumber(data.weeklyTotal, true)} 次`));
      daily.append(weekly);
    }
    daily.append(dailyChart || emptyState('暂无每日趋势', finite(data.weeklyTotal) ? '已获取 7 天总量，尚无每日明细。' : '还未获取近 7 天的每日资源请求数据。'));

    const popular = section('热门工具', '点击次数');
    const ranking = Array.isArray(data.tools) ? toolRanking(data.tools) : null;
    popular.append(ranking || emptyState('暂无工具点击数据', '接入点击统计后，显示工具使用次数与排名。', 'tools'));

    root.append(header, summary, hourly, daily, popular);
  }
  update(initialData);
  return { update };
}
