# QA Bug Capture & Handoff

Web viewer: `/tools/qa-bug-report`. The MVP connects one local capture session, bug markers, selected HTTP requests, request/response evidence, timestamps, identifiers, and a handoff report. It does not find a root cause or guarantee reproduction.

## Screenshot and testing modes (extension 0.3)

Reload the extension after rebuilding, or install the latest downloaded ZIP unpacked. The toolbar icon now uses the current Ramupod mark, and the popup stays in light mode.

- **Capture screenshot**: click for the visible viewport or drag to crop an area. A frozen-image editor opens with a compact toolbar underneath: color (red initially), draw, rectangle, arrow, text, blur, undo/redo and Save/download. Text: click a position, type, then Add/Enter. Blur: drag the area to obscure. Review the pixels before downloading; blur is not a guarantee of complete visual redaction. Escape or Close exits. No debugger/network capture starts in this mode.
- Reopening the popup on the same screenshot tab shows **Exit Screenshot Mode**, including while editing. Another tab shows **Capture in progress → Back to tab**. Download or cancel releases the screenshot lock. Reload/navigation closes screenshot mode; images are kept only in page memory until downloaded.
- **Start testing**: a centered icon dock provides request review, screenshot, Pause/Resume, Finish and Cancel, without a separate drag icon. Drag the card background/timer area to move it; buttons keep their normal click behavior. Focus the card and use arrow keys for keyboard movement. Action tooltips remain; modal close buttons have none. The timer is larger and Cancel uses destructive hover styling. Opening panels or feedback does not change the dock position. Request review has URL/method search, a status filter, direct cURL and expandable response previews (up to 1,500 characters); complete available evidence is in Ramupod after Finish.
- **Pause** cancels pending response reads and excludes network requests during the pause. **Resume** retains the same session and does not backfill. The Chrome debugging notice remains while paused because the debugger is still attached; only its Network domain is disabled. Screenshots and request evidence selection remain available while paused. The 15-minute wall-time session limit still applies on resume.
- Finish stops capture, opens the local handoff viewer and removes all testing controls/selection/editor. Cancel discards the saved testing session and releases the lock. Another testing session cannot start while the original is recording, paused or stopped-but-unfinished. Closing its tab releases the lock while retaining stopped evidence for export. Interrupted worker recovery remains stopped and requires Finish/cancel, not silent recording.

Screenshot output is a flattened PNG, maximum 1920px wide and 8 megapixels. At most 100 annotations; freehand strokes retain up to 3,000 points. Testing attachments still obey the two-image, 2 MiB per image and overall 4 MiB capture budgets. Undo/redo is available only while editing, not after exporting the flattened PNG. Standalone screenshots download directly; testing screenshots attach to that session. No video recording or full-page scrolling capture is implemented.

See [0.3 implementation and verification](./UI-ITERATION.md). `npm run test:qa-ui` (also `test:qa-quick`) runs the current combined browser suite with the same optional Playwright/Chrome environment variables described below.

## Quick capture (extension 0.2)

Reload/reinstall the rebuilt extension to use the toolbar popup. Chrome requires approval of the stronger debugger permission at install/update; it cannot be optional in Chrome. Capturing attaches only on explicit Start to the chosen tab. Keep DevTools closed in quick mode; another debugger can detach the capture.

1. Click the extension icon, choose **Local · localhost:3000** for local testing (or **dotools.com** after the updated web viewer is deployed), then **Start testing**.
2. Use the centered floating controls; drag the card background to move them. **Network** lists the latest 100 completed requests with response previews and direct POSIX **Copy cURL**. Toggle the request flag to select/unselect report evidence; filled flags persist across panel reopening and handoff. These HTTP errors are candidates, not automatic bug diagnoses. The old dock-level Mark bug/Minimize actions were removed.
3. **Screenshot** captures the visible viewport with the controls hidden. Draw arrows, rectangles, freehand pen, or numbered pins; Undo/Cancel are available. Keyboard users can move/place pins with arrows/Enter. Add a comment. **Reviewed · Save screenshot** explicitly confirms visual review. Text redaction never changes pixels; remove or censor private information before saving/sharing.
4. **Pause/Resume** excludes requests during pauses. **Finish** stops capture, then opens Ramupod with the redacted package transferred locally. The web viewer defaults to a summary, screenshots and direct cURL. Technical inspection and the long report are optional. **Download capture** works without completing a report, with reviewed images only. Screenshot-only detailed reports are supported when a reviewed image is included.
5. The popup's **Download capture** is a recovery fallback; **Delete local quick capture** removes the quick session. Quick mode retains one session; Start replaces the stopped previous one. Finish does not upload, delete or silently resume it.

