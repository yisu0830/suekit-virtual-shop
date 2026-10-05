# SueKit GA4 analytics backend

SueKit and suekit-virtual-shop record visits in independent GA4 properties:

- SueKit: property `557412742`, measurement `G-X1S2VP207S`.
- suekit-virtual-shop: property `557381679`, measurement `G-7219NQ9VN9`.

The shop display reads only SueKit aggregates from the existing Cloudflare endpoint. The backend fixes its reporting property to SueKit and filters its production hostname; shop visits never enter the displayed totals.

## Configuration

Store the service-account JSON as the encrypted Cloudflare Secret `GA4_SERVICE_ACCOUNT`. Never commit it or include it in frontend files or logs. The service account has Viewer access only to the SueKit GA4 property, with cost and revenue metrics restricted. Enable the Google Analytics Data API in the Cloud project.

KV binding: `ANALYTICS_CACHE`. Cron: `0 17 * * *` UTC, daily 01:00 Asia/Singapore. The public `/analytics.json` endpoint reads the cached snapshot only; visits cannot trigger Google queries. Existing PostHog history is retained separately.

The main property has event-scoped custom dimensions `component`, `variant`, and `format`. Set `GA4_CUSTOM_DIMENSIONS=false` only if these dimensions are unavailable.

## Reports

Snapshots contain yesterday and the last 7/30 complete days, daily/weekly/monthly trends, sources, device/browser/country summaries, component/variant/format use and copy-operation counts. Unique users are queried separately for each period. Incomplete, sampled, thresholded or inconsistent responses preserve the previous snapshot.

Sources count sessions; device/browser/country groups count users and cannot always be added together. Ordered session funnels and paths from the old PostHog implementation are unavailable through the standard GA4 report API; the shop directs users to GA4 Explore instead of displaying invented zero values.

GA4 collection starts 2026-10-05. Prior PostHog events are not imported. Public endpoint: https://suekit-analytics.jiongxiaosu0830.workers.dev/analytics.json.

## Verification

`node --test analytics-service/ga4-worker.test.mjs` verifies property isolation, count semantics, preservation of cache on errors, endpoint behavior, read-only OAuth JWT signing, and Singapore day boundaries. A live service-account query succeeded on 2026-10-05.
