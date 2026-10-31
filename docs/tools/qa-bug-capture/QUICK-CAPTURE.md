# Quick capture iteration — implementation gates

Historical 0.2 implementation. Current screenshot/testing UI and pause lifecycle are documented in [UI-ITERATION.md](./UI-ITERATION.md) and the usage guide.

User approved the next iteration: toolbar Start without DevTools, floating controls, immediate cURL, screenshot annotation, Finish into the web viewer, optional long report. This intentionally expands the original DevTools-only permission boundary.

1. Capture adapter: required `debugger` permission approved at install/update (Chrome does not allow it as optional); attach only on explicit Start; `activeTab` + `scripting` only for the chosen tab. No all-sites access. Reuse bounded/sanitized evidence model. Listen to Network domain only, never replay/evaluate page input. Stop/detach, navigation, cancellation and session isolation must be tested.
2. Toolbar and annotation: popup Start, movable/minimizable overlay, request review/cURL, marker, viewport screenshot; frozen canvas with pen/rectangle/arrow/pin, undo and explicit reviewed save. Two images max, raster-only, local. Video excluded.
3. Local handoff: Finish stops first, opens configured allowlisted Ramupod origin. One-use random nonce and exact recipient tab/origin/path; redacted package stays in extension local storage until website retrieves it, never URL payload or HTTP upload. Fixed content bridge on localhost:3000 and https://dotools.com only. File export remains fallback. Web validates before accepting.
4. Viewer: summary first, direct cURL, screenshots; technical explorer and long report optional. Reports may contain screenshot-only evidence. Existing HAR/manual and DevTools paths remain available.
5. Verification: protocol/permissions/resource/security tests, actual Chrome start → requests → screenshot → Finish → viewer, stop/tab isolation; typecheck/lint/test, extension archive and production build. Record actual results below.

References: Chrome debugger, scripting, activeTab, permissions, tabs.captureVisibleTab, messaging documentation; CDP Network requestWillBeSent/responseReceived/loadingFinished/loadingFailed/getResponseBody. Debugger permission is powerful, Chrome shows debugging UI, opening DevTools or another debugger may detach capture. New-origin navigation ends activeTab access and stops quick capture. Only root tab target events are captured: cross-process subframes/workers and WebSocket frames/full streams are excluded. Screenshots are visible viewport only and text redaction cannot censor them.

Status: completed; see verification below. Production origin currently follows project SITE_URL default https://dotools.com; additional deployment origins require explicit manifest/config allowlisting and rebuild. No cloud upload or Chrome Web Store publication.

## Completed verification — 31 October 2026

All five implementation gates above are complete for extension **0.2.0**. No Chrome Web Store publication or deployment was performed. The original 0.1 verification remains historical; this iteration intentionally changes permissions.

- `npm run build:qa-extension`: unpacked extension and public ZIP built, with local-only modules and explicit bridge origins. No new dependency.
- `npm test`: **229 passed**, no failures/skips. Added CDP request/query/payload/response/redaction, redirect/failure/late callback, large-body skip, in-flight request and response-header metadata caps, recipient origin/tab/frame/nonce/expiry, one-use handoff, new-session invalidation, failed deletion and screenshot-only report tests.
- `npm run typecheck`, `npm run lint`, targeted Prettier and `git diff --check`: passed.
- `npm run build` and `npm run build:cloudflare`: passed. Existing upstream sourcemap/static-classification warnings remain in Cloudflare build output.
- Production security and SEO smoke scripts passed on **both** Next.js (3112) and Cloudflare preview (8788), including the QA route, 36 pages, CSP nonce/spoof/script checks, robots/sitemap, redirects and assets.
- Actual Chrome for Testing **151.0.7922.34** in a temporary isolated profile: toolbar action → real popup Start → floating controls → **17 HTTP fixture events** → response preview/Copy cURL → arrow annotation on a frozen screenshot → reviewed Save → Stop → Finish → exact-origin local handoff → summary with screenshot and optional report. No DevTools panel was needed. The automation uses CDP's Extensions.triggerAction and attaches to the actual popup target; production code does not use this test helper API.
- A second fixture tab did not add requests to the capture. Oversized response was Truncated without reading its body. Stop ignored a later target request. Handoff loaded the same session and reviewed image; technical/report sections started closed. Summary cURL showed Snackbar. Mobile dark at 390px did not overflow. No viewer page error and no request to imported target URLs occurred.
- Both **production** viewers separately imported the actual quick package, copied cURL, opened Inspect without console/page errors or target fetches, and served an extension ZIP byte-identical to the tested artifact.

Artifacts: `artifacts/qa-quick-capture/` includes floating controls, network review, screenshot annotation, desktop summary, mobile dark summary, production viewer screenshots and the synthetic captured package. Screenshots intentionally contain synthetic fixture text; text redaction does not censor screenshot pixels.

Not claimed as browser-tested in this iteration: managed enterprise policies, every Chromium vendor/version, cross-process subframe/worker traffic, quick-mode cross-origin navigation, or worker eviction under real browser memory pressure. Stop/recovery/navigation guards are implemented; the adapter/owner tests and prior DevTools-only verification cover their documented portions. The exact-origin handoff is tested on localhost:3000; dotools.com requires deploying the matching updated viewer before selecting it. Same-origin page scripts are within the trusted viewer boundary once QA explicitly finishes there.

Remaining scope: screenshot annotation only, no video recording, automatic visual redaction or root-cause inference. Chrome may omit headers/body text; repeated headers may be represented as merged values. Network ExtraInfo, out-of-process targets and complete streams are not captured. Existing cURL limits and evidence completeness statuses still apply. Review evidence before sharing. Chrome debugger permission cannot be optional; the browser's install warning is broader than the one-tab capture behavior implemented here.

Build lifecycle fix: Vite cleans its `dist` output, which also removed `dist/qa-capture` created by the original prebuild hook. Cloudflare/vinext now use both prebuild (generate the ZIP before public assets are copied) and postbuild (restore the unpacked extension directory). Final browser verification must run after the complete Cloudflare build, not just after `build:qa-extension`. An intermediate final-run attempt timed out waiting for its missing service worker; this build-output cause was identified and fixed rather than reported as a passing capture.

Final result after the lifecycle fix: the full Cloudflare build completed its postbuild hook, `dist/qa-capture/manifest.json` remained present, all **229** tests passed, and a fresh temporary Chrome profile again completed `QUICK_NETWORK_SCREENSHOT_STOP_HANDOFF_SUMMARY_PASSED` with **17 requests** using that restored artifact.