The bridge is limited to `http://localhost:3000/tools/qa-bug-report` and `https://dotools.com/tools/qa-bug-report`. A one-use random fragment token, expected recipient tab, top frame, exact origin/path and five-minute expiry bind the handoff. The package travels through extension messaging and same-origin window messaging, never a server request or URL payload. The viewer validates the package before acknowledging receipt. Other deployment origins need an explicit allowlist/config update and rebuild. If handoff fails, use Download/import.

Quick capture records root tab HTTP events through CDP Network only; no target auto-attach, replay, worker/subframe internals, console, WebSocket frames or complete streams. Same-origin reload/navigation restores controls; a change of origin stops capture because temporary activeTab access ends. Chrome detach/tab close/resource limits stop recording. Interrupted worker recovery is stopped, never silently resumed. Pending bodies at Stop are Unavailable. Existing resource limits apply; pending metadata has its own 4 MiB budget. Chrome may internally buffer data independently of these limits. Screenshots are at most 1920px wide and 2 MiB each, two per session; up to 100 annotations per screenshot. This is screenshot capture, not video.

## Alternative DevTools capture and hand off

1. Download **Chrome extension** from the viewer's capture guide and unzip it. Or run `npm run build:qa-extension` and use `dist/qa-capture` directly.
2. In desktop Chrome/Chromium, open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the directory containing `manifest.json`. This is a local unpacked extension, not a Chrome Web Store listing.
3. Open the application tab you want to test. Open DevTools, then **Ramupod QA** (possibly under the More tabs menu).
4. Enter environment and application build if known. These fields are explicitly manual; neither is inferred from a domain.
5. Press **Start capture**, run the scenario, and use **Mark bug here** with a short description when the incident happens. Recording continues while another DevTools panel is visible. Keep DevTools open.
6. Press **Stop capture**, then **Export session**. Start creates a fresh session, so export the previous one first. No network request is replayed.
7. Open the Ramupod viewer and **Import capture / HAR**. Select an event marker and adjust seconds before/after; the window uses request start times. Attach relevant request checkboxes and optionally the marker to the report.
8. Inspect payload, response, headers, timing, identifier sources and body statuses. Fill title, expected/actual results, steps, preconditions, frequency and optional severity. Environment/build remain explicitly manual.
9. Use **Privacy review** to inspect default redaction and add sensitive key names. Review optional screenshots separately. Use **Preview** before exporting.
10. Copy Markdown or download Markdown / an evidence JSON package. Only selected requests are included; all session markers remain for context. Images are excluded unless explicitly included and individually marked reviewed.
11. Engineers open the JSON package in this viewer without an account. It contains the manifest and Markdown, so it also remains inspectable as plain JSON/text without a Ramupod backend. Copy payload, response, URL, headers, identifiers, or POSIX cURL using fixed-size icon buttons with Snackbar feedback.

Web data lives in page memory. **Clear session** removes it; there is no web autosave. Export files you want to retain before closing the page. Imported files on disk are never modified. Edits create report state; request source data remains distinct from the sanitized view and sanitized export.

## What can be captured

The alternative DevTools path uses the documented `chrome.devtools.network.onRequestFinished` HAR entry and calls `getContent` immediately. Its owner is a DevTools page scoped to `inspectedWindow.tabId`, not a background recorder. **Only HTTP(S) requests started after Start and emitted while the session is recording are included.** Requests before Start are not backfilled. A request still in flight when you stop may not have emitted an event and may be absent. Pending body retrieval is marked Unavailable at Stop, and late callbacks cannot enter another session.

