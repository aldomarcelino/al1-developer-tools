# IP inspection and mock data

Added 30 October 2026 using the existing Next.js App Router, React, Tailwind, CSS Modules, and shared tool components. Both tools are registered in `config/tools.ts` with metadata and structured data, so discovery, search, sitemap, and related tools pick them up automatically.

## What Is My IP & System Inspector

Route: `/tools/ip-inspector`. API: `GET /api/ip-info`.

The route declares the edge runtime and force-dynamic behavior. Cloudflare deployment uses the existing vinext Worker build; a static Pages export cannot serve this endpoint. No bindings, secrets, database, or paid API are needed. The installed vinext implementation preserves `request.cf` through request wrapping and proxy header overrides.

Visitor lookups read `cf-connecting-ip`, then the first `x-forwarded-for` entry, plus `request.cf` metadata. Without Cloudflare metadata, missing fields are explicitly unavailable. Headers outside Cloudflare are informational and must not be used as authentication or trusted identity.

Custom public IP lookups validate an IPv4/IPv6 literal and fetch a fixed HTTPS `ipapi.co` origin with an eight-second timeout and redirects disabled. Errors and provider rate limits are surfaced in the UI. Free service availability and quotas are external constraints. Response cache headers prohibit browser and CDN caching of visitor results. The endpoint does not write inspection results to storage.

Device inspection stays in page memory. WebRTC runs only after pressing its button, contacts Google's public STUN server, and closes its peer connection on completion, cancellation, or timeout. No media permission is requested. mDNS/local candidates and differing public IPs are described without asserting VPN safety or a confirmed leak. Copy All JSON keeps visitor and custom lookup results separate.

## Fake Data & Mock Generator

Route: `/tools/fake-data-generator`.

Faker is loaded through dynamic imports of the `en_US`, `id_ID`, and `ja` locale entry points. No schema or generated data is sent to an API. Avatar URLs are strings and never loaded as images. Missing locale definitions fall back to English.

The schema supports 1–40 fields and 1–1,000 rows, null probabilities, sequential IDs, numeric ranges, and four presets. Field movement buttons support keyboard operation. Data type dropdowns offer search and category grouping. After the first generation, edits debounce regeneration, cancel stale work, and prevent exporting results from an old schema. Changing only output settings reuses the same data.

JSON supports pretty/minified output; CSV supports comma/semicolon, RFC-style quote escaping, empty cells for null, and optional spreadsheet formula protection. SQL uses standard double-quoted identifiers, escaped string literals, boolean literals, and NULL. Table names are validated. TypeScript types derive from the schema, including nullability even if a sample happens to contain only nulls. Financial identifiers and passwords are for synthetic fixtures only.

## Verification

Unit tests cover all Faker types across three locales, row/range/schema limits, null endpoints, CSV/SQL escaping, TypeScript nullability, IP validation, metadata isolation/cache controls, provider failures/rate limits, candidate parsing, and peer cleanup/cancellation. Browser checks cover generation, field movement, searchable types, format switching, clipboard, row validation, and IP lookup errors. Cloudflare production build and local Worker endpoint/page smoke checks pass. Actual deployed visitor metadata still requires verification after deployment.
