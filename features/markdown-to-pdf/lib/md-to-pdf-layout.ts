export interface VerticalSpan {
  top: number;
  bottom: number;
}

/** Prefer line and block boundaries; oversized blocks can continue on the next page. */
export function paginateDocument(
  height: number,
  pageHeight: number,
  spans: VerticalSpan[] = []
) {
  if (
    !Number.isFinite(height) ||
    height < 0 ||
    !Number.isFinite(pageHeight) ||
    pageHeight <= 0
  ) {
    throw new Error("Invalid document dimensions.");
  }
  const pages: { start: number; end: number }[] = [];
  let start = 0;
  while (start < height) {
    const limit = Math.min(height, start + pageHeight);
    let end = limit;
    if (end < height) {
      let previous;
      do {
        previous = end;
        for (const span of spans) {
          if (span.top > start + 1 && span.top < end && span.bottom > end) end = span.top;
        }
      } while (end !== previous);
    }
    if (end <= start + 1) end = limit;
    pages.push({ start, end });
    start = end;
  }
  return pages.length ? pages : [{ start: 0, end: 1 }];
}