This alternative panel does not attach the debugger itself. The combined extension now declares debugger/storage/activeTab/scripting and an exact-origin content bridge for quick mode, as described above. This DevTools path uses **storage** for already-redacted local recovery snapshots. Panel/owner communication stays within the same extension DevTools window. Closing DevTools stops capture; reopening restores an available snapshot as **stopped**, never silently recording. Recovery may omit the last unsaved events. Clear removes the current tab's snapshot. Delete-all removes saved snapshots; other active panels can save new ones until separately stopped/cleared. Browser profile backups are outside application control.

Navigation/reload remains in the same started session and adds navigation markers. Different tabs and new sessions have distinct IDs. Internal browser pages are unsupported and navigation outside HTTP(S) stops the session with an error.

Neither mode implements console capture, WebSocket frames, complete streaming responses or service-worker internals. Cached, opaque, redirected and failed requests may have no body. No body is fetched again to fill a gap. HAR import is an additional path, not a substitute for extension capture; missing HAR response text is Unavailable, not assumed empty. The HAR's first request supplies its page URL with an explicit unverified-source notice.

## Limits and completeness

| Resource           | MVP limit / behavior                                                 |
| ------------------ | -------------------------------------------------------------------- |
| Requests           | 250 per session; recording stops at the limit                        |
| Recording          | 15 minutes; recording stops automatically                            |
| Text body          | 64 KiB per direction; oversized content omitted, status Truncated    |
| Capture session    | 4 MiB serialized evidence budget; stop rather than unbounded growth  |
| Body acquisition   | 3-second timeout; pending/failed retrieval is Unavailable            |
| Event markers      | 100, all linked to the session                                       |
| Import/export file | 12 MiB UTF-8 JSON; HAR 1.2 accepted, other versions rejected         |
| Screenshots        | Two raster PNG/JPEG/WebP images, up to 2 MiB each, signature checked |
| Header/query pairs | 200 per collection; bounded name/value sizes                         |
| Identifiers        | Bounded JSON traversal, depth 15; up to 200 candidate records        |

Body states are **Captured**, **Empty**, **Unavailable**, **Truncated**, **Redacted**, and **Unsupported**. HEAD/204/304 have genuinely absent bodies; an empty callback without evidence of a zero-size body is not silently called Empty. Binary/multipart replay and complete streams are unsupported. HAR base64 textual responses are bounded and decoded as UTF-8; encoded/binary bodies in native packages are omitted in the sanitized view/export. Chrome may internally materialize a response before `getContent` returns; extension limits cannot change Chrome's own buffering.

## Correlation and identifiers

HTTP 4xx/5xx and status 0, plus duration above the displayed configurable threshold, are **candidates to review**. A 4xx may be expected. Business-error detection is opt-in: exact equality on a configured field of a captured HTTP 200 JSON body, for example `success = false` or `error.code = "PAYMENT_DECLINED"`. There is no arbitrary expression evaluation or root-cause inference.

Identifier records retain their header index or JSON field location. The internal request ID is never offered as a backend ID. Outgoing request IDs are only candidates; server adoption is not verified. Response fields are observed identifiers, not independently verified tracing records. `traceparent` is parsed only for valid lowercase W3C version 00, nonzero trace and parent IDs. Other versions/invalid values remain visible as unparsed fields; no substitute ID is invented. The parent ID is an upstream span and is not assumed to be the server's own span.

## Privacy and export

Default redaction covers Authorization, Proxy-Authorization, Cookie, Set-Cookie, common password/token/secret/session/PII key names, nested JSON, echoed JSON strings, sensitive name/value tuples, URL query parameters, URL credentials/fragments, form data, bearer/JWT and raw key-value patterns. Users can add literal sensitive key names; arbitrary regular expressions are not executed. Redaction happens before extension persistence/export and all web copy/export operations. An audit lists locations and reasons, without retaining the removed values. Oversized redacted bodies are omitted instead of bypassing the body limit.

**Automatic redaction is not perfect.** Review unrecognized formats, free text, paths and data manually before sharing. Screenshots are separate raster data and are never changed by text rules. Sensitive screenshots must be edited externally or removed. Browser DevTools itself may retain raw network information independently of this extension. The application does not log raw payloads, upload evidence, call AI, or integrate with an issue tracker.

