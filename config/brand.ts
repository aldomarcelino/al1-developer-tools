/** Single design source for the inline mark, favicons, and generated brand assets. */
export const brand = {
  name: "Ramupod",
  wordmark: "ramupod",
  tagline: "Useful tools. Less effort.",
  description: "Thoughtful online tools for documents, text, data, and everyday tasks.",
} as const;

// Two folded pod halves carve a lowercase r from the background.
// The paired seams are parallel (slope -0.5), with a constant 2.5-unit gap.
// Artwork bounds: x=6..34, y=4..36; a compact 7:8 silhouette.
export const brandMark = {
  viewBox: "0 0 40 40",
  standaloneViewBox: "4 4 32 32",
  forest: "#103E3B",
  cream: "#F5F9EF",
  lime: "#C5F86B",
  radius: 12,
  // Fills only the pod silhouette so the r and seams can use forest ink
  // without adding an enclosing tile.
  silhouettePath: "M6 4H21C28.18 4 34 9.82 34 17V36H19C11.82 36 6 30.18 6 23V4Z",
  bodyPath:
    "M6 4H21C28.18 4 34 9.82 34 17V20L25.5 24.25V11.5C22.85 11.15 20.7 12.6 19.5 14.75V11.5H14.5V15.75L6 20V4Z",
  accentPath:
    "M6 22.5L14.5 18.25V28H20V20.5C20 17.5 22.45 16 25.5 16.5V26.75L34 22.5V36H19C11.82 36 6 30.18 6 23V22.5Z",
} as const;

export function brandMarkSvg(monochrome = false, tile = true): string {
  const mark = brandMark;
  const boxed = tile && !monochrome;
  const ink = monochrome ? "currentColor" : boxed ? mark.cream : mark.forest;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="${boxed ? mark.viewBox : mark.standaloneViewBox}" fill="none">${
    boxed
      ? `<rect width="40" height="40" rx="${mark.radius}" fill="${mark.forest}"/>`
      : ""
  }<path d="${mark.bodyPath}" fill="${ink}" fill-rule="evenodd"/><path d="${mark.accentPath}" fill="${monochrome ? "currentColor" : mark.lime}"/></svg>`;
}
