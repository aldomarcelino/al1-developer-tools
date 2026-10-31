# SVG Optimizer, Viewer & JSX Converter

Route: `/tools/svg-optimizer`. Uses the existing Next.js/React stack, Tailwind utilities, CSS Modules, design tokens, ActionButton, CustomSelect, SegmentedTabs and Snackbar.

## Processing

`svgo` 4.1.0 (MIT), imported only from the documented **`svgo/browser`** entry in a module Worker. `css-tree` 3.2.1 (MIT) parses CSS rather than attempting regex sanitization. Installed SVGO types/plugins and https://svgo.dev/docs/usage/browser/ document the API used here. The main UI does not import the optimization engine and does not submit input to a server.

- Input: one .svg file or raw XML, at most 512 KiB. UTF-8 byte counts drive savings.
- Bounds: 10,000 SVG elements, 64 nested levels, 8 MiB combined exports, 5-second worker deadline. Input edits, option changes and unmount cancel old work; stale results are never exported. No synchronous UI fallback.
- Plugins are explicitly selected; no preset silently overrides an unchecked toggle. Numeric/path/transform precision is 1–5. Responsive mode preserves viewBox or infers it from positive numeric/px dimensions; relative/physical units without a viewBox retain their dimensions with a notice.
- `currentColor` changes solid fill/stroke attributes, declarations and inline styles. It preserves none, transparent, gradient references and CSS variables. Multi-color illustrations can lose visible details, so the option is off by default.

## Passive SVG profile

SVGO is not a sanitizer. An explicit AST pass runs before optimization and again before export. It retains a static SVG element allowlist, removes active content/animation and event/template handlers, and allows href/paint resources only as local fragments. Links become groups. External images, embedded raster data, foreignObject and unsupported elements are removed with a notice. XML entities/internal DTD subsets are rejected; external stylesheet instructions are removed. CSS is parsed with a presentation-property/function allowlist and local-fragment-only URLs. CSS at-rules (including @media and @font-face) are removed. Unknown/editor namespaces are removed. Titles/descriptions and supported local gradients/masks/references survive.

Both Original and Optimized previews use this passive profile. Preview parses only already-clean SVG for its currentColor override, serializes only its root element (without a DTD/prologue) to an isolated image data URL, and **never** inserts SVG nodes/markup into the application DOM or evaluates generated code. Pan/zoom use pointer capture and keyboard controls. Preview color is separate from exported code.

## Exports

SVG plus React JSX/TSX function components with root props, kebab-case/namespace attribute mapping, style objects, escaped literal text, and editable validated component names. React assumes the modern JSX runtime. Inline style duplicates follow cascade order, but React style objects cannot preserve !important priority against host styles. Non-rendering XML prologues are omitted from components. IDs are preserved; repeated component instances with gradients/masks may need unique IDs.

Vue exports a template with `v-pre` so user-provided braces or text cannot become Vue expressions. UTF-8 Data URIs percent-encode CSS-sensitive characters; Base64 uses UTF-8 bytes. The download MIME type and extension follow the selected format. All formats use the same passive optimized SVG.

Tests cover each toggle, numeric precision, responsive inference, currentColor preservation rules, Unicode URI round trips, TypeScript parsing and semantic React typing of generated JSX/TSX, XML and CSS injection, namespaced fragment links, limits and malformed input.
