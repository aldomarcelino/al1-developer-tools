# Production deployment verification — 25 October 2026

## Latest release — Notes and workspace UI

- Application commit: `31e4c33` on `main`, pushed to `origin/main` before publishing.
- Production URL: https://al1-developer-tools.aldomarcelino.workers.dev
- Cloudflare version: `305630f3-1a03-49a0-9677-6d6c5345d262`, tagged `31e4c33`.
- Runtime used for checks and build: Node.js `24.22.1`.
- Scope: rich-text browser-local Notes (fourth tool), versioned import/export and storage handling, Privacy Policy and Terms of Use, compact responsive footer, OS-aware shortcut labels, readable processing badge, custom 404, related-tool links, and copy/reset toolbar feedback.
- Checks passed: lint, type-check, all **93 tests**, Cloudflare production build, and a prebuilt deployment dry-run.
- Deployment command: `npx cf deploy --prebuilt --mode production --provision=false --tag 31e4c33`, with the existing account selected through `CLOUDFLARE_ACCOUNT_ID`. Build settings retain the confirmed production `SITE_URL` and `INDEX_SITE=true`.
- Local Workers-runtime and live production SEO checks both passed **17 pages**, security headers, two redirects, robots, sitemap, 404, assets, and social image. The production sitemap contains **16 entries**, excluding the webhook preview.
- Browser verification: the built local Worker created a rich-text note with a heading and checklist, successfully saved it, and retained its content and formatting after reload. On production, Notes initialized correctly, the processing badge opened Privacy Policy, Terms navigation and the “Contact us” mail link worked, and Notes/Terms had no horizontal overflow at 390 px. The live desktop footer had no horizontal overflow at 1280 px and its maker credit computed to 12 px. These browser checks recorded no console errors or warnings; they are a bounded smoke test, not an exhaustive test of every utility option.
- Upload: **1,776.49 KiB uncompressed / 522.21 KiB gzip**. Cloudflare reported **12 ms startup time**, which is not per-request CPU. Only `ASSETS` is bound; no new database, storage binding, or paid resource was provisioned. Webhook Inspector remains an offline preview.
- Screenshot: [published footer](artifacts/production-footer.png).

The sections below record the previous deployment and its resource observations, not new measurements for this release.

## Previous deployment

- URL: https://al1-developer-tools.aldomarcelino.workers.dev
- Worker: `al1-developer-tools`; Cloudflare account ID `622855f00c13692819df3d3145a89e57`.
- Final version: `29fef5f3-1898-4e99-ab2b-e585bb97ff7d`.
- Repository root and branch: this repository, `main`, starting from `1403240`. The deployment includes the timestamp and toolbar fixes recorded alongside this verification report.
- Node.js: exactly `24.22.1`; locked dependencies installed with `npm ci`.
- Build: `npm run build:cloudflare`; publish: `npx cf deploy --prebuilt --mode production` with the account ID selected through `CLOUDFLARE_ACCOUNT_ID`.
- Production build settings: `SITE_URL=https://al1-developer-tools.aldomarcelino.workers.dev`, `INDEX_SITE=true`, saved locally in ignored `.env.production.local`. No Google verification token was supplied.
- The initial noindex deployment registered the previously absent `aldomarcelino.workers.dev` account subdomain. The production build was then rebuilt and redeployed with the confirmed origin. HTTPS initially failed during provisioning and subsequently passed normal certificate validation.
- Frontend and server rendering use one Worker. Only `ASSETS` is bound. No D1, KV, R2, image optimization service, queue, or paid subscription was created. Portfolio was not modified or deployed.

## Checks and fixes

Passed lint, TypeScript, all 76 unit tests, Cloudflare production build, vinext dry-run, and Cloudflare Build Output upload dry-run. npm installation audit reported zero vulnerabilities. Upstream vinext/RSC sourcemap and ineffective dynamic-import warnings remain; build and runtime checks passed.

Extended `scripts/check-seo.mjs` to check MIME/frame security headers on each page, robots and production sitemap origin, unknown-route 404, audio/attribution/favicon, alongside the existing metadata, schema, redirect, and social-image checks. Ran it against the local Workers runtime and the final public production URL with the production origin argument. Both passed:

