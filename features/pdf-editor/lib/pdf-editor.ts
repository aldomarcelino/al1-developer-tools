import { PDFDocument, rgb, degrees, StandardFonts, type PDFFont } from "pdf-lib";

export type AnnotationType =
  "text" | "whiteout" | "highlight" | "rectangle" | "circle" | "draw" | "image";

export type EditorToolMode =
  | "hand"
  | "select"
  | "text"
  | "whiteout"
  | "highlight"
  | "rectangle"
  | "circle"
  | "draw"
  | "image";

export interface PdfAnnotation {
  id: string;
  pageIndex: number;
  type: AnnotationType;
  /** Normalized X position (0 to 100%) */
  xPct: number;
  /** Normalized Y position (0 to 100%) */
  yPct: number;
  /** Normalized width (0 to 100%) */
  widthPct: number;
  /** Normalized height (0 to 100%) */
  heightPct: number;
  text?: string;
  fontSize?: number;
  fontFamily?: PdfFontFamily;
  color?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  imageDataUrl?: string;
}

export interface PageInfo {
  pageIndex: number;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export function resizeAnnotation(
  annotation: PdfAnnotation,
  corner: ResizeCorner,
  dx: number,
  dy: number,
  minWidth: number,
  minHeight: number
): PdfAnnotation {
  const west = corner.endsWith("w");
  const north = corner.startsWith("n");
  const { xPct: x, yPct: y, widthPct: width, heightPct: height } = annotation;
  if (width <= 0 || height <= 0) return annotation;
  const maxWidth = west ? x + width : 100 - x;
  const maxHeight = north ? y + height : 100 - y;
  const widthDelta = west ? -dx : dx;
  const heightDelta = north ? -dy : dy;
  let nextWidth: number;
  let nextHeight: number;
  let fontSize = annotation.fontSize;
  if (["text", "image", "draw"].includes(annotation.type)) {
    const delta =
      Math.abs(widthDelta / width) >= Math.abs(heightDelta / height)
        ? widthDelta / width
        : heightDelta / height;
    let maxFactor = Math.min(maxWidth / width, maxHeight / height);
    let minFactor = Math.max(minWidth / width, minHeight / height);
    if (annotation.type === "text") {
      const size = annotation.fontSize || 12;
      maxFactor = Math.min(maxFactor, 144 / size);
      minFactor = Math.max(minFactor, 6 / size);
    }
    const factor = Math.max(
      Math.min(minFactor, maxFactor),
      Math.min(1 + delta, maxFactor)
    );
    nextWidth = width * factor;
    nextHeight = height * factor;
    if (annotation.type === "text") fontSize = (annotation.fontSize || 12) * factor;
  } else {
    nextWidth = Math.min(maxWidth, Math.max(minWidth, width + widthDelta));
    nextHeight = Math.min(maxHeight, Math.max(minHeight, height + heightDelta));
  }
  return {
    ...annotation,
    xPct: west ? x + width - nextWidth : x,
    yPct: north ? y + height - nextHeight : y,
    widthPct: nextWidth,
    heightPct: nextHeight,
    fontSize,
  };
}

export interface ExportPdfOptions {
  annotations: PdfAnnotation[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
}

export const FONT_OPTIONS = [
  {
    value: "Helvetica",
    label: "Helvetica",
    family: "Arial, Helvetica, sans-serif",
    weight: 400,
    style: "normal",
  },
  {
    value: "HelveticaBold",
    label: "Helvetica Bold",
    family: "Arial, Helvetica, sans-serif",
    weight: 700,
    style: "normal",
  },
  {
    value: "HelveticaOblique",
    label: "Helvetica Italic",
    family: "Arial, Helvetica, sans-serif",
    weight: 400,
    style: "italic",
  },
  {
    value: "HelveticaBoldOblique",
    label: "Helvetica Bold Italic",
    family: "Arial, Helvetica, sans-serif",
    weight: 700,
    style: "italic",
  },
  {
    value: "TimesRoman",
    label: "Times New Roman",
    family: '"Times New Roman", Times, serif',
    weight: 400,
    style: "normal",
  },
  {
    value: "TimesRomanBold",
    label: "Times New Roman Bold",
    family: '"Times New Roman", Times, serif',
    weight: 700,
    style: "normal",
  },
  {
    value: "TimesRomanItalic",
    label: "Times New Roman Italic",
    family: '"Times New Roman", Times, serif',
    weight: 400,
    style: "italic",
  },
  {
    value: "TimesRomanBoldItalic",
    label: "Times New Roman Bold Italic",
    family: '"Times New Roman", Times, serif',
    weight: 700,
    style: "italic",
  },
  {
    value: "Courier",
    label: "Courier",
    family: '"Courier New", Courier, monospace',
    weight: 400,
    style: "normal",
  },
  {
    value: "CourierBold",
    label: "Courier Bold",
    family: '"Courier New", Courier, monospace',
    weight: 700,
    style: "normal",
  },
  {
    value: "CourierOblique",
    label: "Courier Italic",
    family: '"Courier New", Courier, monospace',
    weight: 400,
    style: "italic",
  },
  {
    value: "CourierBoldOblique",
    label: "Courier Bold Italic",
    family: '"Courier New", Courier, monospace',
    weight: 700,
    style: "italic",
  },
] as const;

export type PdfFontFamily = (typeof FONT_OPTIONS)[number]["value"];

export function textFontStyle(family: PdfFontFamily = "Helvetica") {
  const option = FONT_OPTIONS.find((font) => font.value === family) ?? FONT_OPTIONS[0];
  return {
    fontFamily: option.family,
    fontWeight: option.weight,
    fontStyle: option.style,
  };
}

export const HIGHLIGHT_COLORS = [
  { value: "#fde047", label: "Yellow" },
  { value: "#86efac", label: "Green" },
  { value: "#93c5fd", label: "Blue" },
  { value: "#f472b6", label: "Pink" },
  { value: "#fdba74", label: "Orange" },
] as const;

export const TEXT_COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#1e293b", label: "Slate" },
  { value: "#dc2626", label: "Red" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#ffffff", label: "White" },
] as const;

/**
 * Converts a hex color string (#RRGGBB or #RGB) into 0-1 RGB fractions for pdf-lib.
 */
export function hexToRgbFraction(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

/**
 * Converts normalized percentage coordinates to PDF page points (bottom-left origin).
 */
export function percentToPdfCoords(
  xPct: number,
  yPct: number,
  widthPct: number,
  heightPct: number,
  pageWidth: number,
  pageHeight: number
) {
  const x = (xPct / 100) * pageWidth;
  const width = (widthPct / 100) * pageWidth;
  const height = (heightPct / 100) * pageHeight;
  // Screen Y is measured from top-left, PDF Y is measured from bottom-left
  const y = pageHeight - ((yPct + heightPct) / 100) * pageHeight;
  return { x, y, width, height };
}

/**
 * Converts screen pixel coordinates within the page canvas to normalized percentages.
 */
export function screenToPercent(
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { xPct: 0, yPct: 0, widthPct: 0, heightPct: 0 };
  }
  return {
    xPct: Math.max(0, Math.min(100, (screenX / viewportWidth) * 100)),
    yPct: Math.max(0, Math.min(100, (screenY / viewportHeight) * 100)),
    widthPct: Math.max(0, Math.min(100, (screenWidth / viewportWidth) * 100)),
    heightPct: Math.max(0, Math.min(100, (screenHeight / viewportHeight) * 100)),
  };
}

/**
 * Decodes base64 data URL into a Uint8Array byte buffer.
 */
export function dataUrlToBytes(dataUrl: string): {
  bytes: Uint8Array;
  format: "png" | "jpeg";
} {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Invalid image data URL");
  }
  const isJpeg =
    dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg");
  const base64 = parts[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { bytes, format: isJpeg ? "jpeg" : "png" };
}

export function sanitizeBaseFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, "");
  const clean = withoutExt
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^\.+|\.+$/g, "");
  return clean || "edited-document";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Dynamically loads pdfjs-dist on client side and configures the local worker.
 */
