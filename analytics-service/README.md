# SueKit daily PostHog analytics

The dedicated Cloudflare Worker queries project 645031 for aggregate data from suekit.jiongxiaosu0830.workers.dev, then stores one complete snapshot in Workers KV. The virtual shop reads that snapshot independently of GitHub Pages. Daily refreshes do not commit files or redeploy the website.

## Configuration

- Encrypted secret: `POSTHOG_READ_KEY`, restricted to the project and query read access. Never include it in frontend files, repository files, or logs.
- KV binding: `ANALYTICS_CACHE`, dedicated namespace; namespace ID is recorded in wrangler.jsonc.
- Cron: `0 17 * * *` UTC, daily 01:00 Asia/Singapore (UTC+8).
- Public path: `/analytics.json`; only aggregate counts and event names are exposed.

Each snapshot covers yesterday, the last 7 and 30 complete days, 30 daily trend points, 12 calendar weeks, and 12 calendar months. It also includes sources, devices, browsers, countries, component and variant use, output formats, copy operations, an ordered session funnel, and the eight most common session paths. Visitor and session totals are queried independently for each period; daily unique counts are never added together. The funnel requires pageview → component selection → successful copy in the same session. Consecutive repeats are collapsed in paths, which include at most eight tracked steps. Empty denominators return unknown rates. Queries filter both the SueKit app property and the production hostname. Failed or inconsistent queries preserve the previous snapshot. The endpoint flags data as stale two hours after the expected next refresh. Public visits only read KV and cannot trigger PostHog queries.

The main website disables automatic interaction capture, session replay, and person profiles. It records pageviews and predefined component/format/scene/selection/copy actions; URL query parameters and fragments are removed.

## Verification

Run `node --test analytics-service/worker.test.mjs`. Live PostHog queries were verified successfully on 2026-10-04; pre-installation counts were zero. Deployed endpoint: https://suekit-analytics.jiongxiaosu0830.workers.dev/analytics.json. KV binding, encrypted secret, saved cron, HTTP 200 cache reads, and frontend cutover were verified on 2026-10-04. Production pageview, selection_start, and selection_cancel appeared in PostHog Activity. The first automatic daily invocation is scheduled for 2026-10-05 01:00 UTC+8; its execution has not yet occurred.

## Full dashboard

https://us.posthog.com/project/645031/dashboard/2168674

Dashboard queries use relative UTC+8 boundaries and end at yesterday. The deployed expanded scheduled handler was manually triggered successfully on 2026-10-04, and its complete KV snapshot was read back from the public endpoint. Normal automatic scheduling remains daily 01:00 UTC+8.
