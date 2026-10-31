# Ramupod rebrand verification

Verified locally on 29 October 2026 (Asia/Jakarta). No deployment, domain purchase, commit, or push was performed.

## Identity and design

The product name is **Ramupod**; the lowercase wordmark is **ramupod**. The primary message is “Useful tools. Less effort.” with “Thoughtful online tools for documents, text, data, and everyday tasks.”

The current mark refines the supplied folded-pod reference: two curved fields carve a lowercase **r** from the background. Its flat forest/cream and lime fills retain the user's concept without gradients or shadows. The silhouette is more compact, and both diagonal seams use the same slope and a constant gap. The **r** and seams remain transparent in SVG and monochrome versions.

The earlier geometric R is preserved in `public/brand/archive/ramupod-mark-geometric.svg`. In addition to the SVG and ICO exports, the generator writes actual-size 16, 24, and 32 px PNG proofs.

`config/brand.ts` supplies the mark geometry and palette to both `BrandLogo` and `scripts/generate-brand-assets.mjs`. Run `npm run brand:generate` to reproduce the assets. No dependency was added for the logo; the generator uses Sharp already provided by Next.js. Source assets remain usable without a runtime generation step.

- [Logo and size proof](../../public/brand/ramupod-preview.png)
- [SVG symbol](../../public/brand/ramupod-mark.svg)
- [Monochrome SVG](../../public/brand/ramupod-mark-mono.svg)
- [SVG wordmark](../../public/brand/ramupod-wordmark.svg)
- [Social preview](../../public/social-preview.jpg)

## Implemented scope

Header, mobile navigation, footer, About, maker-card label, piano tooltip, exported document titles, Notes backup filenames, legal brand references, relevant sample data, package identity, lockfile root identity, and README now use Ramupod. The About page leads with the product and retains factual creator attribution and contacts.

Metadata uses Ramupod in the site/application name, title templates and absolute page titles, Open Graph, Twitter, image alternative text, and WebSite JSON-LD. AboutPage references the product and its real Person creator; no organization or legal entity was invented. Technical tool descriptions, routes, keyboard shortcuts, layout structure, policy substance, and tool behavior are retained.

The workspace also received separate new-tool changes during this task. Those changes were preserved; the final build and checks include the three new routes. The initial development stylesheet/import mismatch and initial SEO check against a stale build were resolved by verifying the final complete build.

## Verification results

| Check                                                            | Result                                                                                                                                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                   | Passed                                                                                                                                                                                 |
| `npm run typecheck`                                              | Passed                                                                                                                                                                                 |
| `npm test`                                                       | 106 tests passed, including legacy Notes format and original storage-key tests                                                                                                         |
| `npm run build`                                                  | Passed; 28 generated pages                                                                                                                                                             |
| `npm run build:cloudflare`                                       | Passed                                                                                                                                                                                 |
| SEO checks against Next.js on port 3027                          | 21 pages passed                                                                                                                                                                        |
| SEO checks against local Cloudflare Workers preview on port 8788 | 21 pages passed                                                                                                                                                                        |
| SEO origin                                                       | Existing configured `https://dotools.com`, unchanged                                                                                                                                   |
| SEO coverage                                                     | Titles, application/OG/Twitter branding, descriptions, canonical URLs, real creator schema, security headers, two redirects, sitemap, robots, 404, assets, and social-image dimensions |
| Browser checks                                                   | Desktop 1280 px; mobile 390 px without horizontal overflow; nine-tool menu and See all; light/dark rendering and theme persistence after reload                                        |
| Notes UI check                                                   | A disposable-origin test note was saved and remained readable after reload; the Notes storage module is byte-for-byte unchanged                                                        |
| Piano interaction                                                | Clicked successfully without a visible playback error; audio asset and cleanup/error/reduced-motion logic retained                                                                     |
| Console                                                          | No errors/warnings from the final local production origin                                                                                                                              |
| Icons                                                            | Both icon.svg sources and downloadable symbol are identical; ICO contains real PNG entries at 16/32/48 px; Apple image is a real 180×180 PNG                                           |
| Social preview                                                   | Visually inspected, real 1200×630 JPEG; editable SVG also updated                                                                                                                      |
| Preservation checks                                              | SHA-256 equality confirmed domain/config files, deployment history, Notes library, creator record, audio file, and attribution                                                         |
| `git diff --check`                                               | Passed                                                                                                                                                                                 |

## Intentional historical and compatibility references

- `al1-local-notes` and `al1-theme` are retained in the storage code, initial theme script, tests, and documentation. Existing browser data is never renamed or rewritten by the rebrand.
- `al1-developer-tools` remains in real GitHub repository/issue URLs, cURL examples referring to that real repository, Cloudflare resource names, and historical deployment records.
- `dotools.com` remains in the pre-existing origin fallback, `.env.example`, `.env.production.local`, Vite configuration, and generated canonical URLs. It is configuration, not the new product wordmark.
- `public/audio/ATTRIBUTION.txt` is unchanged, including its historical product-name sentence, to preserve the bundled sample's provenance and third-party attribution.
- Existing user content can naturally contain old product names; it is outside the branding migration.

## Remaining limits

- **ramupod.com is only a candidate domain.** Ownership, DNS, canonical migration, and production routing were not assumed or changed. The existing configured origin was used for local verification; this does not assert domain ownership or a public deployment.
- The runtime available for these checks was Node.js 25.6.0. `.nvmrc` requests 24.22.1, which is not installed here. Repeating CI/release checks on that pinned runtime remains advisable.
- The Cloudflare/vinext build reports non-fatal sourcemap and static route-classification warnings. Both the build and actual Workers-runtime SEO checks passed.
- Reduced-motion behavior was reviewed in the unchanged code path; forced reduced-motion media emulation was not exercised. The browser click test verified the normal interaction.
- This verifies local behavior and metadata, not production indexing or search rankings.

## Easter egg follow-up

The previous piano interaction was replaced with the silent “Ramu a little spark” interaction in `components/cummon/ramupod-logo.tsx`. Small rounded modules gather into the logo, matching the product's pod concept. Reduced motion uses a static message; repeated activations reuse a bounded timer. The old audio and its attribution remain archived at their original URLs, but there is no audio playback or Sound credits link in the current UI. The piano test in the earlier verification table records the original rebrand stage, before this follow-up.