export async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");

  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const origin = window.location.origin;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "/pdf.worker.min.mjs",
      origin
    ).toString();
  }

  return pdfjs;
}

/**
 * Exports edited PDF by applying annotations, rotations, and removals to original PDF bytes.
 */
export async function exportEditedPdf(
  originalPdfBytes: Uint8Array,
  options: ExportPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });

  const fonts = new Map<PdfFontFamily, PDFFont>();

  // Group annotations by pageIndex
  const annotationsByPage = new Map<number, PdfAnnotation[]>();
  for (const ann of options.annotations) {
    const list = annotationsByPage.get(ann.pageIndex) ?? [];
    list.push(ann);
    annotationsByPage.set(ann.pageIndex, list);
  }

  const pages = pdfDoc.getPages();

  // 2. Apply modifications to each original page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Apply rotation delta if set
    const additionalRotation = options.pageRotations[i] || 0;
    if (additionalRotation !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + additionalRotation) % 360));
    }

    // Apply annotations for this page
    const pageAnnotations = annotationsByPage.get(i) || [];
    for (const ann of pageAnnotations) {
      const { x, y, width, height } = percentToPdfCoords(
        ann.xPct,
        ann.yPct,
        ann.widthPct,
        ann.heightPct,
        pageWidth,
        pageHeight
      );

      switch (ann.type) {
        case "whiteout": {
          page.drawRectangle({
            x,
            y,
            width,
            height,
            color: rgb(1, 1, 1),
          });
          break;
        }

        case "highlight": {
          const colorFrac = hexToRgbFraction(ann.color || "#fde047");
          page.drawRectangle({
            x,
            y,
            width,
            height,
            color: rgb(colorFrac.r, colorFrac.g, colorFrac.b),
            opacity: ann.opacity ?? 0.35,
          });
          break;
        }

        case "text": {
          if (!ann.text) break;
          const family = ann.fontFamily || "Helvetica";
          let font = fonts.get(family);
          if (!font) {
            font = await pdfDoc.embedFont(StandardFonts[family]);
            fonts.set(family, font);
          }
          const fontSize = ann.fontSize || 12;
          const colorFrac = hexToRgbFraction(ann.color || "#000000");

          // For text, PDF baseline is near bottom of text box
          const lines = ann.text.split("\n");
          const lineHeight = fontSize * 1.25;

          // Draw each line from top down
          lines.forEach((line, index) => {
            const lineY =
              pageHeight - (ann.yPct / 100) * pageHeight - (index + 0.82) * lineHeight;
            page.drawText(line, {
              x,
              y: lineY,
              size: fontSize,
              font,
              color: rgb(colorFrac.r, colorFrac.g, colorFrac.b),
            });
          });
          break;
        }

        case "rectangle": {
          const strokeFrac = hexToRgbFraction(ann.strokeColor || "#2563eb");
          const fillFrac =
            ann.fillColor && ann.fillColor !== "transparent"
              ? hexToRgbFraction(ann.fillColor)
              : null;

          page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: rgb(strokeFrac.r, strokeFrac.g, strokeFrac.b),
            borderWidth: ann.strokeWidth ?? 2,
            color: fillFrac ? rgb(fillFrac.r, fillFrac.g, fillFrac.b) : undefined,
          });
          break;
        }

        case "circle": {
          const strokeFrac = hexToRgbFraction(ann.strokeColor || "#2563eb");
          const fillFrac =
            ann.fillColor && ann.fillColor !== "transparent"
              ? hexToRgbFraction(ann.fillColor)
              : null;

          page.drawEllipse({
            x: x + width / 2,
            y: y + height / 2,
            xScale: width / 2,
            yScale: height / 2,
            borderColor: rgb(strokeFrac.r, strokeFrac.g, strokeFrac.b),
            borderWidth: ann.strokeWidth ?? 2,
            color: fillFrac ? rgb(fillFrac.r, fillFrac.g, fillFrac.b) : undefined,
          });
          break;
        }

        case "draw":
        case "image": {
          if (!ann.imageDataUrl) break;
          try {
            const { bytes, format } = dataUrlToBytes(ann.imageDataUrl);
            const embeddedImage =
              format === "jpeg"
                ? await pdfDoc.embedJpg(bytes)
                : await pdfDoc.embedPng(bytes);

            page.drawImage(embeddedImage, {
              x,
              y,
              width,
              height,
            });
          } catch {
            // Silently continue if image data corrupted
          }
          break;
        }
      }
    }
  }

  // 3. Remove deleted pages in descending order so indices remain stable
  if (options.deletedPages && options.deletedPages.length > 0) {
    const sortedDescending = [...new Set(options.deletedPages)].sort((a, b) => b - a);
    for (const pageIdx of sortedDescending) {
      if (pageIdx >= 0 && pageIdx < pdfDoc.getPageCount()) {
        pdfDoc.removePage(pageIdx);
      }
    }
  }

  return await pdfDoc.save();
}
