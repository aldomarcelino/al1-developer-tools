# Al1 Developer Tools

A browser-first developer toolkit built with Next.js App Router, React, TypeScript, and Tailwind CSS. Cloudflare Workers is the deployment target; frontend and future API routes stay in this repository.

Production: [al1-developer-tools.aldomarcelino.workers.dev](https://al1-developer-tools.aldomarcelino.workers.dev). First deployed and verified on 25 October 2026. See [deployment verification](DEPLOYMENT_VERIFICATION.md) for the deployed version, checks, resource findings, and remaining operational limits; see [webhook strategy](WEBHOOK_ROADMAP.md) for the proposed backend.

## Local development

Use Node.js 24.22+ (`nvm use`), then `npm ci` and `npm run dev`. The existing Next.js development command remains available; Cloudflare scripts use vinext, whose compatibility check passes for this app. vinext is beta: production builds and Workers-runtime smoke checks are required before release.

## Available tools

JSON Formatter, Markdown Editor, Diff Viewer, Notes, JWT Decoder, Base64/URL, Regex Tester, Timestamp Converter, Random Keygen (including UUIDs), JSON to TypeScript, SQL Formatter, and cURL to Code. Processing is browser-local. Generated cURL code is text; the converter does not execute network requests. JSON follows native JavaScript number precision and duplicate-key behavior. JWT decoding does not verify signatures.

Webhook Inspector is **not operational**. Its interactive preview only switches between bundled sample events, with no network requests, endpoint creation, storage, or replay. No backend or database is provisioned for this release.

Tool availability is centralized in `lib/tools.ts` (`status`). Add a tool entry and its explicit `app/tools/<slug>/page.tsx`; the catalog count, navigation labels, and sitemap derive from the data. Only planned tools use the fallback route.

## Notes

`/tools/notes` is the fourth catalog tool. Notes persist only in the current browser under `al1-local-notes`, using a validated `{ version: 2, notes: [...] }` schema (legacy version 1 exports remain supported). Each note has an ID, title, searchable plain-text content, optional validated rich-text document, created/updated timestamps in milliseconds, and a pinned flag. Only title/content/formatting changes update the last-edited timestamp. Autosave is debounced by 500 ms and flushes when the page hides or the workspace unmounts; “Saved” is shown only after a successful write. There are no notes API requests or backend dependencies.

The borderless rich-text editor supports H1–H3, paragraphs, bold, italic, underline, strikethrough, bullet/numbered lists, checklists, quotes, inline code, code blocks, dividers, and undo/redo. Note actions live in the list with keyboard-accessible tooltips. Formatting is stored as validated editor JSON, never arbitrary HTML.

JSON import validates all fields before showing a preview. “Add as copies” preserves existing notes and creates fresh IDs. Merge overwrites matching IDs only after the user chooses it; replace requires an explicit destructive choice. Delete also requires confirmation. Malformed stored data is left untouched, with an original-data download before an explicit reset. Storage access/quota errors retain edits in memory and offer retry/export. Cross-tab changes are detected and require an explicit choice when this tab has unsaved edits.

Notes are not encrypted or synced. Clearing browser storage removes them, so export backups and avoid secrets or sensitive credentials. Limits: 500 notes, 200 title characters, 100,000 content characters per note, and 5 MB per collection/import. Browser quota can be lower. Unit tests cover CRUD, timestamp behavior, search/sort, validation/import modes, unavailable storage, quota failures, and cross-tab conflict detection.

## Checks

- `npm run lint`
- `npm test`
- `npm run typecheck`
- `npm run build:cloudflare`
- `npm run preview:cloudflare` — run the built app in local Workers runtime.
- `npm run deploy:dry-run` — validate deployment configuration without building or publishing.

## Deploy to Cloudflare Workers

Use the **repository root**, not `app/`, as the project root. The `app` folder alone is missing dependencies, config, components, and utilities.

1. Run `npm ci` with Node.js 24.22+.
2. For local production builds, copy `.env.example` to `.env.production.local`. Set `SITE_URL=https://al1-developer-tools.aldomarcelino.workers.dev` and `INDEX_SITE=true`. This ignored file is read only in production mode; previews must explicitly use `INDEX_SITE=false` and their own mode. For CI, supply these values as production build variables instead. Rebuild after changing the public origin.
3. Run the checks above. Cloudflare deployment uses `vite.config.ts` and `cloudflare.config.ts`.
4. Authenticate locally using `npx cf auth login`, then run `npm run deploy`. This publishes the build. Never commit API tokens.
5. For Workers Git integration: root directory `/`, build command `npm run build:cloudflare`, deploy command `npx cf deploy --prebuilt --mode production`; use Node.js 24.22+. Supply the build variables above. These public SEO settings are baked into the build; changing them requires a rebuild. Preview environments must keep `INDEX_SITE=false`.
6. Test `/`, every available tool, `/tools/webhook-inspector`, an unknown URL (404), `/robots.txt`, and `/sitemap.xml`. Confirm security headers and no browser console errors. Attach a custom domain later and update `SITE_URL`.

No R2, KV, image service, D1 binding, or paid resource is required today. Workers Free quotas still apply to dynamic rendering; verify CPU usage after release. The paid plan has usage-based charges and is not an unlimited fixed-price plan.

## Future webhook backend

Implement Next.js Route Handlers in this same app, and add a D1 binding only when request storage is implemented. Before enabling public capture/replay, add owner-only history access, expiry and deletion, payload/storage limits, rate limits, and replay destination restrictions. A client-side utilities privacy claim must never imply that webhook payloads remain only in the browser.

[Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

Cloudflare tooling currently requires patched transitive overrides for `fflate`, `undici`, and `zod`; these are pinned in `package.json`. Revisit them when upstream packages include the fixes. Run `npm audit` after dependency updates.

## SEO and maker identity

`lib/creator.ts` holds the public name (Aldo Marcelino NF Lubis), shorter names, and verified LinkedIn, GitHub, and email contacts. `/about` is the author profile; the footer links to it on every page. No WhatsApp number or unverified portfolio domain is invented.

`lib/seo.ts` centralizes unique metadata and accurate usage notes for every canonical tool. Tool pages include related links, WebApplication and breadcrumb JSON-LD. The maker page uses ProfilePage/Person; the site uses WebSite. No ratings, testimonials, or usage counts are fabricated. JWT decoding explicitly does not validate signatures. The webhook preview is noindex until it becomes a working tool.

`/tools/base64` and `/tools/random-keygen` permanently redirect to their canonical tool pages to consolidate duplicate content. The sitemap includes the homepage, maker profile, Privacy Policy, Terms of Use, and available tools only. `SITE_URL` is required to emit real canonical URLs, schema URL IDs, and social-image URLs; `INDEX_SITE=true` enables production indexing. Keep previews false. Optionally set `GOOGLE_SITE_VERIFICATION` to a Search Console tag value. Rebuild when these public settings change.

After publishing, verify the production domain in Google Search Console, submit `/sitemap.xml`, and inspect the homepage, `/about`, and a tool URL. Link this toolkit from your real LinkedIn/GitHub/portfolio profiles. Name searches depend on crawling, competition, and reputation; metadata cannot guarantee rankings, especially for the broad name “Aldo”. Meta keywords are intentionally omitted: Google does not use them for ranking.

References: [Google supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags), [ProfilePage markup](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

With the built app running, `npm run test:seo -- http://127.0.0.1:8787` checks unconfigured/preview metadata. For an indexable production build, pass the configured origin as a second argument: `npm run test:seo -- <local-base-url> <SITE_URL>`. Checks cover every canonical page, unique titles/descriptions, visible credits, creator schema, alias redirects, sitemap, and image dimensions.

## Small interactions

The maker profile contains a keyboard-accessible digital business card. Connect reveals real LinkedIn/email/GitHub actions; Copy email reports clipboard failures, Save contact downloads a local vCard, and the issue link opens GitHub's new-issue page without submitting anything automatically. The homepage's second editor preview opens Markdown Editor.

The header logo icon plays the locally bundled C4 piano sample only on interaction and releases a bounded burst of decorative music notes. The adjacent wordmark still links home. Repeated clicks restart one player rather than stacking audio; particles clear after the animation. Reduced motion disables the particle and card transitions. Sample attribution is available from the footer at `/audio/ATTRIBUTION.txt`.

## Privacy and terms

`/privacy` and `/terms` use a shared reading layout with content in `lib/legal.ts`, footer links, metadata, and sitemap entries. The privacy notice distinguishes local tool inputs, browser-stored Notes/theme preferences, external Markdown images, support correspondence, and Cloudflare delivery metadata. Webhook Inspector is explicitly described as a preview. Update these documents when data handling, hosting, or backend features change. Tool headers link to the policy using “Processed in your browser”. Keyboard shortcut labels use the device convention: ⌘ on Apple devices and Ctrl elsewhere.
