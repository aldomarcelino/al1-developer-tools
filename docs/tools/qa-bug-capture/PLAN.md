# QA Bug Capture & Handoff — phase gates

Historical MVP gates below describe version 0.1. The user-authorized 0.2 quick-capture iteration changes the permission/capture boundary; see [QUICK-CAPTURE.md](./QUICK-CAPTURE.md).

## Phase 0 — accepted technical design (30 October 2026)

- Web: Next.js App Router `/tools/qa-bug-report`; local-only React viewer and report builder under `features/qa-bug-report`. CSS Modules and existing UI primitives. No backend, target fetch, replay, AI, analytics, issue tracker, or cloud bridge.
- Extension: `extensions/qa-capture`, Manifest V3 DevTools page creates a Ramupod QA panel. Recording owner lives in that DevTools page, scoped to `chrome.devtools.inspectedWindow.tabId`. `onRequestFinished` supplies HAR metadata; `getContent` is called immediately, with timeout and session-generation guards. No pre-start HAR backfill. Navigation stays in the same explicitly started session, with navigation markers. Different DevTools windows have separate owners.
- Permissions: only `storage` for bounded, **already redacted** recovery snapshots keyed by inspected tab. No host permissions, debugger, tabs, scripting, content scripts, externally_connectable, or wildcard messaging. Panel and owner communicate via the same extension DevTools panel window; there is no cross-site bridge.
- DevTools must remain open, though the panel may be hidden. Chrome/Chromium desktop only. HTTP(S) request/response events only. Requests completed before Start or started before Start are excluded. Failed/pending requests not emitted by the API cannot be recovered. Cached/redirect/opaque bodies may be unavailable. WebSocket frames, complete streaming responses, service-worker internals and console capture are unsupported. Browser internal URLs are rejected. Bodies are never re-fetched.
- Exchange: one UTF-8 `.ramupod.json` document, format `ramupod-qa-evidence`, version `1`, manifest, session, requests, markers, report, and inline screenshot attachments. JSON only (no ZIP reader or decompression). IDs and all links must belong to one session. Screenshot data is raster PNG/JPEG/WebP base64; never arbitrary HTML/SVG. A Markdown report is included in exports and can be downloaded separately.
- Metadata: UTC ISO timestamps plus timezone; environment/build are explicit manual input with source labels, never inferred from URL. User agent/platform come from browser metadata. Internal request IDs are never substituted for backend identifiers.
- Limits: 250 requests; 100 markers; 15-minute recording; 64 KiB each textual body; 4 MiB capture-session budget; 12 MiB import/export document; at most 2 screenshots of 2 MiB each. Oversized bodies are omitted with Truncated status rather than dangerously exporting a partial secret. getContent timeout 3 seconds; in-flight retrieval marked Unavailable when stopped. Headers/query/text counts bounded on import. HAR import is also bounded and does not presume body presence.
- Completeness: Captured / Empty / Unavailable / Truncated / Redacted / Unsupported; missing differs from HTTP 204/HEAD. MIME and encoding retained. Binary and multipart replay not claimed. HTML is plain text. No attachment markup execution.
- Redaction: default credentials, cookies and common secret/PII key names in headers, URL/query, nested JSON/form data, plus conservative raw-text patterns. Runs on capture ingestion before persistence, and on every copy/export from a separate sanitized view. Imported source is immutable in memory; no raw persistent browser storage. User can inspect/add key rules. Already-redacted changes preserve their audit summary. Automated redaction is imperfect; screenshots require separate manual review and explicit export inclusion.
- Storage: web source/report in page memory only; Clear removes it. Extension redacted recovery in chrome.storage.local; Clear removes its tab snapshot. Closing DevTools stops recording; reopen recovers a stopped snapshot, never resumes silently. Closed-tab recovery may be removed via extension settings (no cloud storage).
- cURL: POSIX single-quoted literals, safe apostrophe escaping, no shell interpolation, hop-by-hop and Content-Length omitted, text JSON/form only, explicit redacted auth placeholder. Binary/multipart/unsupported evidence refuses body-faithful cURL. No replay UI. State/auth changes may prevent reproduction.

