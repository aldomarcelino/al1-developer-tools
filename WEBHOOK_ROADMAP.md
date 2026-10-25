# Webhook Inspector implementation strategy

Status: proposed after the toolbox's first production deployment on 25 October 2026. No capture API, database, rate limiter, scheduler, or replay is deployed. Keep the existing offline preview and noindex until the capture release passes its acceptance checks.

## Architecture and delivery order

Keep the UI and Next.js Route Handlers in this repository and application. Use one D1 database for temporary endpoint metadata, bounded request bodies, and quota counters. Access bindings through `cloudflare:workers`, following the installed vinext integration. Do not introduce accounts, billing, Queues, automatic retries, R2, or KV for this MVP.

1. Prove D1 binding access, migrations, transactional capture limits, and scheduled cleanup in the local Workers runtime. In particular, prove a custom Worker entry can preserve vinext's fetch handling and export `scheduled()` with the pinned adapter. The current entry is `vinext/server/fetch-handler`; a Route Handler alone does not receive Cron events. Do not add a cron configuration without a working scheduled handler.
2. Implement capture and owner-only APIs, expiry, rate limits, and quota enforcement before exposing endpoint creation publicly.
3. Connect the existing design to real history/detail views, manual refresh, deletion, empty/error states, and explicit server-storage privacy copy.
4. Deploy a bounded capture release, verify isolation and limits live with synthetic payloads, then update catalog availability and indexing.
5. Add manual replay only after the separate replay security gate below passes.

## Phase A: capture and inspect

Proposed API surface (names are a design, not existing routes):

