import type { DocumentSettings } from "./md-to-pdf-types";
import { getPageDimensions, getMarginPadding } from "./md-to-pdf-compiler";
import { paginateDocument, type VerticalSpan } from "./md-to-pdf-layout";

// A separate document keeps export independent of preview zoom, app layout, and theme.
async function createRenderDocument(container: HTMLElement, settings: DocumentSettings) {
  const dimensions = getPageDimensions(settings.pageSize, settings.orientation);
  const margin = (parseFloat(getMarginPadding(settings.margin)) * 72) / 25.4;
  const width = ((dimensions.width - margin * 2) * 4) / 3;
  const frame = document.createElement("iframe");
  frame.title = "PDF rendering document";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:1200px;border:0;`;
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title></title><style>body{margin:0;background:#fff;color:#1a1a1a}*{box-sizing:border-box}pre{white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body></body></html>'
  );
  doc.close();
  doc.title = settings.title || "Document";
  try {
    const clone = container.cloneNode(true) as HTMLElement;
    const originals = [container, ...container.querySelectorAll<HTMLElement>("*")];
    const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
    const properties = [
      "display",
      "flex-direction",
      "align-items",
      "justify-content",
      "gap",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "color",
      "background-color",
      "border-top",
      "border-right",
      "border-bottom",
      "border-left",
      "border-radius",
      "padding",
      "margin",
      "text-align",
      "text-indent",
      "text-decoration",
      "text-transform",
      "letter-spacing",
      "white-space",
      "word-break",
      "overflow-wrap",
      "list-style-type",
      "list-style-position",
      "border-collapse",
      "vertical-align",
      "max-width",
      "width",
      "table-layout",
      "box-sizing",
      "height",
    ];
    originals.forEach((original, i) => {
      const computed = getComputedStyle(original);
      for (const property of properties)
        copies[i].style.setProperty(property, computed.getPropertyValue(property));
      // Reflow at the chosen physical paper width, rather than the preview's scale.
      copies[i].style.height = "auto";
      if (original.tagName === "INPUT")
        (copies[i] as HTMLInputElement).checked = (original as HTMLInputElement).checked;
    });
    clone.style.cssText += `;width:${width}px;max-width:none;min-height:0;height:auto;padding:0;margin:0;transform:none;box-shadow:none;background:#fff;`;
    clone.querySelectorAll("[data-pdf-footer]").forEach((node) => node.remove());
    doc.body.appendChild(clone);
    await doc.fonts.ready;
    await Promise.all(
      Array.from(clone.querySelectorAll("img")).map(async (image) => {
        image.loading = "eager";
        try {
          await image.decode();
        } catch {
          /* Unavailable images retain their alt text. */
        }
      })
    );
    return { frame, doc, clone, dimensions, margin, width };
  } catch (error) {
    frame.remove();
    throw error;
  }
}

function collectBreakSpans(body: HTMLElement, pageHeight: number): VerticalSpan[] {
  const top = body.getBoundingClientRect().top;
  const spans: VerticalSpan[] = [];
  const doc = body.ownerDocument;
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let text;
  while ((text = walker.nextNode())) {
    if (!text.textContent?.trim()) continue;
    const range = doc.createRange();
    range.selectNodeContents(text);
    for (const rect of range.getClientRects())
      spans.push({ top: rect.top - top, bottom: rect.bottom - top });
  }
  body.querySelectorAll("pre, table, tr, img, blockquote, .md-alert").forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.height < pageHeight)
      spans.push({ top: rect.top - top, bottom: rect.bottom - top });
  });
  body.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((node) => {
    const rect = node.getBoundingClientRect();
    const next = node.nextElementSibling?.getBoundingClientRect();
    if (next)
      spans.push({
        top: rect.top - top,
        bottom: Math.min(next.top + 24, next.bottom) - top,
      });
  });
  return spans;
}

function jpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Could not render the PDF page."));
          return;
        }
        try {
          resolve(new Uint8Array(await blob.arrayBuffer()));
        } catch (error) {
          reject(error);
        }
      },
      "image/jpeg",
      0.95
    )
  );
}