Official references consulted:

- https://developer.chrome.com/docs/extensions/reference/api/devtools/network
- https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
- https://www.w3.org/TR/trace-context/
- Installed Next.js guides: server/client components, page conventions, CSS.

## Sequential gates

| Phase              | Acceptance before advancing                                                                                             | Status   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| 0 Design           | No backend or unsupported capture claims; explicit permissions, format, limits                                          | Complete |
| 1 Model/viewer     | Valid sample/HAR; strict validation; missing bodies handled; inert HTML; no target fetch                                | Complete |
| 2 Capture          | Build/load MV3; immediate body acquisition; stop/session guards; real fixture export/import; honest browser limitations | Complete |
| 3 Correlation      | Marker interval, selection, transparent candidate rules, sourced IDs, strict traceparent                                | Complete |
| 4 Report/export    | Form, Markdown, screenshots, POSIX cURL, downloads, manifest round trip                                                 | Complete |
| 5 Hardening        | Default redaction, review/export distinction, no dummy secrets exported, clear controls                                 | Complete |
| 6 Integration/E2E  | Code checks, real capture → report, browser UX; available only after verified core flow                                 | Complete |
| 7 Screen recording | Evaluation only; separate from MVP; no implementation until capture is stable                                           | Deferred |

## Build/load/test plan

`npm run build:qa-extension` produces `dist/qa-capture` (load this folder, not the source). In Chrome `chrome://extensions`, enable Developer mode, Load unpacked, select that folder. Open DevTools on the local fixture, open Ramupod QA, Start, run fixture, mark bug, Stop, Export. Import the JSON in the Ramupod viewer. Close/reopen DevTools to verify stopped recovery. Repeat in two tabs and two sessions. Extension installation/control availability will be recorded based on actual checks, never assumed from unit tests.

## Progress log

- Phase 0: repository, existing changes, registry/search/SEO, shared components, framework guides and official DevTools APIs inspected. New dependency not required: extension uses a minimal typed adapter and the existing TypeScript compiler for packaging.

- Phase 1 gate: model/HAR rejection and completeness tests pass; TypeScript passes; sample and sanitized request detail verified in the browser without console errors.

- Phase 2 runtime gate: actual MV3 DevTools panel captured 17 HTTP fixture events. POST payload/response, headers, timestamps and identifiers were matched. Two tabs and two successive sessions stayed isolated; panel hiding, reload/navigation, Stop, DevTools close/reopen recovery and clearing its storage snapshot passed in Chrome for Testing. The native Chrome UI control route failed, so the user explicitly authorized a temporary automated profile. This uses no private tabs/profile.
- Phase 3 gate: strict version-00 traceparent parsing, sourced header/body identifiers, missing/invalid identifiers, session-scoped marker windows and explicit business/latency candidate rules passed unit checks. IDs are not asserted to be root cause or verified backend tracing records.
- Phase 4 gate: real extension export was imported into the web viewer, request evidence selected, report form filled, payload/response/cURL copied with Snackbar, report exported and opened again. POSIX shell argv tests preserved Unicode/multiline/quotes/backticks/substitution syntax without executing it. No target URL was fetched by the viewer.
- Phase 5 gate: actual fixture capture initially revealed a dummy token in echoed query tuples. Added structural tuple/named-value redaction and a regression test; subsequent capture/export contains no dummy secret. Nested JSON, echoed JSON strings, forms, headers, query, raw fallback, custom keys, screenshots and encoded native bodies have separate tests. Redaction is still best effort and is documented as such.
- Phase 6 complete: registry marked available after the real capture-to-report gate passed. Unique icon, aliases, metadata, route and local downloadable extension archive are integrated. All 221 tests, typecheck, lint, Next.js and Cloudflare builds passed. Both production runtimes passed security and 36-page SEO smoke checks. Real browser checks covered mobile/dark, keyboard, malformed HAR/HTML, screenshot review, Snackbar and no target fetch. Adapter race/quota regressions passed. See `VERIFICATION.md` for commands, evidence and limits.
