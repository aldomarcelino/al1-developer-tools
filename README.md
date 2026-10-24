# Al1 Developer Tools

A responsive developer toolkit built with Next.js App Router, TypeScript, and Tailwind CSS.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Check with `npm test`, `npm run typecheck`, and `npm run build`.

## Review milestones

1. **Implemented:** global tokens, light and dark themes, responsive navigation, searchable tool catalog, and JSON Formatter (format, minify, validate, upload up to 2 MB, copy, download, indentation, keyboard shortcut). JSON runs locally in the browser; editor data is not persisted. Theme preference is stored locally.
2. **Planned:** Markdown Editor, Diff Viewer, JWT Decoder, Base64/URL, Regex Tester, Timestamp Converter, UUID Generator, JSON to TypeScript.
3. **Planned:** backend-powered Webhook Inspector with endpoint management, request history, inspection, and controlled replay. The current page is explicitly a roadmap placeholder and receives no requests.

Phase 1 pauses for visual feedback before expanding. All future tool routes honestly display their planned status.

## Design system

Reference-inspired light gray `#F7F8FA`, white surfaces, dark azure primary `#0E363C`, and lime `#E1FFC1`. Locally bundled Manrope for UI and JetBrains Mono for code. Header navigation replaces the sidebar, with a responsive tool menu on desktop and mobile. Pill buttons, rounded cards, and azure content sections share CSS variables in `app/globals.css`; both light and dark themes are supported.

## JSON behavior

Uses native `JSON.parse` / `JSON.stringify`: duplicate object keys resolve to the last value and numbers follow JavaScript precision limits. Encode large integer IDs as strings. Cmd/Ctrl + Enter formats JSON; Cmd/Ctrl + K focuses homepage search. Mobile uses input/output tabs; desktop displays split panes.