```sh
npm run test:seo -- \
  https://al1-developer-tools.aldomarcelino.workers.dev \
  https://al1-developer-tools.aldomarcelino.workers.dev
```

The HTTP checks cover 14 pages (homepage, maker, 11 utilities, offline webhook preview), unique titles/descriptions, creator/schema metadata, canonical/OG URLs, production indexability, webhook noindex, two 308 aliases, 13 sitemap entries excluding webhook, robots sitemap URL, social JPEG 1200×630, static assets, and 404 status. Normal TLS validation succeeds.

Browser verification found and fixed:

- Toolbar controls overflowed narrow screens in Base64, JSON to TypeScript, cURL to Code, and JWT. Toolbar/group wrapping and bounded scrolling of segmented tabs now keep controls within the page, preserving their existing visual design.
- Timestamp Converter used current time during cached server rendering, causing React hydration error 418. Its UTC default also dropped the `Z`, which reinterpreted the value in the browser's local timezone (a seven-hour shift in Jakarta). Time-dependent initialization now happens after hydration from a shared instant, and reset/default dates preserve UTC.

After the fixes, all 11 tools passed 44 local layout checks at 360, 390, 768, and 1280 pixels. The final deployment passed 28 browser page/layout checks (all 14 pages at mobile 390 and desktop 1280) without horizontal page overflow; a fresh final-production browser session recorded zero console errors/warnings during these checks. Timestamp default conversion outputs match the same instant in Jakarta. JSON formatting was exercised with custom input live. Other utility engines passed their unit tests and their live pages rendered; this is a bounded smoke test, not exhaustive interactive testing of every option.

Maker card Connect/back and logo click were exercised live. Save contact downloaded a vCard containing the correct name, role, email, and LinkedIn URL. Copy email was invoked, but automated clipboard readback was empty; clipboard persistence was not independently verified. Contact links were inspected; no email, LinkedIn message, or GitHub issue was submitted. Audio asset and attribution return 200; the logo interaction produced no console error, but audible playback was not measured independently.

## Resource and cost findings

The account subscriptions API returned an empty list before deployment. No paid plan was enabled. The Worker settings report usage model `standard`; that field alone is not evidence of a paid subscription. Settings show only the asset binding and Logpush disabled.

Final deployment upload: **1,320.88 KiB uncompressed / 381.43 KiB gzip**, 111 asset files discovered. Cloudflare reported **13 ms startup time** for this version; startup time is not per-request CPU.

The initial GraphQL query hit an analytics rate limit. After the requested five-minute cooldown, a query covering the early deployment window returned **65 requests, 0 errors**, CPU P50 **3,286 microseconds (3.286 ms)** and P99 **73,128 microseconds (73.128 ms)**. CPU units were verified through the live GraphQL schema descriptions. This sample includes early versions and cold traffic; it is not a load test or a final-version-only performance guarantee. Metrics can lag, and static-asset requests served without invoking the Worker are a separate consideration.

Workers Free currently allows 100,000 requests/day and 10 ms CPU per invocation. The high CPU tail exceeds that nominal budget even though no invocation errors were reported in the sample. The runtime allows occasional CPU flexibility; sustained overruns can fail with resource-limit errors. Check cold-render CPU and cache effectiveness before adding webhook workloads or expecting substantial traffic. Normal homepage requests showed `x-vinext-cache: HIT`. No additional cache infrastructure or paid plan was enabled to hide this limitation. Keep the app on Free unless Aldo explicitly approves spending.

References: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [CPU limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers metrics API](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/).

## Next actions

Use [WEBHOOK_ROADMAP.md](WEBHOOK_ROADMAP.md) for bounded capture/inspect, D1, owner isolation, cleanup, and later restricted manual replay. Webhook remains an offline preview in production; no endpoint captures data.

Search Console verification/submission was not performed. For this workers.dev hostname, use a URL-prefix property, obtain the HTML meta verification value, set `GOOGLE_SITE_VERIFICATION` in the production build environment, rebuild/redeploy, then verify ownership and submit `/sitemap.xml`. No ranking outcome is promised. Cloudflare Git integration is also not configured: set root `/`, the README's build/deploy commands, Node 24.22.1 and production variables if enabling it later. Future custom-domain changes require a new SITE_URL build and equivalent live verification.
