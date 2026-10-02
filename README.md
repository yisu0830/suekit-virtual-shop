# SueKit Virtual Shop

An interactive four-season miniature shop for SueKit, with a traffic dashboard, day and night controls, and a link to [SueKit](https://suekit.jiongxiaosu0830.workers.dev/).

Open `index.html` directly in a browser, or serve the repository directory with a local HTTP server. The dashboard currently displays a Cloudflare data snapshot from October 2, 2026; it does not fetch live analytics.

## Build

```sh
cd rainy-corner-src
npm ci
npm run build
```

The build writes standalone `index.html`, `rainy-convenience-store.html`, and `suekit-four-seasons.html` files in the repository root.