| Route                                                      | Authorization and behavior                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/webhooks/endpoints`                             | Same-origin creation; issue independent capture token and owner secret once; return expiry and limits.                                                     |
| `/api/webhooks/capture/[captureToken]`                     | Public write-only capture for GET, HEAD, POST, PUT, PATCH, DELETE; explicitly handle OPTIONS with no permissive browser CORS. Never returns stored events. |
| `GET /api/webhooks/endpoints/[id]/requests`                | Owner bearer secret; newest-first metadata, cursor pagination, 20 items/page. No bodies in list responses.                                                 |
| `GET /api/webhooks/endpoints/[id]/requests/[requestId]`    | Owner bearer secret; bounded body and selected headers.                                                                                                    |
| `DELETE /api/webhooks/endpoints/[id]/requests/[requestId]` | Owner bearer secret; delete one event.                                                                                                                     |
| `DELETE /api/webhooks/endpoints/[id]`                      | Owner bearer secret; delete endpoint and all associated events.                                                                                            |

Use Web Crypto to generate a minimum 128-bit capture token and independent 256-bit owner secret. Store only SHA-256 digests, use constant-time comparison where applicable, and scope every history/detail/delete query to the authorized endpoint. The public capture token never authorizes reads, deletion, or replay. Never place owner secrets in URLs, analytics, or logs. Return credentials with `Cache-Control: no-store`; all private API responses also use no-store. Keep owner credentials in tab session storage with clear loss/expiry behavior; no account recovery is promised. The capture URL can be copied separately without copying the owner secret.

Validate Origin for browser mutations, omit cross-origin read permissions, use prepared SQL, and redact credentials from errors. A public capture URL is intentionally callable by servers without an Origin header. Do not expose a debug or database administration endpoint.

### Initial limits to implement and measure

These are application limits proposed for a small free demo, not Cloudflare quotas. Make them server-side configuration with a capture kill switch; do not silently upgrade a plan when a limit is reached.

| Control                      | Initial value                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Endpoint lifetime            | 24 hours from creation; capture does not extend it                                        |
| Retained events              | Latest 50 per endpoint; remove oldest atomically                                          |
| Raw request body             | 65,536 bytes; reject oversized streams with 413                                           |
| Stored headers and URL/query | 8 KiB total headers, 2 KiB URL/query; redact then enforce bounds                          |
| Active endpoints globally    | 50; reject creation when full                                                             |
| Endpoint creation            | Best-effort edge prefilter; strict 5/hour per short-lived hashed source, 100/day globally |
| Capture traffic              | Best-effort edge prefilter: 10/minute per endpoint and 30/minute per source               |
| Global accepted captures     | Strict 2,000/day across endpoints; return 429 after budget exhaustion                     |
| Owner reads                  | 30/minute per owner/endpoint, plus manual refresh button cooldown                         |
| Cleanup                      | Every 15 minutes, bounded indexed batches; retry remaining work on the next run           |

Enforce actual streamed bytes, not only Content-Length. Reject unsupported content encodings instead of decompressing unbounded input. Preserve bounded raw bytes as a BLOB and content type; render text/JSON safely and offer a bounded binary view/download. Redact Authorization, Proxy-Authorization, Cookie, Set-Cookie, API-key headers, and known credential query parameters before storage. Retain useful diagnostic headers such as content type, user agent, event type, and provider signature headers only under an explicit documented policy. Bodies may still contain secrets: the UI must say so before creating an endpoint. Never execute or render received HTML.

Rate limiting at the edge is approximate and per Cloudflare location. It is an abuse prefilter, not a global billing guarantee. Strict admission quotas and active/retained counts must be enforced atomically in D1, including parallel requests from different locations. Reject if the quota service/database fails; do not acknowledge a capture before successful persistence. Test the rollback behavior of quota reservation and insertion together. Return 201/204 only after commit, generic 404 for unknown/expired capture tokens, 429 for quotas, and 503 for storage failure without leaking SQL or secrets.

### Storage and retention

- `endpoints`: opaque ID, capture digest, owner digest, created/expiry times, bounded counters. Index capture digest uniquely and expiry for cleanup.
- `requests`: opaque ID, endpoint ID, arrival timestamp, method, redacted bounded URL/headers, body BLOB, content type and byte counts. Index `(endpoint_id, received_at, id)` and expiry as needed; validate query plans.
- `quota_buckets`: compact time-window counters and expiry; index keys/time windows, expire stale counters. Store a daily salted digest of source IP only if needed for abuse control, never the raw address; disclose the retention.
- Phase B adds bounded `replays` with an endpoint-scoped unique idempotency key.

Capture, trim, and admission-counter updates must have transactional semantics; avoid read-count-then-insert races. Do not rely on a foreign-key cascade without testing that the actual D1 connection enforces it. History filters `expires_at > now` even if cron is delayed. Expired data becomes inaccessible immediately and is physically removed on cleanup; cleanup lag must be visible as an operational failure. Process bounded batches instead of scanning/deleting the entire database in one invocation.

At 50 endpoints × 50 events × 64 KiB, bodies alone are about 156 MiB; headers, indexes, quota rows, and database overhead add storage. Set an operational stop threshold below 300 MB and measure actual database size. Track rows read/written from D1 metadata, including index updates, eviction, deletion, and cleanup. A daily accepted-capture limit is not a bound on all database operations: rejected traffic and owner reads also consume resources. Keep edge filtering before D1, cap reads, and fail closed under overload.

Deletion removes application access and active rows, but do not promise immediate erasure from provider backups. D1 currently documents seven days of Time Travel on Free. Publish accurate retention/deletion language before release.

### Capture release gate

Verify binary/text/JSON capture, chunked oversize rejection, missing/lying Content-Length, duplicate requests, parallel 51st captures, endpoint/global budget races, foreign endpoint/request IDs, wrong/missing owner secrets, capture-token read attempts, expired endpoints with delayed cron, deletion, SQL/HTML injection, database failures, and denied browser cross-origin access. Test across different browser timezones and desktop/mobile views. Prove cleanup with the local scheduled-event API and then synthetic expiring live data. Record actual Worker CPU, D1 reads/writes/storage, and errors under a small bounded burst before enabling public creation.

## Phase B: controlled manual replay

Add `POST /api/webhooks/endpoints/[id]/requests/[requestId]/replay` behind owner authorization. Replay is a separate outbound action and must never run automatically on capture, refresh, navigation, or retries from the UI. Start with POST/PUT/PATCH to explicitly approved test destinations. Show destination, method, and payload for confirmation and warn about side effects.

- Initially allow only operator-approved exact HTTPS origins on port 443 with controlled DNS. Deny arbitrary user-supplied hosts, IP literals, credentials in URLs, non-HTTP schemes, localhost, private/internal/link-local/reserved IPv4 and IPv6, metadata endpoints, the toolbox itself, and its capture routes. Do not use hostname suffix matching.
- Disable redirects (`redirect: manual`) and report 3xx without following. General destination support requires a proven policy covering DNS rebinding and the address actually connected to; a separate DNS lookup or a platform flag alone does not prove SSRF safety. Keep generic replay disabled if the adapter cannot enforce that policy.
- Build outbound headers from an allowlist. Strip Authorization, cookies, Host, Content-Length, Forwarded/X-Forwarded-_, CF-_, hop-by-hop headers, and every header nominated by Connection. Provider signatures generally become invalid after changes; do not claim replay re-signs events.
- Use a five-second overall AbortController deadline, 64 KiB outbound body cap, and 64 KiB streamed response cap. Cancel response reading on the limit, record truncation, and keep only selected response headers. Render responses as inert data. Do not forward the owner secret.
- Require an owner-generated idempotency key and unique `(endpoint_id, key)` database constraint. Reserve pending status before sending; a duplicate returns the existing result/status. Disable the UI button while pending. A timeout or crash after sending has an unknown outcome: do not resend automatically or promise exactly-once delivery.
- Initial budgets: 3 replays/minute per endpoint, 10/day per endpoint, 100/day globally; count failures and unknown outcomes too. Expire replay records with the endpoint.

Replay gate: controlled destinations only; prove authorization isolation, redirect refusal, blocked address/URL variants, no secret leakage, slow/large responses, double clicks, parallel duplicate keys, expired/deleted events, and unknown outcomes after interrupted delivery. Keep automatic retry/Queues/accounts/billing deferred until observed demand justifies them and costs are approved.

## Privacy and operations

Keep the current browser-local promise for the eleven utilities. Webhook Inspector must instead disclose that request bodies and selected headers are sent to Cloudflare and temporarily stored in D1, who can read them, exact expiry, deletion behavior, and backup limitations. Use synthetic examples and discourage production secrets/payment data. Do not log payloads, tokens, owner secrets, or full query strings. Monitor counts/errors/latency without payload collection. Keep noindex for private endpoint/history pages permanently.

## Current primary references

- [vinext Cloudflare integration](https://vinext.dev/docs/deploying/cloudflare)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Free currently includes 100,000 requests/day and 10 ms CPU per invocation; verify actual runtime CPU rather than using deployment startup time.
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): Free currently includes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; writes/indexes/deletes count.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): Free database size currently 500 MB, Time Travel seven days.
- [Rate limiter locality and accuracy](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Scheduled handlers](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)

Recheck plan availability and quotas when implementation begins. None of these proposed resources has been enabled by this document.
