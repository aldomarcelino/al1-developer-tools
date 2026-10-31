# Shared DropArea

`components/ui/drop-area.tsx` owns file picking, resetting the file input,
file drag highlighting, nested drag-enter/leave tracking, and intake disabled/loading
states. File validation, limits, conversion and error feedback stay in each feature.
It uses Ramupod's ActionButton and existing color/font tokens; no new dependencies.

## Variants

| Variant   | Layout                                                        | Current tools                                     |
| --------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `inline`  | Horizontal icon, text and action group; wraps on mobile       | HEIC converter, image resizer                     |
| `stacked` | Large centered empty state with optional icon and footer hint | Image compressor, Image to PDF, PDF Merge & Split |
| `compact` | Smaller horizontal upload bar                                 | SVG optimizer                                     |

```tsx
<DropArea
  variant="inline"
  label="Add images"
  title="Drop images here"
  description="PNG or JPG · Up to 10 MB each"
  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
  multiple
  buttonLabel="Choose images"
  disabled={exporting}
  loading={reading}
  onFiles={addFiles}
  actions={<ActionButton onClick={loadSample}>Try sample</ActionButton>}
/>
```

Use `icon`, `buttonIcon`, `buttonVariant`, `hint`, and `className` to adjust the
content and spacing. `label` names the region; `inputLabel` can give the file
picker a distinct accessible label. Visible picker buttons are keyboard accessible,
and refer to the descriptive text/hint. Clicking the surface opens the same input
without nesting buttons or triggering secondary actions.

`inputRef` lets an external Add more action open the same picker. `hidden` keeps
the component and its input mounted while hiding its empty-state UI. This is used
by the compressor after images are added. The external picker remains usable.

`multiple={false}` limits file picker selection, but **all dropped files** still
reach `onFiles`. Single-file tools can show their own error for a multi-file drop.
The shared area intentionally does not trust the `accept` hint or validate files.

Drop events stop propagation so a page-level drop handler does not add the same
files twice. Drag depth prevents highlight flicker when moving over child content.
Disabled/loading areas reject drops and disable the input/picker; secondary actions
remain controlled by their caller. Selecting the same file again works because the
input is reset before invoking `onFiles`.
