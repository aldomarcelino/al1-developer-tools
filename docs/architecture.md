# Project architecture

Ramupod uses the Next.js App Router with feature-owned code and shared UI. The structure follows the installed Next.js project-organization guide. `src/` is optional; keeping `app/` at the root avoids changing the existing Next.js, vinext, and Cloudflare entry points.

```text
app/                         Routes, metadata, root layout, global CSS entry point
  tools/<slug>/page.tsx       Thin route: metadata + schema + feature workspace
components/                  Shared components; no feature ownership
  ui/                        Select, number input, segmented tabs
  layout/                    Application shell, footer, global tool-search dialog
  cummon/                    Shared tool chrome, logos, structured-data renderers
features/
  home/components/           Page composition, hero, discovery, cards, principles
  about/components/          About page and maker card
  legal/                     Privacy/Terms reading view and policy content
  not-found/                 404 view
  <tool-slug>/
    components/              Workspace and feature-only UI
    hooks/                   Feature-only stateful hooks, when needed
    lib/                     Pure tool logic and colocated *.test.ts files
    styles.module.css        Scoped feature styles, when needed
config/                      Brand, creator, site origin, tool catalog/search metadata
hooks/                       Hooks reused outside a single feature
lib/
  browser/                   Shared browser/download helpers
  format/                    Shared formatting, such as file sizes
  seo/                       Metadata builders, tool SEO content, Person schema
styles/
  base/                      Design tokens and resets
  ui/                        Shared control styles
  layout/                    Header/footer styles
  shared/                    Workspace styles and cross-feature responsive/interactions
scripts/                     Tests, SEO checks, asset generators
public/                      Public URLs and assets; paths stay stable
artifacts/                   Existing QA screenshots and generated evidence
docs/
  architecture.md            Ownership and extension rules
  deployment/                Handoff and historical verification
  roadmaps/                  Future implementation plans
  brand/                     Rebranding record
```

## Ownership rules

1. **Routes compose, features implement.** Keep page metadata, route parameters, redirects, and Next.js conventions in `app/`. Put the actual page/workspace UI in the owning feature.
2. **UI primitives are domain-independent.** A shared Select or NumberInput must not know about a tool, its inputs, product catalog, or page layout. Its API describes UI behavior, not a specific feature.
3. **A reusable composition is not necessarily a primitive.** `ToolHeader` belongs in `components/cummon/`; the application shell belongs in `components/layout/`. Neither belongs in `components/ui/`.
4. **Keep one feature's details together.** For example, Notes' editor, action buttons, storage hook, rich-text validation, tests, and styles belong in `features/notes/`. Do not promote a feature-only button into shared UI merely because it is small.
5. **Features do not import other features.** Extract a truly shared helper into `lib/` or a shared hook into `hooks/`. For example, both Hash Generator and Image Compressor import file-size formatting from `lib/format/file-size.ts`.
6. **Shared code must not depend on routes or features.** Dependency direction is `app → features → shared components/hooks/lib/config`. Shared layout may compose other shared components, but does not own tool workspaces.
7. **Import modules directly.** Use `@/` for cross-folder application imports; use relative imports for siblings. Avoid barrel `index.ts` files that mix server and client modules or eagerly pull every tool into the bundle. Node-executed tests and scripts use relative imports with explicit `.ts` extensions.
8. **Keep client boundaries local.** Add `"use client"` only where browser APIs, React state, or event handlers require it. The homepage composition, hero, principles, About page, and metadata remain server components; discovery owns its interactive search state.

`components/` has exactly three flat folders: `layout`, `ui`, and `cummon` (spelling intentional). Feature-owned components stay inside `features/<slug>/components/`. `tests/architecture.test.mjs` prevents additional shared component folders or deeper nesting.

ESLint enforces the alias-based route/feature/shared/UI boundaries. Its feature rules are discovered from `features/`, so a new feature is included automatically.

## Adding a tool

1. Create `features/<canonical-slug>/components/<name>-workspace.tsx`.
2. Put pure transformations/validation in the feature's `lib/` and colocate meaningful unit tests there. Add hooks only when feature state/lifecycle logic warrants extraction.
3. Reuse `components/ui/` controls and `components/cummon/` workspace chrome. Keep feature-specific subcomponents inside the feature.
4. Register availability, name, icon, category, and supported search aliases in `config/tools.ts`; add accurate SEO content in `lib/seo/tool-metadata.ts`.
5. Create the thin route at `app/tools/<canonical-slug>/page.tsx`, following an existing tool route. Existing redirect aliases remain routing concerns.
6. If needed, create `features/<canonical-slug>/styles.module.css`, import it from the feature entry component, and put `styles.scope` on its root. Keep each selector scoped with `:where(.scope, .scope *)`; wrap existing class selectors in `:global(...)` to preserve shared UI and generated-Markdown class names. Keep shared component CSS with the owning component. Do not import feature styles into `app/globals.css`.
7. Add the canonical route to the SEO smoke checks and run lint, typecheck, tests, and production builds.

## Tests and styling

`npm test` discovers `*.test.ts` and `*.test.mjs` under `config/`, `features/`, `lib/`, and an optional `tests/` directory. Tests remain executable with Node's type stripping; no additional test dependency is required. The former mixed utility test file is now split between Text Cleaner, QR Code Generator, and Image Compressor.

