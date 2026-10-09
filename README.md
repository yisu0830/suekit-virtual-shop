# SueKit Virtual Shop

用一家可切换四季与昼夜的三维微缩小店，展示 SueKit 的流量与工具使用情况。

[访问网站](https://yisu0830.github.io/suekit-virtual-shop/) · [进入 SueKit](https://suekit.jiongxiaosu0830.workers.dev/)

![当前网站预览](preview.jpg)

### 使用限制

本项目源码公开，仅供非商业学习、研究及个人使用。

禁止任何商业用途，包括但不限于：售卖代码或其修改版本、搭建或提供收费产品或服务，以及用于企业商业运营。

本声明不授予项目中第三方素材的使用权，相关素材应遵守其各自的授权条款。

## 文件结构

| 文件或目录 | 用途 |
| --- | --- |
| `index.html` | 唯一的网站入口，由源码构建生成，供 GitHub Pages 发布 |
| `rainy-corner-src/` | 三维模型、交互、统计面板样式和构建程序 |
| `analytics-service/` | 每日统计服务、查询定义和服务测试 |
| `analytics.json` | 随页面打包的统计快照，用于本地打开及初始展示 |
| `preview.jpg` | 当前网站截图；统计数值以实际网站为准 |

## 本地查看与构建

直接打开 `index.html` 可查看内置快照。通过 HTTP 访问时，页面会读取线上每日统计。

需要修改页面时，编辑 `rainy-corner-src/` 中的源码，然后执行：

```sh
cd rainy-corner-src
npm ci
npm run build
```

构建只生成根目录的 `index.html`，不再生成重复页面。
