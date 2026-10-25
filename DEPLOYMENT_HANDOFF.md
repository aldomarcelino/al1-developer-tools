# Developer Tools: deployment and webhook handoff

## Scope

Work only in `/Users/aldomarcelino/Documents/Builds/al1-developer-tools`.
GitHub: `git@github.com:aldomarcelino/al1-developer-tools.git`, branch `main`.
The portfolio is a separate repository, already deployed by Aldo. Do not modify or redeploy it.
The app supports Aldo's international remote software-engineering applications. Keep tools useful, lightweight, free to use, and honest about their capabilities.

## Current implementation

- Next.js 16.4.3 / React 19.3.1, TypeScript, Tailwind CSS. Cloudflare deployment uses vinext 1.3, Vite, `@vinext/cloudflare`, and Cloudflare's `cf` CLI. Read the actual pinned versions and AGENTS.md before edits.
- Use Node 24.22.1 (`.nvmrc`). The system Node may differ; avoid validating Cloudflare tooling with unsupported Node 25.
- Root directory is the repository root, NOT `app/`.
- `vite.config.ts` + `cloudflare.config.ts` target a single Worker named `al1-developer-tools`. Frontend and future Route Handlers can remain in this repository.
- No live Cloudflare deployment has been verified in this chat. No database, capture API, replay service, R2, KV, image service, or paid resources are provisioned by this implementation.
- Eleven catalog tools are implemented. Webhook Inspector is an explicitly offline/sample-only coming-soon preview, excluded from sitemap and marked noindex.
- SEO is in `lib/seo.ts`; creator identity is in `lib/creator.ts`. Name: Aldo Marcelino NF Lubis, short name Aldo Marcelino; email: aldomarcelinolubis@gmail.com. Verified LinkedIn/GitHub links are in creator data.
- Unique metadata, social image, WebSite/Person/ProfilePage/WebApplication/breadcrumb schema, /about, related tools, robots and sitemap exist. /tools/base64 redirects to /tools/base64-url; /tools/random-keygen redirects to /tools/uuid-generator.
- The homepage's second editor card is hello.md and opens Markdown Editor.
- The maker ticket flips to real contact actions, copies email, downloads a vCard, and links to GitHub's new-issue page. Connect has a weak/recovering-signal animation; back is arrow-only. Footer credits use the linked author name; the redundant About the maker link was removed.
- Clicking the header logo icon plays local C4 piano and decorative note particles; wordmark text still links home. Audio attribution is in public/audio/ATTRIBUTION.txt and linked from footer. Respect reduced motion and no autoplay.
- Transitive dependency security overrides (fflate, undici, zod) are deliberate; review before removing. vinext is beta and emits upstream build/sourcemap warnings; runtime checks are required.

## Next: publish the existing toolbox

1. Inspect git status, AGENTS.md, README, config, and current Cloudflare documentation/CLI. Preserve unrelated changes.
2. Run npm ci with supported Node; npm run lint; npm run typecheck; npm test; npm run build:cloudflare; npm run deploy:dry-run. The dry-run validates configuration only: it neither builds nor publishes.
3. Authenticate the user's Cloudflare account as needed (`npx cf auth login`). Never print credentials, commit secrets, or enable paid resources without authorization.
4. Deploy using npm run deploy. Alternatively build first and use `npx cf deploy --prebuilt --mode production`. Confirm the current CLI supports the chosen path.
5. Start on the assigned workers.dev domain if no custom domain exists. Set SITE_URL to that actual HTTPS origin and INDEX_SITE=true in the production build environment, then rebuild/redeploy. Optionally set GOOGLE_SITE_VERIFICATION. These public SEO settings are baked into the Vite build; changing only runtime dashboard variables is insufficient. Preview builds stay INDEX_SITE=false.
6. Smoke-test the actual deployed homepage, tools, maker page, redirects, 404s, assets, audio, card actions, mobile layout, robots, sitemap and social image. Confirm no console errors and production canonical/OG/schema URLs use the actual origin. Check Worker CPU/usage against the selected plan.
7. For local regression: npm run preview:cloudflare then npm run test:seo -- http://127.0.0.1:8787. If testing an indexable build, add the configured SITE_URL as the second argument. This checks 14 canonical pages, 2 redirects, sitemap and sharing image.
8. Guide Aldo through Search Console verification and sitemap submission once the public origin is stable. No ranking guarantees.

## Proposed webhook roadmap (not implemented)

First agree a bounded MVP, data-retention policy and cost guardrails. Keep API routes in the same app initially; add D1 only when storage is implemented. No separate backend repository is required by default.

Phase A: capture + inspect.
- Temporary random capture endpoint plus a distinct owner/read secret. Knowing a public capture URL must not grant history access or deletion rights.
- D1 migrations for endpoints, captured requests and expiry. Store bounded raw bodies and carefully selected headers; keep secrets out of logs.
- Owner-authorized history/detail/delete APIs and dashboard. Start with manual refresh rather than continuous polling.
- Proposed limits to validate: 24-hour retention, 50 retained requests per endpoint, 64 KB bodies, capped active endpoints. Enforce limits on the server; byte limits, not just Content-Length. Add rate limits and scheduled cleanup before public release.
- Return capture results only after successful storage. Handle invalid/expired endpoints, quota exhaustion and database errors clearly. Test ownership isolation and expiry.

Phase B: controlled replay.
- Manual one-shot replay first; automatic retry/queues only when needed.
- Restrict destinations and redirects to prevent SSRF/proxy abuse, including private/internal/link-local targets. Do not assume a platform flag alone solves destination validation.
- Strip dangerous/hop-by-hop headers; set timeouts and response-size limits. Store bounded results, require owner authorization, and prevent double-submission.
- Validate using controlled test endpoints; never replay real payment/production events accidentally.

Phase C: polish + production hardening.
- Accessible real UI, failure/retry feedback, deletion controls, retention/privacy copy, monitoring without payload leakage, usage/cost checks, tests and deployment verification.
- Remove coming-soon/noindex only when capture and inspection actually work; expose replay only after its safeguards pass. Keep browser-only tool privacy claims distinct from server-stored webhook data.