Feature styles live beside their feature as CSS Modules and are loaded through their feature entry component. The module's `scope` marker contains selectors to that feature while `:where` preserves existing selector specificity. Shared class names remain available for UI controls and rendered Markdown. Production Next.js webpack builds use `experimental.cssChunking: false` to keep unrelated feature modules out of a route, trading some additional stylesheet requests for predictable ownership. Development keeps Turbopack’s supported default. Theme ancestors and pseudo-elements remain intact. Keep keyframes in the owning module; shared loading spinners belong in shared utility styles.

`app/globals.css` contains only base tokens/resets, shared workspace/UI controls, application layout, and shared responsive rules. Home-specific and Markdown-specific responsive rules live in their owning modules. `ToolContext` and `RamupodLogo` own their CSS Modules under `components/cummon/`.

## Preserved contracts

Routes, metadata origins, deployment resource names, public asset paths, policy substance, tool transformations, shortcuts, the four-card homepage layout, and the `al1-local-notes` / `al1-theme` storage keys are unchanged. No compatibility re-export files are left at the old flat component paths. Use the new owner paths directly.

## Refactor verification

The migration passed lint without warnings, TypeScript checking, 111 unit tests, and both Next.js and Cloudflare builds. The existing SEO smoke suite passed all 23 pages in both runtimes, including redirects, robots, sitemap, schema, public assets, and metadata origins. Browser checks covered keyword search, Character Counter, shared Select with four-space JSON formatting, and image compression using the bundled landscape fixture.

A comparison of TypeScript statements confirmed that 19 pure tool modules retained their logic. All cases from the split utility tests were retained. SHA-256 checks confirmed preservation of the existing 33 public assets/deployment configuration files, and the legacy Notes/theme storage keys remained intact. No route, public asset URL, domain setting, or deployment resource was renamed.

## Tool action buttons

Use `components/ui/action-button.tsx` for tool actions instead of feature-specific button classes. `variant` supports `primary`, `secondary`, `ghost`, and `danger`; `size` supports `sm` and `md`. Use a labeled primary/secondary button for workspace actions, and `size="sm" iconOnly` for editor-header actions. Supply `title` (and optionally a more specific `aria-label`) for every icon-only button. Only `iconOnly` buttons render this text through the shared custom Tooltip portal, rather than a native browser title. Buttons with a visible label never show a tooltip. Use `tooltip` to override its text or `tooltip={false}` to suppress it. Tooltips appear after 80 ms on hover or immediately on keyboard focus, support Escape, and stay outside clipped containers. Keep icons as children so each feature can select the appropriate Lucide icon without a shared icon registry.

Use `active` / `aria-pressed` for toggles, `success` for completed actions, and `loading` for pending operations. The component owns appearance, focus, disabled state, and accessibility defaults; features keep their event handlers, shortcuts, menus, and clipboard/download logic. Styles live in `styles/ui/action-button.css`. Segmented tabs, menu items, and option chips retain their own components and semantics.

## Shared feedback and untrusted input

Use `hooks/use-notice.ts` for transient messages. It cancels the previous expiry on a new message and clears timers on unmount. Use `role="status"` for feedback and `role="alert"` for actionable validation errors.

Regex evaluation belongs in a dedicated module Worker. `use-regex-test` debounces edits, discards stale results, and terminates the worker on timeout, changed inputs, or unmount. The synchronous engine is for that worker and unit tests only; an in-loop clock check cannot interrupt a single backtracking call. Do not add a main-thread fallback.

Diff Viewer bounds combined characters, line counts, and LCS matrix cells before allocation. Derive split rows from the computed unified diff using `alignDiffRows`; do not compute LCS separately for each view.

Markdown inline parsing processes source tokens before generating HTML. Never apply Markdown string replacements to generated tags or attributes. Render raw text through HTML escaping and URL attributes through the protocol allowlist plus attribute escaping.

Audit lanjutan dan batas verifikasi saat ini: [Arsitektur dan keamanan, 29 Oktober 2026](audits/2026-10-29-architecture-security.md).

## Content Security Policy

`proxy.ts` creates a cryptographically random nonce for every HTML/RSC request, replaces incoming `x-nonce` and CSP headers, and forwards both to the renderer. `app/layout.tsx` reads the trusted nonce using `headers()` and applies it to the theme bootstrap; structured-data scripts do the same. Both installed Next.js and vinext attach the request nonce to their framework scripts.

HTML is dynamically rendered and uses `Cache-Control: private, no-store`; it must not be cached with a reusable nonce. Static assets and metadata routes are excluded by the proxy matcher. `next.config.ts` retains the restrictive baseline for static assets. Production scripts require a nonce and do not allow `unsafe-inline` or `unsafe-eval`; inline event attributes are blocked. Style attributes remain allowed for sliders, tooltip positioning, and image previews. Do not remove that style allowance without migrating these controls.

Run `node scripts/check-security.mjs <local-production-url>` after each production build to verify nonce uniqueness, script coverage, client-header replacement, 404 handling, and CSS ownership. Use the same check for the Next.js server and Cloudflare preview.