Evidence exports are JSON only, not ZIP archives. The downloadable extension distribution is a small generated ZIP of known flat files; the viewer never extracts ZIP input, so it has no ZIP path traversal/decompression surface. Images are signature/type/size checked and are rendered only from local data URLs. HTML bodies and Markdown previews are displayed as text.

cURL targets **POSIX shells**. Arguments are single-quoted with apostrophes escaped; command substitution in input stays literal. Hop-by-hop headers, dynamic Connection-nominated headers, Host, Content-Length, and Accept-Encoding are omitted. Redacted auth gets explicit replacement placeholders. Missing/truncated/binary/multipart request bodies refuse a body-faithful command. No replay button is present. Fresh authorized credentials, data, environment and backend state may be needed to reproduce.

## Exchange contract

`format: "ramupod-qa-evidence"`, `version: 1`. The normative TypeScript model and runtime validator are in `features/qa-bug-report/lib/model.ts` and `validate.ts`. Unknown versions/fields and broken session/request/marker/attachment references are rejected. The manifest includes producer, export timestamp, counts, redaction flag and Markdown. Body evidence includes status, text, MIME, encoding, original byte count when known, and an explanation when missing/limited. IDs are local evidence references; they are separate from observed backend identifier values.

## Build and tests

Use Node **24.22.1** (`.nvmrc`) for repository checks. No application runtime dependency was added. Quick-mode build/verification details are in QUICK-CAPTURE.md.

```sh
npm run build:qa-extension
npm run dev:qa-fixture
# In a second terminal:
npm run dev
```

The fixture runs at `http://127.0.0.1:3891`. It sends only synthetic credentials and tests repeated queries, POST JSON, URL-encoded forms, business errors, 400/500, 204, invalid JSON, inert HTML, delay, network failure, redirect, oversized/binary bodies, Unicode/multiline/quotes/backticks/shell syntax, valid/invalid/missing identifiers and dummy cookies/tokens.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:cloudflare
```

The extension ZIP is rebuilt automatically by production build commands. Load `dist/qa-capture`, or unzip `public/qa-capture/ramupod-qa-capture.zip` and load that directory. Do not load a ZIP directly.

`npm run test:qa-extension` is an optional real-browser integration test. Supply an existing Playwright installation via `QA_PLAYWRIGHT_PATH=/path/to/playwright/index.mjs` and matching Chromium via `QA_CHROMIUM_EXECUTABLE=/path/to/chrome-for-testing`. It uses a fresh temporary profile and removes it afterward. It never attaches to the user's normal profile. Start the fixture and viewer first (`QA_VIEWER_URL` can override the default `http://localhost:3000`). No Playwright runtime is bundled into the application.

The test-only helper opens the registered DevTools panel using the DevTools frontend's view manager and CDP. That helper may need updating with Chromium frontend changes; production capture uses documented extension APIs and has no dependency on DevTools frontend internals. Check [verification results](VERIFICATION.md) for what was actually run, browser versions, artifacts and any remaining bounds. Native Chrome UI automation was unreliable; the user explicitly authorized automated Chrome testing in a separate profile.

For production smoke checks, use `node scripts/check-security.mjs <local-url>`. SEO supports a canonical origin with disabled preview indexing: `node scripts/check-seo.mjs <local-url> https://dotools.com noindex`. Omit `noindex` when testing an explicitly indexable production build.

## Official API references

- [Chrome DevTools network API](https://developer.chrome.com/docs/extensions/reference/api/devtools/network)
- [DevTools page lifecycle and panels](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)
- [Chrome local storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [cURL options and data handling](https://curl.se/docs/manpage.html)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)

## Phase 7: screen recording evaluation (not MVP)

Screen recording, synchronization, annotations and visual redaction are **not implemented**. A later design should request explicit tab/screen selection for each recording, store capture start offsets on the same monotonic/session timeline, impose duration/byte/dimension limits, and include a local video preview before any export. Visual masking must be independently implemented and verified; existing text redaction cannot censor pixels or audio. Adding that work now would increase permissions, memory pressure and export complexity without improving the stability of the completed HTTP handoff workflow. It remains separate from MVP completion and has no promised release date.
