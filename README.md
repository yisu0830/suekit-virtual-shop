# SueKit Virtual Shop

An interactive four-season miniature shop for SueKit, with a traffic dashboard, day and night controls, and a link to [SueKit](https://suekit.jiongxiaosu0830.workers.dev/).

Open `index.html` directly in a browser, or serve the repository directory with a local HTTP server. The dashboard displays a verified Umami snapshot from October 4, 2026: 24-hour visitors and pageviews, hourly and seven-day pageview trends, and the five most frequent operations over seven days. Each 24-hour unique visitor is represented by one animated miniature customer. The customer count uses the same snapshot as the dashboard. It is a snapshot, not a live connection. `analytics.json` contains only the selected aggregate metrics, with no account credentials. The frontend loads this file when served over HTTP and uses the bundled snapshot when opened directly. Both rolling time ranges include partial boundary buckets, matching Umami. Update the snapshot from the authenticated dashboard and rebuild to refresh the standalone pages.

## Build

```sh
cd rainy-corner-src
npm ci
npm run build
```

The build writes standalone `index.html`, `rainy-convenience-store.html`, and `suekit-four-seasons.html` files in the repository root.
