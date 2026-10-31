# QA capture MVP verification — 31 October 2026

This records the original DevTools-only 0.1 MVP. The completed 0.2 toolbar, screenshot annotation and local handoff iteration has a different permission boundary and is verified in [QUICK-CAPTURE.md](./QUICK-CAPTURE.md).

Phases 0–6 are complete. Phase 7 was evaluated and deferred; screen recording is not implemented. Nothing was deployed during this work.

## Code and production checks

- Node 24.22.1: `npm test` — **221 passed**, zero failed/skipped.
- `npm run typecheck` and `npm run lint` — passed.
- `npm run build` (Next.js webpack) — passed.
- `npm run build:cloudflare` (vinext/Vite) — passed. Upstream sourcemap/static classification warnings remain; the build completes.
- `npm run build:qa-extension` — builds the unpacked extension and downloadable archive. Tests validate minimal permissions, flat local imports, safe archive entries, and that shipped capture/redaction/validation code matches its source.
- Production Next.js on port 3112 and Cloudflare preview on port 8788: `check-security.mjs` passed on both, including unique CSP nonces, spoof protection, script coverage, private HTML/404 and route CSS isolation.
- `check-seo.mjs <local-origin> https://dotools.com` passed on both: 36 pages, headers, two redirects, robots, sitemap, 404, assets and social image. QA is included in the route checks. No deployment or remote production claim is implied.

## Actual extension → report test

Chrome for Testing 151.0.7922.34 on macOS, a temporary dedicated profile, the real built MV3 extension and local fixture were used. Native Chrome UI automation had failed; the user explicitly authorized terminal-driven testing with an isolated profile. No personal browser profile or tabs were used.

`scripts/qa-extension-e2e.mjs` exercises actual Start, Mark, Stop and Export controls and imports the downloaded file into the real viewer. Playwright is supplied through `QA_PLAYWRIGHT_PATH`, with Chrome through `QA_CHROMIUM_EXECUTABLE`; neither is a new product dependency. The test helper uses CDP and a DevTools frontend helper to reveal the panel. Production capture uses only documented Chrome APIs and has no debugger permission.

Verified:

- 17 real HTTP fixture events; JSON POST payload, response, timestamps and header identifiers match the fixture. Genuine HTTP 204 is Empty. Large/binary/missing bodies have explicit statuses.
- Repeated queries, URL-encoded data, business error 200, 400/500, malformed JSON, HTML, delay, failure, redirect, Unicode, multiline, shell characters and valid/invalid/missing trace identifiers.
- Two tabs and two successive sessions stay isolated. Stop ignores later requests. Panel hiding preserves recording; reload/navigation retain session identity and markers. Closing DevTools then reopening restores a stopped snapshot, without silently recording requests while closed. Clear removes recovery storage.
- Real capture import → marker/request selection → report fields → reviewed PNG attachment → payload/response/cURL copy → preview → export → reimport preserves session, selected request, marker, report fields and attachment references.
- Copy actions show Snackbar feedback. Keyboard focus/filter interaction, malformed imports, inert HAR HTML, empty/sample states, light/dark mode, desktop and 390px mobile layout were exercised. Long URL/body content does not overflow the page.
- No new viewer console/page errors. Opening evidence, copying or exporting caused **zero requests to imported target URLs**. Dummy credentials are absent from the sanitized exported package.

## Meaningful regression coverage

Tests cover strict version/shape/reference validation, HAR with and without bodies, form/base64/binary/streaming boundaries, marker windows, sourced identifier extraction, valid traceparent parsing, nested/raw/query/header redaction, echoed tuple/name-value secrets, immutable imports, screenshot validation, safe POSIX shell arguments, and export/import round trips.

Capture tests cover immediate content retrieval, pending-body timeout and cancellation, late callbacks after Stop/new session, request/duration/body/aggregate resource caps and navigation. Adapter tests cover Clear during pending Start/recovery, queued deletion versus a later session, and storage-quota failure surfaced to the live panel while export remains usable.

An initial real capture exposed a dummy secret echoed in query tuples. The structural redaction fix and regression tests were added before the successful final capture/export gate. This does not establish perfect automatic redaction.

## Artifacts and remaining limits

Artifacts are under `artifacts/qa-bug-capture`: `real-capture.ramupod.json`, `completed-report.ramupod.json`, extension, desktop, report-builder and mobile screenshots. All capture inputs are synthetic local fixture data. Evidence/report/mobile screenshots were refreshed against the production Next.js viewer using a separate temporary headless browser. An optional duplicate full-flow run for screenshot refresh stalled at browser launch and was terminated; the earlier completed full-flow run remains the capture acceptance evidence.

DevTools must remain open. Only requests beginning during an active session and delivered by the API can be captured. Limits are 250 requests, 100 markers, 15 minutes, 64 KiB per textual body, 4 MiB capture budget and 12 MiB import/export. WebSocket frames, full streams, console, service-worker internals and faithful multipart/binary cURL are unsupported. Bodies are never fetched again. Automatic text redaction is best effort; screenshots require separate manual review. Local memory/recovery storage and exported files remain the user's responsibility. No backend, upload, replay or root-cause inference is implemented.

Screen-recording evaluation is documented in the usage guide. Future work needs explicit tab-capture consent, synchronized timestamps, strict memory/duration budgets, preview and visual redaction. It is separate from this completed request-capture MVP.
