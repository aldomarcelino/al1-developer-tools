# Viewer alignment with the current extension

Preserve the user's reusable Accordion integration and CaptureGuide install/record/review layout. Update the result view to prioritize request flags carried from the extension, offer All / HTTP errors / Marked review filters, and keep detailed reports optional. Add compact screenshot previews with a local full-size dialog, explicit review and download, clearer source/session/privacy context, and a useful empty state. All image/request data remains local; no imported target URL is fetched. Use existing ActionButton, SegmentedTabs, Accordion, Snackbar, app tokens and CSS Modules. Maintain responsive light/dark and keyboard interaction.

Verification: synthetic + actual local extension packages, flagged HTTP 200 alongside HTTP errors, flag persistence through export/import, screenshot dialog/download/review/Escape/focus, copy Snackbar, guide and empty/error states, long-content mobile/dark overflow, no target requests/browser errors, repository code checks and production builds.

## Completed

- Preserved the user's shared Accordion component, CaptureGuide structure, responsive guide styles and optional technical/report disclosures. Guide copy now matches request flags, card dragging and Pause/Resume.
- Loaded capture overview shows source/title/URL/time, four evidence counts and clear download/report actions. Sample and clear actions no longer clutter the initial empty state or duplicate an already loaded sample.
- Marked / HTTP errors / All tabs prioritize extension-selected request IDs, including marked HTTP 200 requests when other requests fail. Flags toggle in the overview and share state with inspector checkboxes; copy stays an icon-only ActionButton with tooltip/Snackbar. Response previews remain inert text, bounded to 2,000 characters with an explicit limit notice.
- Compact screenshot gallery opens a centered native dialog with keyboard focus/escape/backdrop dismissal, an explicit visual-review checkbox and local PNG download. Unreviewed images are excluded from capture downloads. Review changes do not close the dialog; no image URL is sent through remote optimization.
- Capture download does not require a long report; the report disclosure remains optional. File imports preserve source bytes on disk, and malformed imports keep the currently open evidence with an error.

## Verification

- `npm test`: **234 passed**, zero failures/skips; typecheck, full lint, targeted formatting and `git diff --check` passed.
- Next.js and Cloudflare production builds passed (existing upstream Cloudflare warnings remain).
- Both production runtimes passed security/CSP checks and the 36-page SEO smoke test.
- `npm run test:qa-viewer` ran on both production runtimes: safe sample, flagged HTTP 200 alongside errors, summary filters, flags and downloaded package references, cURL/Snackbar, screenshot preview/review/download, native dialog center, Escape/focus restore, optional inspector/report, invalid JSON retaining source, desktop and 390px mobile/dark with 8,000-character URLs / long bodies and no page overflow. No imported target URL requests or browser console/page errors.
- Actual temporary Chrome extension flow (`test:qa-ui`) passed again through request selection, screenshot capture, Finish and local handoff to the updated overview; session references and attachments remained consistent.
- An initial screenshot test changed hidden-input caret styles before React hydration, producing a test-induced warning. Screenshots now use `caret: initial`; the application does not suppress that warning. Dark screenshots wait for the actual theme state. Final browser checks are clean.

Screenshots: `artifacts/qa-viewer-refresh/empty-desktop.png`, `sample-desktop.png`, `capture-desktop.png`, `screenshot-preview.png`, `capture-mobile-dark.png`, `preview-mobile-dark.png`, and `empty-mobile-dark.png`. All inputs are synthetic local fixture evidence. No deployment was performed.
