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

function drawChart(rows, title, metricName = '浏览量') {
  // Leave missing values as gaps. A continuous line must not imply unknown data.
  const entries = rows.map((row) => ({
    label: String(row?.label ?? ''),
    views: finite(row?.pageviews) ? row.pageviews : null,
  }));
  if (!entries.some((entry) => entry.views !== null)) return null;
  const width = 310;
  const height = 134;
  const left = 4;
  const right = width - 4;
  const top = 13;
  const bottom = height - 27;
  const max = Math.max(1, ...entries.map((entry) => entry.views ?? 0));
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
    if (entry.views === null) flush();
    else segment.push({ x: x(index), y: y(entry.views) });
  });
  flush();
  const readout = el('p', 'metric-chart-readout', `移动或聚焦图中圆点，查看${metricName}`);
  readout.setAttribute('aria-live', 'polite');
  const initialReadout = readout.textContent;
  entries.forEach((entry, index) => {
    if (entry.views === null) return;
    const dot = svgEl('circle', {
      cx: x(index), cy: y(entry.views), r: 3.1,
      tabindex: '0', role: 'img', class: 'metric-chart-dot',
      'aria-label': `${entry.label}，${displayNumber(entry.views, true)} ${metricName}`,
    });
    const dotTitle = svgEl('title');
    dotTitle.textContent = `${entry.label} · ${displayNumber(entry.views, true)} 次`;
    dot.append(dotTitle);
    const show = () => { readout.textContent = `${entry.label} · ${displayNumber(entry.views, true)} ${metricName}`; };
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

function toolRanking(tools, unit = '次') {
  const sorted = tools.filter((tool) => finite(tool?.clicks))
    .map((tool) => ({ name: String(tool.name || '未命名工具'), clicks: tool.clicks }))
    .sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  if (!sorted.length) return null;
  const list = el('ol', 'metric-tools');
  const maximum = Math.max(1, ...sorted.map((tool) => tool.clicks));
  for (const [index, tool] of sorted.entries()) {
    const item = el('li', 'metric-tool');
    const row = el('div', 'metric-tool-row');
    const name = el('span', 'metric-tool-name');
    name.append(el('span', 'metric-tool-rank', String(index + 1).padStart(2, '0')), document.createTextNode(tool.name));
    row.append(name, el('span', 'metric-tool-value', `${displayNumber(tool.clicks, true)} ${unit}`));
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

function statTable(rows, headings) {
  const table=el('table','metric-table');
  const head=el('thead'); const hr=el('tr');
  headings.forEach(label=>{const th=el('th','',label);th.scope='col';hr.append(th);});head.append(hr);
  const body=el('tbody');
  rows.forEach(row=>{const tr=el('tr');row.forEach(value=>tr.append(el('td','',String(value))));body.append(tr);});
  table.append(head,body);return table;
}
function ranksSection(title, rows, unit='人', kicker='近 30 日 · 前 10') {
  const box=section(title,kicker);
  const list=toolRanking((rows||[]).map(row=>({name:row.name,clicks:row.count})),unit);
  box.append(list||emptyState('暂无记录','数据从 2026/10/04 开始积累。','tools'));
  return box;
}
function percent(value){return finite(value)?`${(100*value).toFixed(1)}%`:'—';}

export function mountMetricsPanel(root, initialData = {}) {
  root.classList.add('metrics-panel'); root.setAttribute('aria-label','suekit 流量与工具使用统计');
  let current=initialData, view='traffic', metric='pageviews';
  const views={traffic:'流量',audience:'来源设备',usage:'组件复制',conversion:'转化',paths:'路径'};
  function choices(items, selected, onSelect, label){
    const group=el('div','metric-choices');group.setAttribute('role','group');group.setAttribute('aria-label',label);
    Object.entries(items).forEach(([key,name])=>{const b=el('button','',name);b.type='button';b.setAttribute('aria-pressed',String(selected===key));b.addEventListener('click',()=>onSelect(key));group.append(b);});return group;
  }
  function render(){
    const data=current;root.replaceChildren();
    const header=el('header','metrics-header');
    header.append(el('h2','metrics-title','suekit流量与使用情况'));
    const cached=data.sourceMode==='daily-cache';
    const stale=data.stale||data.loadError||(cached&&Date.now()>Date.parse(data.nextUpdateAt)+7200000);
    const meta=el('div','metrics-source-meta');meta.append(el('span','metrics-data-badge',`${data.provider||'PostHog'} · ${stale?'上次数据':'每日更新'}`));
    header.append(el('p','metrics-subtitle',`统计截至 ${data.reportDate||'昨日'} · 每日 01:00 更新`));
    header.append(el('p','metrics-method','2026/10/04 开始采集 · UTC+8'));
    if(stale)header.append(el('p','metrics-subtitle','更新暂不可用，保留上次数据。'));
    root.append(header,choices(views,view,key=>{view=key;render();},'分析视图'));
    if(view==='traffic'){
      const summary=el('section','metrics-summary');summary.setAttribute('aria-label','昨日流量');
      [['visitors','访客数','人'],['pageviews','浏览量','次'],['sessions','访问次数','次']].forEach(([key,label,unit])=>{
        const card=el('div','metric-summary-card');const value=el('p','metric-summary-value',displayNumber(data[key],true));value.append(el('span','metric-summary-unit',unit));
        card.append(el('p','metric-summary-label',label),value,el('p','metric-summary-caption','昨日'));summary.append(card);
      });root.append(summary);
      const periods=section('流量总览','截至昨日');
      if(data.periods)periods.append(statTable(Object.entries({yesterday:'昨日',week:'最近 7 日',month:'最近 30 日'}).map(([key,label])=>{const p=data.periods[key]||{};return[label,displayNumber(p.visitors,true),displayNumber(p.pageviews,true),displayNumber(p.sessions,true)];}),['范围','访客','浏览','访问']));
      periods.append(el('p','metrics-method','访客按匿名浏览器去重；访问次数按会话去重，通常连续 30 分钟无操作后开始新会话。'));
      const trend=section('流量趋势','最近 7 天');
      trend.append(choices({visitors:'访客数',pageviews:'浏览量',sessions:'访问次数'},metric,key=>{metric=key;render();},'趋势指标'));
      const rows=data.trends?.daily?.slice(-7);const metricNames={visitors:'访客数',pageviews:'浏览量',sessions:'访问次数'};
      const chart=rows?.length?drawChart(rows.map(r=>({...r,pageviews:r[metric]})),`${metricNames[metric]}趋势`,metricNames[metric]):null;
      trend.append(chart||emptyState('趋势数据尚未更新','等待下一次每日同步。'));
      trend.append(el('p','metrics-method','展示截至昨日的最近 7 天，每个圆点代表一天。采集开始前没有历史数据。'));
      root.append(periods,trend);
    } else if(view==='audience'){
      root.append(ranksSection('访问来源',data.sources,'次访问'),ranksSection('设备',data.devices),ranksSection('浏览器',data.browsers),ranksSection('大致地区',data.countries));
      root.append(el('p','metrics-method','来源按访问会话统计；设备、浏览器和地区按独立访客统计，各组人数不一定可以相加。'));
    } else if(view==='usage'){
      root.append(ranksSection('组件使用',data.components,'次选择'),ranksSection('样式使用',data.variants,'次切换'),ranksSection('输出格式',data.formats,'次切换'));
      const copy=section('复制操作','最近 30 个完整日');
      copy.append(statTable([['点击复制',displayNumber(data.copy?.copy_click,true)],['复制成功',displayNumber(data.copy?.copy_success,true)],['复制失败',displayNumber(data.copy?.copy_failure,true)]],['操作','次数']));
      copy.append(el('p','metrics-method','复制次数是事件次数；一次点击可能触发重试，成功与失败次数不一定相加等于点击次数。'));
      root.append(copy,ranksSection('全部操作',data.actions,'次','最近 30 日'));
    } else if(view==='conversion'){
      const flow=data.funnel;const box=section('访问到复制的转化','最近 30 个完整日');
      if(flow){
        const list=el('ol','metric-funnel');
        [['访问网站',flow.visits],['选择组件',flow.selected],['复制成功',flow.copied]].forEach(([label,value],i)=>{const item=el('li');item.append(el('span','',`${i+1}. ${label}`),el('strong','',`${displayNumber(value,true)} 次访问`));const bar=el('div','metric-funnel-track');const fill=el('i');fill.style.width=`${flow.visits?100*value/flow.visits:0}%`;bar.append(fill);item.append(bar);list.append(item);});
        box.append(list,statTable([['访问 → 选择组件',percent(flow.selectionRate)],['选择组件 → 复制成功',percent(flow.copyRate)],['访问 → 复制成功',percent(flow.conversionRate)]],['转化阶段','转化率']));
        if(!flow.visits)box.append(el('p','metrics-method','当前没有访问记录，转化率暂无法计算。'));
      }else box.append(emptyState(data.capabilities?.funnel===false?'转化详情请在 GA4 中查看':'转化数据尚未更新',data.capabilities?.funnel===false?'当前展示流量与实际操作次数，GA4 的漏斗分析可在统计后台查看。':'等待下一次每日同步。'));
      if(flow)box.append(el('p','metrics-method','按同一次访问中实际发生的顺序统计，每次访问在每一步最多计一次。复制成功表示浏览器报告复制操作成功。'));
      root.append(box);
    } else {
      const box=section('常见操作路径','最近 30 日 · 前 8 条');
      if(data.paths?.length){const list=el('ol','metric-paths');data.paths.forEach(path=>{const item=el('li');const steps=el('div','metric-path-steps');path.steps.forEach((step,i)=>{if(i)steps.append(el('span','metric-path-arrow','→'));steps.append(el('span','metric-path-step',step));});item.append(steps,el('p','metrics-method',`${displayNumber(path.count,true)} 次访问`));list.append(item);});box.append(list);}else box.append(emptyState(data.capabilities?.paths===false?'操作路径请在 GA4 中查看':'暂无操作路径',data.capabilities?.paths===false?'可在 SueKit 统计后台的「探索」中查看路径分析。':'有访客访问或使用组件后，展示实际路径。'));
      if(data.capabilities?.paths!==false)box.append(el('p','metrics-method','只包含已记录的操作，每次访问展示前 8 步；连续重复操作合并，忽略性能监测事件。'));
      root.append(box);
    }
    const footer=el('footer','metrics-source-footer');footer.append(meta);root.append(footer);
  }
  render();return{update(data={}){current=data;render();}};
}
