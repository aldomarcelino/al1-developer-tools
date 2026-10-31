# Ramupod

**Useful tools. Less effort.**

Thoughtful online tools for documents, text, data, and everyday tasks. Ramupod is an independent product, created and maintained by Aldo Marcelino NF Lubis. The wordmark is written `ramupod`.

Built with Next.js App Router, React, TypeScript, and Tailwind CSS. Cloudflare Workers is the deployment target; frontend and future API routes stay in this repository.

Historical deployment: [al1-developer-tools.aldomarcelino.workers.dev](https://al1-developer-tools.aldomarcelino.workers.dev). First deployed and verified on 25 October 2026. See [deployment verification](docs/deployment/verification.md) for the deployed version, checks, resource findings, and remaining operational limits; see [webhook strategy](docs/roadmaps/webhook.md) for the proposed backend.

## Code structure

Routes in `app/` compose feature-owned screens from `features/<tool-slug>/`. Shared components use only three flat folders: `components/ui/` for controls, `components/layout/` for the shell/navigation/footer, and `components/cummon/` for shared tool chrome, brand, and SEO renderers. Tool logic, feature hooks, styles, and tests stay with their feature. Configuration is in `config/`, shared hooks in `hooks/`, and cross-feature helpers in `lib/`.

The homepage's static sections are Server Components; only discovery/search owns client state. ESLint prevents shared/UI modules from depending on features and prevents direct dependencies between features. `npm test` discovers colocated tests automatically.

See [architecture and adding a tool](docs/architecture.md) for the complete tree, ownership rules, and workflow. Public asset paths and application routes remain unchanged.

## Local development

Use Node.js 24.22+ (`nvm use`), then `npm ci` and `npm run dev`. The existing Next.js development command remains available; Cloudflare scripts use vinext, whose compatibility check passes for this app. vinext is beta: production builds and Workers-runtime smoke checks are required before release.

## Available tools

JSON Formatter, Markdown Editor, Diff Viewer, Notes, JWT Decoder, Base64/URL, Regex Tester, Timestamp Converter, Random Keygen (including UUIDs), JSON to TypeScript, SQL Formatter, cURL to Code, and Character Counter. Processing is browser-local. Generated cURL code is text; the converter does not execute network requests. JSON follows native JavaScript number precision and duplicate-key behavior. JWT decoding does not verify signatures.

New additions:

- **JSON ↔ YAML Converter** (`/tools/json-yaml-converter`): two-way conversion, validation, local UTF-8 files up to 512 KB, copy and download. Uses YAML 1.2 core types, rejects unsafe integer precision and circular/excessive aliases, and explains comment/formatting loss in JSON.
- **Image to PDF** (`/tools/image-to-pdf`): arrange up to 20 JPG/PNG images with A4, US Letter, or image-sized pages, orientation and margins. Images are checked before decoding, re-encoded for orientation/metadata handling, and processed locally. Limits: 10 MB each, 50 MB combined, 16 megapixels each / 64 megapixels combined, and 75 MB prepared/output size.
- **Date Calculator** (`/tools/date-calculator`): signed date differences, add/subtract calendar days, and Monday–Friday business days. Optional inclusive endpoints; public holidays are not excluded. Calendar-only calculations avoid timezone and DST effects.

Webhook Inspector is **not operational**. Its interactive preview only switches between bundled sample events, with no network requests, endpoint creation, storage, or replay. No backend or database is provisioned for this release.

Tool availability is centralized in `config/tools.ts` (`status`). Add a tool entry and its explicit `app/tools/<slug>/page.tsx`; the catalog count, navigation labels, and sitemap derive from the data. Only planned tools use the fallback route.

## Notes

`/tools/notes` is part of the curated header toolkit. Notes persist only in the current browser under `al1-local-notes`, using a validated `{ version: 2, notes: [...] }` schema (legacy version 1 exports remain supported). Each note has an ID, title, searchable plain-text content, optional validated rich-text document, created/updated timestamps in milliseconds, and a pinned flag. Only title/content/formatting changes update the last-edited timestamp. Autosave is debounced by 500 ms and flushes when the page hides or the workspace unmounts; “Saved” is shown only after a successful write. There are no notes API requests or backend dependencies.

The borderless rich-text editor supports H1–H3, paragraphs, bold, italic, underline, strikethrough, bullet/numbered lists, checklists, quotes, inline code, code blocks, dividers, and undo/redo. Note actions live in the list with keyboard-accessible tooltips. Formatting is stored as validated editor JSON, never arbitrary HTML.

JSON import validates all fields before showing a preview. “Add as copies” preserves existing notes and creates fresh IDs. Merge overwrites matching IDs only after the user chooses it; replace requires an explicit destructive choice. Delete also requires confirmation. Malformed stored data is left untouched, with an original-data download before an explicit reset. Storage access/quota errors retain edits in memory and offer retry/export. Cross-tab changes are detected and require an explicit choice when this tab has unsaved edits.

Notes are not encrypted or synced. Clearing browser storage removes them, so export backups and avoid secrets or sensitive credentials. Limits: 500 notes, 200 title characters, 100,000 content characters per note, and 5 MB per collection/import. Browser quota can be lower. Unit tests cover CRUD, timestamp behavior, search/sort, validation/import modes, unavailable storage, quota failures, and cross-tab conflict detection.
-

## Checks

-
- `npm run lint`-
- `npm test`
- `npm run typecheck`
- `npm run build` — Next.js production build.
- `npm run build:cloudflare`
- `npm run preview:cloudflare` — run the built app in local Workers runtime.
- `npm run deploy:dry-run` — validate deployment configuration without building or publishing.

## Deploy to Cloudflare Workers

Use the **repository root**, not `app/`, as the project root. The `app` folder alone is missing dependencies, config, components, and utilities.

1. Run `npm ci` with Node.js 24.22+.
2. For local production builds, copy `.env.example` to `.env.production.local`. Set `SITE_URL` to the confirmed public origin and `INDEX_SITE=true`. Keep the existing configured origin until a domain change is verified; the historical Workers URL above is a deployment record. This ignored file is read only in production mode; previews must explicitly use `INDEX_SITE=false` and their own mode. For CI, supply these values as production build variables instead. Rebuild after changing the public origin.
3. Run the checks above. Cloudflare deployment uses `vite.config.ts` and `cloudflare.config.ts`.
4. Authenticate locally using `npx cf auth login`, then run `npm run deploy`. This publishes the build. Never commit API tokens.
5. For Workers Git integration: root directory `/`, build command `npm run build:cloudflare`, deploy command `npx cf deploy --prebuilt --mode production`; use Node.js 24.22+. Supply the build variables above. These public SEO settings are baked into the build; changing them requires a rebuild. Preview environments must keep `INDEX_SITE=false`.
6. Test `/`, every available tool, `/tools/webhook-inspector`, an unknown URL (404), `/robots.txt`, and `/sitemap.xml`. Confirm security headers and no browser console errors. Attach a custom domain later and update `SITE_URL`.

No R2, KV, image service, D1 binding, or paid resource is required today. Workers Free quotas still apply to dynamic rendering; verify CPU usage after release. The paid plan has usage-based charges and is not an unlimited fixed-price plan.

## Future webhook backend

Implement Next.js Route Handlers in this same app, and add a D1 binding only when request storage is implemented. Before enabling public capture/replay, add owner-only history access, expiry and deletion, payload/storage limits, rate limits, and replay destination restrictions. A client-side utilities privacy claim must never imply that webhook payloads remain only in the browser.

[Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

Cloudflare tooling currently requires patched transitive overrides for `fflate`, `undici`, and `zod`; these are pinned in `package.json`. Revisit them when upstream packages include the fixes. Run `npm audit` after dependency updates.

## SEO and product identity

`config/creator.ts` holds the public name (Aldo Marcelino NF Lubis), shorter names, and verified LinkedIn, GitHub, and email contacts. `/about` introduces Ramupod and attributes its creator; the footer links to it on every page. No WhatsApp number or unverified portfolio domain is invented.

`lib/seo/metadata.ts` builds page metadata; `lib/seo/tool-metadata.ts` holds unique descriptions and usage notes for each canonical tool, and `lib/seo/person-schema.ts` preserves the factual creator schema. Tool pages include related links, WebApplication and breadcrumb JSON-LD. The About page uses AboutPage with a factual Person creator; the site uses WebSite. No ratings, testimonials, or usage counts are fabricated. JWT decoding explicitly does not validate signatures. The webhook preview is noindex until it becomes a working tool.

`/tools/base64` and `/tools/random-keygen` permanently redirect to their canonical tool pages to consolidate duplicate content. The sitemap includes the homepage, maker profile, Privacy Policy, Terms of Use, and available tools only. The existing `SITE_URL` configuration (including its established fallback) supplies canonical URLs, schema URL IDs, and social-image URLs; `INDEX_SITE=true` enables production indexing. Keep previews false. Optionally set `GOOGLE_SITE_VERIFICATION` to a Search Console tag value. Rebuild when these public settings change.

After publishing, verify the production domain in Google Search Console, submit `/sitemap.xml`, and inspect the homepage, `/about`, and a tool URL. Evaluate Ramupod search visibility separately from the creator’s name. Crawling, competition, and reputation affect rankings; metadata cannot guarantee them. Meta keywords are intentionally omitted: Google does not use them for ranking.

References: [Google supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags), [ProfilePage markup](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

With the built app running, `npm run test:seo -- http://127.0.0.1:8787` checks unconfigured/previe- metadata. For an indexable production build, pass the conf-gured origin as a second argument: `npm run test:seo -- <local-base-url> <SITE_URL>`. Checks cover every canonical page, unique titles/descriptions, visible credits, creator schema, alias redirects, sitemap, and image dimensions.

## Small interactions

The maker profile contains a keyboard-accessible digital business card. Connect reveals real LinkedIn/email/GitHub actions; Copy email reports clipboard failures, Save contact downloads a local vCard, and the issue link opens GitHub's new-issue page without submitting anything automatically. The homepage keeps its original four-card showcase: Image Compressor & Converter in the first dark card, browser-processing copy in the lime card, JSON Formatter in the third white editor preview, and the tool count last. Both tool previews link directly to their workspaces. The image card uses a real bundled JPG/WebP example with measured file sizes; regenerate it with `node scripts/generate-home-previews.mjs`.

The header logo has a silent **“Ramu a little spark”** easter egg: eight lightweight SVG particles—leaves, a twig, a chip, code, braces, a bolt, and a sparkle—gather into the Ramupod mark, followed by “Good things, brought together.” The wordmark still links home. Keyboard activation works through a native button, a live region announces the message, and reduced motion shows only the static caption. Repeated clicks replace the current burst and reset one bounded timer; all temporary elements clear after 2.2 seconds and the timer is cleaned up on unmount.

The earlier C4 piano interaction has been retired. Its unused audio file and third-party attribution remain at `/audio/piano-do-c4.mp3` and `/audio/ATTRIBUTION.txt` for provenance and URL compatibility; the interface no longer plays audio or shows a Sound credits link.

## Privacy and terms

`/privacy` and `/terms` use a shared reading layout with content in `features/legal/data/policies.ts`, footer links, metadata, and sitemap entries. The privacy notice distinguishes local tool inputs, browser-stored Notes/theme preferences, external Markdown images, support correspondence, and Cloudflare delivery metadata. Webhook Inspector is explicitly described as a preview. Update these documents when data handling, hosting, or backend features change. Tool headers link to the policy using “Processed in your browser”. Keyboard shortcut labels use the device convention: ⌘ on Apple devices and Ctrl elsewhere.

## Brand assets and compatibility

`config/brand.ts` is the single design source for the folded pod mark with a negative-space **r**, forest/lime palette, product name, and tagline. `BrandLogo` renders that geometry inline; `npm run brand:generate` regenerates `app/icon.svg`, `public/icon.svg`, downloadable vector marks, wordmark, previews, a real multi-size ICO (16/32/48 px), the 180×180 Apple PNG, and the 1200×630 social JPEG. The generator uses the existing Next.js Sharp installation; no logo dependency was added. Generated files are checked in and do not require generation at runtime. A monochrome mark is available in `public/brand/` and via `<BrandLogo monochrome />`.

The current social preview contains no domain claim. **ramupod.com is only a candidate**: this rebrand does not change `SITE_URL`, canonical origins, Cloudflare resource names, repository URLs, or deployment history. Follow the existing verified configuration until ownership and routing are confirmed.

The legacy localStorage keys `al1-local-notes` and `al1-theme` are intentionally preserved, as are the Notes schema, import compatibility, route paths, shortcuts, bundled piano audio, and third-party attribution. Old project names in GitHub paths and historical deployment records are factual references, not active product branding. Existing Notes data may itself contain historical brand names; it is never rewritten by rebranding.

Homepage and global search share capability keywords from `config/tools.ts`; these aliases stay out of the visible UI. The header lists nine curated available tools, and **See all** links to `/#tools`.

## QA Bug Capture & Handoff

`/tools/qa-bug-report` reviews local capture packages and HAR 1.2, links event markers to requests, detects sourced identifiers, redacts common secrets, and exports a Markdown report plus a versioned evidence JSON package. It never replays requests or uploads evidence.

Build the MV3 extension with `npm run build:qa-extension`; load `dist/qa-capture` unpacked in desktop Chrome. The web tool also serves its generated ZIP for manual installation. The minimal light popup offers independent screenshot selection/annotation/download or Start testing. Testing uses a centered icon dock, Pause/Resume, request review and screenshots; Finish closes controls and opens a local handoff summary. One unfinished activity is allowed across tabs. It uses required debugger/storage/activeTab/scripting permissions and an exact-origin viewer bridge; no all-sites host permission. The alternative DevTools panel remains available. See [quick capture](docs/tools/qa-bug-capture/QUICK-CAPTURE.md). Build commands regenerate the downloadable archive.

See [usage, format, limits and tests](docs/tools/qa-bug-capture/README.md) and the [phase gates/progress](docs/tools/qa-bug-capture/PLAN.md). Screen recording is evaluated separately and is not part of this MVP.
