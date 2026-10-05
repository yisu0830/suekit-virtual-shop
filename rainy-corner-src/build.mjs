import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const result=await build({entryPoints:[path.join(here,'main.js')],bundle:true,minify:true,format:'iife',target:['es2020'],write:false,legalComments:'inline'});
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const styles=(await Promise.all(['metrics-panel.css','dashboard.css'].map(name=>readFile(path.join(here,name),'utf8')))).join('\n');
const analytics=await readFile(path.join(here,'analytics-snippet.html'),'utf8');
const html=`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="color-scheme" content="light">
<meta name="description" content="suekit流量与使用情况，用一家四季微缩小店展示网站动态与工具使用数据。">
<title>suekit流量与使用情况</title>
${analytics}
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:radial-gradient(ellipse at 48% 42%,#f6f0e3 0%,#e4dfd3 52%,#c9ccca 100%);transition:background .6s}html[data-mode="night"] body{background:radial-gradient(ellipse at 48% 42%,#2e3447 0%,#1d283c 52%,#101b2c 100%)}html[data-mode="day"][data-season="winter"] body{background:radial-gradient(ellipse at 48% 42%,#f3f5f4 0%,#dfe8ea 52%,#bfcfd5 100%)}html[data-mode="day"][data-season="autumn"] body{background:radial-gradient(ellipse at 48% 42%,#f7eada 0%,#e4d5c3 52%,#c6bcae 100%)}#world{display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:grab}.switches{position:fixed;bottom:max(24px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;z-index:5}.switch-group{display:flex;gap:3px;padding:5px;border:1px solid #ffffff8c;background:#f5f1e5cf;border-radius:17px;box-shadow:0 8px 30px #504f4318;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}.switch-group button{appearance:none;cursor:pointer;border:0;border-radius:12px;padding:0 17px;height:44px;min-width:54px;font:500 13px inherit;font-family:inherit;font-size:13px;font-weight:500;letter-spacing:.08em;color:#796e62;background:transparent;transition:background .2s,color .2s,box-shadow .2s}.switch-group button:hover{background:#dfd7c96e}.switch-group button[aria-pressed="true"]{background:#6d3e3b;color:#fff3df;box-shadow:0 3px 9px #66373322}.switch-group button:focus-visible{outline:2px solid #b68561;outline-offset:3px}.symbol{font-size:17px;margin-right:7px;vertical-align:-1px}html[data-mode="night"] .switch-group{border-color:#7d82774d;background:#252e3dcf;box-shadow:0 8px 30px #0003}html[data-mode="night"] .switch-group button{color:#c0bbb0}html[data-mode="night"] .switch-group button:hover{background:#4a4a4b70}html[data-mode="night"] .switch-group button[aria-pressed="true"]{background:#d2b18b;color:#302b2b;box-shadow:0 3px 9px #0002}@media(max-width:560px){.switches{bottom:max(18px,env(safe-area-inset-bottom));gap:8px;flex-direction:column}.switch-group{padding:4px;border-radius:15px}.switch-group button{height:44px;padding:0 16px;min-width:58px}.switches .time button{min-width:106px}}@media(max-height:500px){.switches{bottom:10px;flex-direction:row;gap:8px}.switch-group button{height:38px;padding:0 11px;min-width:43px}.switches .time button{min-width:75px}}
</style>
<style>${styles}</style>
</head>
<body><main class="shop-dashboard">
<section class="model-stage" aria-label="四季五金店模型">
<header class="scene-heading"><h1>suekit流量与使用情况</h1><p class="scene-description">用一家小店模拟网站动态</p></header>
<canvas id="world" role="img" aria-label="suekit 两层五金店的四季三维微缩模型，顾客在街边散步并随机进店。鼠标拖动旋转、滚轮缩放、右键拖动平移；触屏单指旋转、双指缩放和平移。">suekit 四季五金店三维微缩模型</canvas>
<div class="model-toolbar">
<a class="suekit-entry" href="https://suekit.jiongxiaosu0830.workers.dev/" target="_blank" rel="noopener noreferrer" aria-label="打开 SueKit 网站（新窗口）">进入 SueKit <span aria-hidden="true">↗</span></a>
<div class="switches" aria-label="场景模式">
<div class="switch-group time" role="group" aria-label="昼夜切换">
<button type="button" data-mode-choice="day" aria-label="白天" aria-pressed="true"><span class="symbol" aria-hidden="true">☀</span>白天</button>
<button type="button" data-mode-choice="night" aria-label="夜晚" aria-pressed="false"><span class="symbol" aria-hidden="true">☾</span>夜晚</button>
</div>
<div class="switch-group seasons" role="group" aria-label="四季切换">
<button type="button" data-season-choice="spring" aria-label="春天" aria-pressed="true">春</button>
<button type="button" data-season-choice="summer" aria-label="夏天" aria-pressed="false">夏</button>
<button type="button" data-season-choice="autumn" aria-label="秋天" aria-pressed="false">秋</button>
<button type="button" data-season-choice="winter" aria-label="冬天" aria-pressed="false">冬</button>
</div>
</div>
</div>
</section>
<aside id="metrics-panel" aria-label="店铺流量与工具使用数据"></aside>
</main>
<script>${script}</script>
</body></html>`;
await writeFile(path.join(here,'../index.html'),html);
console.log(`Built standalone HTML: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`);