export async function exportMarkdownToPdf(
  container: HTMLElement,
  settings: DocumentSettings,
  onProgress?: (message: string, percent: number) => void
): Promise<Uint8Array> {
  const [{ default: html2canvas }, { PDFDocument, StandardFonts, rgb }] =
    await Promise.all([import("html2canvas"), import("pdf-lib")]);
  onProgress?.("Preparing document…", 10);
  const render = await createRenderDocument(container, settings);
  try {
    const { clone, dimensions, margin, width } = render;
    const body = clone.querySelector<HTMLElement>("[data-pdf-body]")!;
    const header = clone.querySelector<HTMLElement>("[data-pdf-header]");
    const pdf = await PDFDocument.create();
    pdf.setTitle(settings.title || "Document");
    pdf.setCreator("Ramupod Markdown to PDF");
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const options = {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: Math.ceil(width),
      scrollX: 0,
      scrollY: 0,
    };
    const headerCanvas = header ? await html2canvas(header, options) : null;
    const headerImage = headerCanvas
      ? await pdf.embedJpg(await jpegBytes(headerCanvas))
      : null;
    const headerHeight = headerCanvas
      ? (headerCanvas.height / headerCanvas.width) * (dimensions.width - margin * 2)
      : 0;
    const headerSpace = headerImage ? headerHeight + 12 : 0;
    const footerSpace = settings.showPageNumbers ? 22 : 0;
    const availableHeight =
      ((dimensions.height - margin * 2 - headerSpace - footerSpace) * 4) / 3;
    const height = Math.ceil(body.getBoundingClientRect().height);
    const pages = paginateDocument(
      height,
      availableHeight,
      collectBreakSpans(body, availableHeight)
    );
    for (const [i, slice] of pages.entries()) {
      onProgress?.(
        `Rendering page ${i + 1} of ${pages.length}…`,
        20 + Math.round((i / pages.length) * 70)
      );
      const canvas = await html2canvas(body, {
        ...options,
        y: slice.start,
        width,
        height: slice.end - slice.start,
      });
      const image = await pdf.embedJpg(await jpegBytes(canvas));
      const page = pdf.addPage([dimensions.width, dimensions.height]);
      const contentWidth = dimensions.width - margin * 2;
      const imageHeight = (image.height / image.width) * contentWidth;
      page.drawImage(image, {
        x: margin,
        y: dimensions.height - margin - headerSpace - imageHeight,
        width: contentWidth,
        height: imageHeight,
      });
      if (headerImage)
        page.drawImage(headerImage, {
          x: margin,
          y: dimensions.height - margin - headerHeight,
          width: contentWidth,
          height: headerHeight,
        });
      if (settings.showPageNumbers) {
        const label = `Page ${i + 1} of ${pages.length}`;
        page.drawText(label, {
          x: dimensions.width - margin - font.widthOfTextAtSize(label, 9),
          y: margin,
          font,
          size: 9,
          color: rgb(0.4, 0.43, 0.47),
        });
      }
      canvas.width = canvas.height = 0;
    }
    onProgress?.("Saving PDF…", 98);
    return await pdf.save();
  } finally {
    render.frame.remove();
  }
}

export async function printMarkdownDocument(
  container: HTMLElement,
  settings: DocumentSettings
) {
  const render = await createRenderDocument(container, settings);
  const { doc, frame, dimensions } = render;
  const style = doc.createElement("style");
  style.textContent = `@page{size:${dimensions.width}pt ${dimensions.height}pt;margin:${getMarginPadding(settings.margin)}}body{margin:0}body>div{width:100%!important}h1,h2,h3,h4,h5,h6{break-after:avoid}pre,tr,img,blockquote,.md-alert{break-inside:avoid}p,li{orphans:3;widows:3}thead{display:table-header-group}`;
  doc.head.appendChild(style);
  const cleanup = () => frame.remove();
  frame.contentWindow!.addEventListener("afterprint", cleanup, { once: true });
  // A fallback also covers browsers that do not dispatch afterprint for a child frame.
  setTimeout(cleanup, 300_000);
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
}

export function downloadPdfBuffer(buffer: Uint8Array, fileName: string) {
  const blob = new Blob([buffer as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
