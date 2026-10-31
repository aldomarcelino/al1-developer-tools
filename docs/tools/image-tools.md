# Local image conversion and editing

## Routes and registration

- `/tools/heic-to-jpg`: HEIC to JPG / PNG Converter.
- `/tools/image-resizer`: Image Resizer & Cropper.

Both use the existing ToolHeader, ActionButton, CustomSelect, toolkit styles,
ToolStructuredData, toolMetadata, ToolContext, and browser download helper.
The tool registry supplies discovery, search, related tools, and sitemap entries.
No server processing, API route, remote conversion service, or deployment was added.

## Implementation files

- `features/heic-converter/components/heic-workspace.tsx`: multi-file drop/picker,
  sequential queue, statuses, settings, individual downloads and ZIP results.
- `features/heic-converter/lib/{validation,convert,decode-worker}.ts`: header and
  size checks, cancellable worker decoding, canvas encoding and timeout.
- `features/heic-converter/lib/validation.test.ts`: invalid files and HEIF brands.
- `features/heic-converter/styles.module.css`: feature-local styles.
- `features/image-resizer/components/{resizer-workspace,image-editor}.tsx`:
  upload, interactive crop, keyboard handles, display zoom, presets, custom ratios,
  linked/independent dimensions, generated preview and actual encoded file size.
- `features/image-resizer/lib/{geometry,export-image}.ts`: bounded crop geometry,
  output dimension calculations, canvas crop/resize/encoding.
- `features/image-resizer/lib/geometry.test.ts`: ratio presets, crop bounds,
  dimension budgets, filename collisions and raster signature validation.
- `features/image-resizer/styles.module.css`: feature-local responsive editor.
- `lib/browser/image-codec.ts`: shared validation, filenames, image decoding and
  strict output MIME verification for these two tools.
- `app/tools/heic-to-jpg/page.tsx` and `app/tools/image-resizer/page.tsx`: routes.
- `config/tools.json`, `config/tools.ts`, `components/cummon/tool-icons.ts`, and
  `lib/seo/tool-metadata.ts`: two small registry/icon/SEO additions.
- `package.json` and `package-lock.json`: the two dependencies below.

## Dependencies

- `heic-to` 1.6.7, LGPL-3.0: maintained libheif-based HEIC decoder. The `heic-to/csp`
  entry point avoids unsafe eval. It is dynamically loaded inside a dedicated
  worker and runs its decoder in a child worker. Terminating the owning worker
  after success, error, cancellation, timeout, or unmount releases that decoder
  context. Source and license: <https://github.com/hoppergee/heic-to>.
- `react-image-crop` 11.1.2, ISC: touch and keyboard-accessible free/fixed-ratio
  selection. Loaded only when an image is present. Source and license:
  <https://github.com/dominictobias/react-image-crop>.
- ZIP generation reuses `lib/browser/zip.ts`; no ZIP dependency was added.

## Limits and browser behavior

HEIC: 20 files, 20 MiB per file, 100 MiB input total, 40 MP / 12,000 px per decoded
image, 150 MiB results total, and 90 seconds per file. Jobs run sequentially.
The decoder supplies no reliable progress percentage; the UI reports per-file
status and completed batch count. Only the primary still image is exported.
Metadata, depth maps, HDR data and Live Photo motion are not retained. A damaged
or unsupported HEIF codec produces a per-file error. Pixel checks happen after
HEIC decoding, so decoding itself can still consume substantial memory.

Resizer: JPG/PNG/WebP only, 30 MiB / 40 MP input, 16 MP output and 8,192 px per
output side. Crop coordinates refer to original pixels, independent of display
zoom. Unlocked dimensions intentionally stretch the selected crop. PNG ignores
quality; JPG composites transparency over white. Output MIME must match the
requested encoder. Metadata and animation are not preserved. Rotation was not
included. Photo ratios are not print-size or identity-photo guarantees; print
DPI must be configured in print software.

Modern browsers with Canvas, image.decode, workers and ImageBitmap are required.
WebP export availability depends on the browser encoder. Large files can still
exceed device memory limits, especially on mobile. Actual mobile hardware,
Safari and Firefox remain follow-up compatibility checks; responsive desktop
browser viewports were tested at 390 px and 768 px.

## Validation

Commands:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Browser checks used the local application and synthetic fixtures, plus the
libheif project's public sample:
<https://github.com/strukturag/libheif/blob/master/examples/example.heic>.
Artifacts and fixtures live in the ignored `artifacts/image-tools/` directory.

Verified:

- Real HEIC to JPG, real HEIC to PNG, individual download.
- Mixed batch: duplicate HEIC names, invalid header, unsupported extension and
  corrupt HEIC payload. Successful results remain available after other errors.
- ZIP with two PNG entries, unique filenames, correct signatures and valid CRCs.
- Stop conversion, restart, remove individual file and clear queue.
- PNG/JPG/WebP inputs; every ratio preset, custom ratio, locked width calculation,
  independent dimensions, keyboard handle adjustment, reset and editor zoom.
- JPG/PNG/WebP encoding and download; file headers and 320 x 160 dimensions checked.
  Four-color fixture samples matched the selected crop after encoding.
- A 20 MP source defaults to a bounded 4472 x 3577 output and exports successfully;
  42.25 MP input is rejected. Out-of-range dimensions and renamed SVG input fail
  with helpful messages while preserving the previous valid image.
- Generated result is invalidated when settings/source change. Source/result URLs
  are revoked on replacement/removal/unmount; download URLs expire after download.
- Local production preview verifies HEIC workers under the production CSP.

No unrelated tool code, global styles, security policies or deployment settings
were intentionally changed. Screen Recorder changes belong to concurrent work.
Next.js may regenerate `next-env.d.ts` during local dev/build.

Final check results: TypeScript passed, ESLint passed with no warnings, all 248
repository tests passed (including eight new image-tool tests), formatting and
`git diff --check` passed, and the production build passed. The build emits the
existing Edge Runtime deprecation/static-generation warning from another route.
Read-only HTTP checks confirmed 200 responses, descriptive metadata, JSON-LD,
privacy notices and production CSP without unsafe-eval for both new routes.
Validation used the supplied Node 25.6.0 environment; the project declares Node
24.22.x or later within major version 24. Recheck on that supported runtime in CI.
