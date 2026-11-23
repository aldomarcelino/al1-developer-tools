import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  ImageRun,
  AlignmentType,
} from "docx";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { deflateSync } from "fflate";

export type WordOutputFormat = "docx" | "doc";
export type LayoutMode = "flow" | "exact";

export interface PdfToWordOptions {
  format: WordOutputFormat;
  layout: LayoutMode;
  includeImages?: boolean;
}

export interface ExtractedTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  fontFamily?: string;
}

export interface ExtractedParagraph {
  runs: ExtractedTextRun[];
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3;
  text: string;
  pageNumber: number;
  y?: number;
}

export interface ExtractedImage {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  topY: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  data: Uint8Array;
  dataUrl?: string;
  format: "png" | "jpeg";
}

export type PageElement =
  | { type: "paragraph"; paragraph: ExtractedParagraph; y: number }
  | { type: "image"; image: ExtractedImage; y: number };

export interface ExtractedPage {
  pageNumber: number;
  paragraphs: ExtractedParagraph[];
  images?: ExtractedImage[];
  elements?: PageElement[];
  text: string;
}

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  totalParagraphs: number;
  totalWords: number;
  totalCharacters: number;
  totalImages?: number;
}

export interface ConversionProgress {
  status: "idle" | "parsing" | "converting" | "done" | "error";
  message: string;
  percent: number;
  current: number;
  total: number;
}

export const PDF_WORD_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  maxPages: 100,
  defaultFormat: "docx" as WordOutputFormat,
  defaultLayout: "flow" as LayoutMode,
  defaultIncludeImages: true,
};

export const FORMAT_OPTIONS = [
  { value: "docx", label: "DOCX (Modern Word, Recommended)" },
  { value: "doc", label: "DOC (Word 97-2004 Document)" },
] as const;

export const LAYOUT_OPTIONS = [
  { value: "flow", label: "Flow Paragraphs (Continuous, Easy to Edit)" },
  { value: "exact", label: "Exact Line Breaks (Preserve Visual Lines)" },
] as const;

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
 * Validates selected PDF file format and size limits.
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  const isPdfExtension = /\.pdf$/i.test(file.name);
  const isPdfMime = file.type === "application/pdf" || file.type === "";

  if (!isPdfExtension && !isPdfMime) {
    return {
      valid: false,
      error: "Please select a valid PDF file (.pdf).",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "The selected file is empty. Please choose a valid PDF.",
    };
  }

  if (file.size > PDF_WORD_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds the 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Formats bytes into a readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Cleans the base name and appends the selected Word extension (.docx or .doc).
 */
export function sanitizeWordFilename(
  originalName: string,
  format: WordOutputFormat
): string {
  const stripped = originalName.replace(/\.pdf$/i, "").trim();
  const safeName = stripped.replace(/[^a-zA-Z0-9_\-. ]/g, "_") || "converted_document";
  return `${safeName}.${format}`;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});

function calculateCrc32(buf: Uint8Array, offset: number, length: number): number {
  let crc = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, len, false);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crc = calculateCrc32(chunk, 4, 4 + len);
  view.setUint32(8 + len, crc, false);
  return chunk;
}

/**
 * Encodes raw RGBA pixel bytes into a valid PNG Uint8Array.
 * Zero external canvas dependencies: works seamlessly in Node and browser.
 */
export function encodeRgbaToPng(
  width: number,
  height: number,
  rgba: Uint8Array | Uint8ClampedArray
): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter 0
  ihdr[12] = 0; // No interlace

  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const compressed = deflateSync(raw);
  const ihdrChunk = makePngChunk("IHDR", ihdr);
  const idatChunk = makePngChunk("IDAT", compressed);
  const iendChunk = makePngChunk("IEND", new Uint8Array(0));

  const totalLen = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLen);
  let pos = 0;
  png.set(sig, pos);
  pos += sig.length;
  png.set(ihdrChunk, pos);
  pos += ihdrChunk.length;
  png.set(idatChunk, pos);
  pos += idatChunk.length;
  png.set(iendChunk, pos);
  pos += iendChunk.length;
  return png;
}

/**
 * Converts image bytes into a data URL for UI rendering.
 */
export function bytesToDataUrl(bytes: Uint8Array, mimeType = "image/png"): string {
  if (typeof Buffer !== "undefined") {
    return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

interface RawLine {
  y: number;
  items: RawTextItem[];
  avgFontSize: number;
}

/**
 * Detects if a font is bold based on font name string.
 */
export function isFontBold(fontName: string): boolean {
  return /bold|black|heavy|semibold|demibold/i.test(fontName);
}

/**
 * Detects if a font is italic based on font name string.
 */
export function isFontItalic(fontName: string): boolean {
  return /italic|oblique|slanted/i.test(fontName);
}

/**
 * Reconstructs raw text items into organized lines and paragraphs.
 */
export function processPageTextItems(
  items: RawTextItem[],
  pageNumber: number,
  layoutMode: LayoutMode
): ExtractedParagraph[] {
  if (!items.length) return [];

  // Group items into lines based on Y coordinate proximity (tolerance: 3.5pt)
  const sortedItems = items.toSorted((a, b) => {
    const yDiff = b.y - a.y; // Y descending (PDF coordinates origin is bottom-left)
    if (Math.abs(yDiff) > 3.5) return yDiff;
    return a.x - b.x; // X ascending
  });

  const lines: RawLine[] = [];
  let currentLine: RawTextItem[] = [];
  let currentY = sortedItems[0].y;

  for (const item of sortedItems) {
    if (!currentLine.length) {
      currentLine.push(item);
      currentY = item.y;
    } else if (Math.abs(item.y - currentY) <= 3.5) {
      currentLine.push(item);
    } else {
      currentLine.sort((a, b) => a.x - b.x);
      const totalSize = currentLine.reduce((sum, it) => sum + it.fontSize, 0);
      lines.push({
        y: currentY,
        items: currentLine,
        avgFontSize: totalSize / currentLine.length,
      });
      currentLine = [item];
      currentY = item.y;
    }
  }

  if (currentLine.length) {
    currentLine.sort((a, b) => a.x - b.x);
    const totalSize = currentLine.reduce((sum, it) => sum + it.fontSize, 0);
    lines.push({
      y: currentY,
      items: currentLine,
      avgFontSize: totalSize / currentLine.length,
    });
  }

  // Calculate body font size estimate
  const allFontSizes = lines.map((l) => l.avgFontSize).sort((a, b) => a - b);
  const medianFontSize = allFontSizes[Math.floor(allFontSizes.length / 2)] || 11;

  // Group lines into paragraphs
  const paragraphs: ExtractedParagraph[] = [];
  let accumulatedLines: RawLine[] = [];

  function flushParagraph() {
    if (!accumulatedLines.length) return;

    const runs: ExtractedTextRun[] = [];
    let fullText = "";

    for (let lineIdx = 0; lineIdx < accumulatedLines.length; lineIdx++) {
      const line = accumulatedLines[lineIdx];

      for (let itemIdx = 0; itemIdx < line.items.length; itemIdx++) {
        const item = line.items[itemIdx];
        const prevItem = itemIdx > 0 ? line.items[itemIdx - 1] : null;

        // Add space between horizontally separated items if needed
        let textToAdd = item.str;
        if (
          prevItem &&
          item.x > prevItem.x + prevItem.width + 1.5 &&
          !textToAdd.startsWith(" ") &&
          !fullText.endsWith(" ")
        ) {
          textToAdd = " " + textToAdd;
        }

        const bold = isFontBold(item.fontName);
        const italic = isFontItalic(item.fontName);

        // Merge with last run if styling matches
        const lastRun = runs[runs.length - 1];
        if (
          lastRun &&
          lastRun.bold === bold &&
          lastRun.italic === italic &&
          Math.abs(lastRun.fontSize - item.fontSize) < 1
        ) {
          lastRun.text += textToAdd;
        } else if (textToAdd.length > 0) {
          runs.push({
            text: textToAdd,
            bold,
            italic,
            fontSize: item.fontSize,
            fontFamily: item.fontName,
          });
        }

        fullText += textToAdd;
      }

      // In flow mode, add space between wrapped lines if needed
      if (layoutMode === "flow" && lineIdx < accumulatedLines.length - 1) {
        if (!fullText.endsWith(" ")) {
          fullText += " ";
          const lastRun = runs[runs.length - 1];
          if (lastRun) lastRun.text += " ";
        }
      }
    }

    const trimmedText = fullText.trim();
    if (trimmedText) {
      const avgSize =
        accumulatedLines.reduce((s, l) => s + l.avgFontSize, 0) / accumulatedLines.length;

      // Heading detection: font size notably higher than body font
      const isHeadingCandidate =
        trimmedText.length < 150 && (avgSize >= medianFontSize * 1.3 || avgSize >= 15);

      let headingLevel: 1 | 2 | 3 | undefined;
      if (isHeadingCandidate) {
        if (avgSize >= 20 || avgSize >= medianFontSize * 1.7) {
          headingLevel = 1;
        } else if (avgSize >= 15 || avgSize >= medianFontSize * 1.4) {
          headingLevel = 2;
        } else {
          headingLevel = 3;
        }
      }

      paragraphs.push({
        runs,
        isHeading: isHeadingCandidate,
        headingLevel,
        text: trimmedText,
        pageNumber,
        y: accumulatedLines[0]?.y ?? 0,
      });
    }

    accumulatedLines = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const prev = accumulatedLines[accumulatedLines.length - 1];

    if (!prev) {
      accumulatedLines.push(current);
      continue;
    }

    const isCurrentHeading =
      current.avgFontSize >= medianFontSize * 1.3 || current.avgFontSize >= 15;
    const isPrevHeading =
      prev.avgFontSize >= medianFontSize * 1.3 || prev.avgFontSize >= 15;

    // Check if new paragraph should start
    if (layoutMode === "exact") {
      flushParagraph();
      accumulatedLines.push(current);
    } else {
      const lineGap = Math.abs(prev.y - current.y);
      const isLargeGap = lineGap > prev.avgFontSize * 1.7;
      const fontDifference = Math.abs(current.avgFontSize - prev.avgFontSize) > 2;

      if (isCurrentHeading || isPrevHeading || isLargeGap || fontDifference) {
        flushParagraph();
      }
      accumulatedLines.push(current);
    }
  }

  flushParagraph();
  return paragraphs;
}

function multiplyMatrices(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function computeImageBounds(matrix: number[]) {
  const [a, b, c, d, e, f] = matrix;
  const p0x = e,
    p0y = f;
  const p1x = a + e,
    p1y = b + f;
  const p2x = c + e,
    p2y = d + f;
  const p3x = a + c + e,
    p3y = b + d + f;
  const minX = Math.min(p0x, p1x, p2x, p3x);
  const maxX = Math.max(p0x, p1x, p2x, p3x);
  const minY = Math.min(p0y, p1y, p2y, p3y);
  const maxY = Math.max(p0y, p1y, p2y, p3y);
  return {
    x: minX,
    y: minY,
    topY: maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/**
 * Extracts embedded images and their page layout coordinates from a PDFPageProxy.
 */
export async function extractImagesFromPage(
  page: PDFPageProxy,
  pageNumber: number
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  const seenBounds = new Set<string>();

  try {
    const opList = await page.getOperatorList();
    const pdfjs = await getPdfJs();
    const OPS = pdfjs.OPS;

    let ctm = [1, 0, 0, 1, 0, 0];
    const ctmStack: number[][] = [];

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === OPS.save) {
        ctmStack.push([...ctm]);
      } else if (fn === OPS.restore) {
        if (ctmStack.length) ctm = ctmStack.pop()!;
      } else if (fn === OPS.transform) {
        if (Array.isArray(args) && args.length >= 6) {
          ctm = multiplyMatrices(ctm, args as number[]);
        }
      } else if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintImageMaskXObject ||
        fn === OPS.paintInlineImageXObject
      ) {
        const bounds = computeImageBounds(ctm);

        // Filter out zero-sized or invisible frames
        if (bounds.width <= 1 || bounds.height <= 1) {
          continue;
        }

        const boundKey = `${Math.round(bounds.x)}_${Math.round(bounds.y)}_${Math.round(bounds.width)}_${Math.round(bounds.height)}`;
        if (seenBounds.has(boundKey)) {
          continue;
        }
        seenBounds.add(boundKey);

        let imgObj: any = null;
        try {
          if (fn === OPS.paintInlineImageXObject) {
            imgObj = args[0];
          } else {
            const imgName = String(args[0]);
            const container = imgName.startsWith("g_") ? page.commonObjs : page.objs;
            imgObj = await new Promise((resolve) => {
              container.get(imgName, (res: any) => resolve(res));
            });
          }
        } catch {
          imgObj = null;
        }

        if (!imgObj) continue;

        let width = imgObj.width || 0;
        let height = imgObj.height || 0;
        let pngBytes: Uint8Array | null = null;
        let dataUrl: string | undefined;

        // In browser: check if bitmap or canvas can be used
        const hasBitmap =
          imgObj.bitmap ||
          (typeof ImageBitmap !== "undefined" && imgObj instanceof ImageBitmap);
        if (hasBitmap && typeof document !== "undefined") {
          try {
            const bitmap = imgObj.bitmap || imgObj;
            width = bitmap.width;
            height = bitmap.height;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
              dataUrl = canvas.toDataURL("image/png");
              const base64 = dataUrl.split(",")[1];
              if (base64) {
                const binary = atob(base64);
                pngBytes = new Uint8Array(binary.length);
                for (let k = 0; k < binary.length; k++)
                  pngBytes[k] = binary.charCodeAt(k);
              }
            }
          } catch {
            pngBytes = null;
          }
        }

        // If raw pixel data is provided
        if (!pngBytes && imgObj.data && width > 0 && height > 0) {
          try {
            const src = imgObj.data;
            const kind = imgObj.kind;
            let rgba: Uint8Array | null = null;

            if (kind === 3 || src.length === width * height * 4) {
              rgba = src instanceof Uint8Array ? src : new Uint8Array(src);
            } else if (kind === 2 || src.length === width * height * 3) {
              rgba = new Uint8Array(width * height * 4);
              for (let s = 0, d = 0; s < src.length; s += 3, d += 4) {
                rgba[d] = src[s];
                rgba[d + 1] = src[s + 1];
                rgba[d + 2] = src[s + 2];
                rgba[d + 3] = 255;
              }
            } else if (kind === 1) {
              // 1-bit monochrome
              rgba = new Uint8Array(width * height * 4);
              let srcIdx = 0;
              let destIdx = 0;
              for (let y = 0; y < height; y++) {
                let mask = 0;
                let byteVal = 0;
                for (let x = 0; x < width; x++) {
                  if (mask === 0) {
                    byteVal = src[srcIdx++];
                    mask = 128;
                  }
                  const val = byteVal & mask ? 255 : 0;
                  rgba[destIdx++] = val;
                  rgba[destIdx++] = val;
                  rgba[destIdx++] = val;
                  rgba[destIdx++] = 255;
                  mask >>= 1;
                }
              }
            } else if (src.length === width * height) {
              // 8-bit grayscale
              rgba = new Uint8Array(width * height * 4);
              for (let s = 0, d = 0; s < src.length; s++, d += 4) {
                const val = src[s];
                rgba[d] = val;
                rgba[d + 1] = val;
                rgba[d + 2] = val;
                rgba[d + 3] = 255;
              }
            }

            if (rgba) {
              pngBytes = encodeRgbaToPng(width, height, rgba);
              dataUrl = bytesToDataUrl(pngBytes);
            }
          } catch {
            pngBytes = null;
          }
        }

        if (pngBytes && width >= 1 && height >= 1) {
          images.push({
            id: `p${pageNumber}_img${images.length + 1}`,
            pageNumber,
            x: bounds.x,
            y: bounds.y,
            topY: bounds.topY,
            width: bounds.width,
            height: bounds.height,
            naturalWidth: width,
            naturalHeight: height,
            data: pngBytes,
            dataUrl,
            format: "png",
          });
        }
      }
    }
  } catch {
    // If operator list traversal fails on an encrypted or non-standard page, continue gracefully
  }

  return images;
}

/**
 * Extracts all text, images, and layout structure from a loaded PDFDocumentProxy.
 */
export async function extractTextFromPdf(
  pdfDoc: PDFDocumentProxy,
  options: PdfToWordOptions,
  onProgress?: (progress: ConversionProgress) => void
): Promise<PdfExtractionResult> {
  const totalPages = Math.min(pdfDoc.numPages, PDF_WORD_LIMITS.maxPages);
  const pages: ExtractedPage[] = [];

  let totalParagraphs = 0;
  let totalWords = 0;
  let totalCharacters = 0;
  let totalImages = 0;

  const includeImages = options.includeImages !== false;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round((pageNum / totalPages) * 70);
    onProgress?.({
      status: "parsing",
      message: `Extracting page ${pageNum} of ${totalPages} (text & images)...`,
      percent,
      current: pageNum,
      total: totalPages,
    });

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rawItems: RawTextItem[] = [];
    for (const item of textContent.items) {
      if ("str" in item && typeof item.str === "string" && item.str.trim().length > 0) {
        const tx = item.transform[4] || 0;
        const ty = item.transform[5] || 0;
        const fontSize =
          Math.hypot(item.transform[0], item.transform[1]) || item.height || 11;

        rawItems.push({
          str: item.str,
          x: tx,
          y: ty,
          width: item.width || 0,
          height: item.height || fontSize,
          fontName: item.fontName || "",
          fontSize,
        });
      }
    }

    const paragraphs = processPageTextItems(rawItems, pageNum, options.layout);
    const pageText = paragraphs.map((p) => p.text).join("\n\n");

    let images: ExtractedImage[] = [];
    if (includeImages) {
      images = await extractImagesFromPage(page, pageNum);

      // Scanned page fallback: if page has 0 text items and 0 images, render page to canvas
      if (
        paragraphs.length === 0 &&
        images.length === 0 &&
        typeof document !== "undefined"
      ) {
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            const dataUrl = canvas.toDataURL("image/png");
            const base64 = dataUrl.split(",")[1];
            if (base64) {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let k = 0; k < binary.length; k++) bytes[k] = binary.charCodeAt(k);

              images.push({
                id: `p${pageNum}_scanned`,
                pageNumber: pageNum,
                x: 0,
                y: 0,
                topY: viewport.height,
                width: viewport.width / 1.5,
                height: viewport.height / 1.5,
                naturalWidth: viewport.width,
                naturalHeight: viewport.height,
                data: bytes,
                dataUrl,
                format: "png",
              });
            }
          }
        } catch {
          // Ignore render fallback failure
        }
      }
    }

    // Build unified elements sorted by Y descending (top to bottom of page)
    const elements: PageElement[] = [
      ...paragraphs.map((p) => ({
        type: "paragraph" as const,
        paragraph: p,
        y: p.y ?? 0,
      })),
      ...images.map((img) => ({
        type: "image" as const,
        image: img,
        y: img.topY,
      })),
    ];
    elements.sort((a, b) => b.y - a.y);

    for (const p of paragraphs) {
      totalParagraphs += 1;
      totalCharacters += p.text.length;
      totalWords += p.text.split(/\s+/).filter(Boolean).length;
    }
    totalImages += images.length;

    pages.push({
      pageNumber: pageNum,
      paragraphs,
      images,
      elements,
      text: pageText,
    });
  }

  return {
    pages,
    totalPages,
    totalParagraphs,
    totalWords,
    totalCharacters,
    totalImages,
  };
}

/**
 * Compiles extracted PDF text, headings, and images into a modern OpenXML .docx Blob.
 */
export async function generateDocxBlob(
  extraction: PdfExtractionResult,
  options: PdfToWordOptions
): Promise<Blob> {
  const docChildren: Paragraph[] = [];
  const includeImages = options.includeImages !== false;

  for (let pageIdx = 0; pageIdx < extraction.pages.length; pageIdx++) {
    const page = extraction.pages[pageIdx];

    // Page break before subsequent pages
    if (pageIdx > 0) {
      docChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }

    const elements =
      page.elements && page.elements.length > 0
        ? page.elements
        : page.paragraphs.map((p) => ({
            type: "paragraph" as const,
            paragraph: p,
            y: p.y ?? 0,
          }));

    for (const elem of elements) {
      if (elem.type === "paragraph") {
        const p = elem.paragraph;
        if (p.isHeading && p.headingLevel) {
          let docHeading: (typeof HeadingLevel)[keyof typeof HeadingLevel] =
            HeadingLevel.HEADING_1;
          if (p.headingLevel === 2) docHeading = HeadingLevel.HEADING_2;
          if (p.headingLevel === 3) docHeading = HeadingLevel.HEADING_3;

          docChildren.push(
            new Paragraph({
              text: p.text,
              heading: docHeading,
              spacing: {
                before: 200,
                after: 100,
              },
            })
          );
        } else {
          const textRuns = p.runs.map(
            (run) =>
              new TextRun({
                text: run.text,
                bold: run.bold || undefined,
                italics: run.italic || undefined,
                size: Math.max(16, Math.min(48, Math.round(run.fontSize * 2))), // half-points in docx
              })
          );

          docChildren.push(
            new Paragraph({
              children: textRuns.length ? textRuns : [new TextRun(p.text)],
              spacing: {
                after: 120,
                line: 276, // 1.15 line spacing
              },
            })
          );
        }
      } else if (elem.type === "image" && includeImages) {
        const img = elem.image;
        if (img.data && img.data.length > 0) {
          const maxPtWidth = 520;
          const displayWidth = img.width > 0 ? img.width : 400;
          const displayHeight = img.height > 0 ? img.height : 300;
          const scale = displayWidth > maxPtWidth ? maxPtWidth / displayWidth : 1;
          const targetPtWidth = displayWidth * scale;
          const targetPtHeight = displayHeight * scale;

          // Convert PDF points (1/72 in) to docx pixel units (1/96 in)
          const pxWidth = Math.max(32, Math.round(targetPtWidth * (96 / 72)));
          const pxHeight = Math.max(32, Math.round(targetPtHeight * (96 / 72)));

          docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: img.data,
                  transformation: {
                    width: pxWidth,
                    height: pxHeight,
                  },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 140,
                after: 140,
              },
            })
          );
        }
      }
    }
  }

  // Fallback paragraph if document is empty
  if (!docChildren.length) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun("No extractable text or images found in the source PDF.")],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Generates an RTF/DOC formatted Blob compatible with Word 97-2004 (.doc).
 */
export function generateDocBlob(
  extraction: PdfExtractionResult,
  options: PdfToWordOptions
): Blob {
  function escapeRtf(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}")
      .replace(/[^\x00-\x7F]/g, (char) => {
        const code = char.charCodeAt(0);
        return `\\u${code}?`;
      });
  }

  const includeImages = options.includeImages !== false;

  const rtfParts: string[] = [
    "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033",
    "{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}{\\f1\\fnil\\fcharset0 Calibri-Bold;}{\\f2\\fnil\\fcharset0 Calibri-Italic;}}",
    "{\\colortbl ;\\red14\\green54\\blue60;\\red35\\green37\\blue39;}",
    "\\viewkind4\\uc1\\pard\\sa120\\sl276\\slmult1\\f0\\fs22 ",
  ];

  for (let pageIdx = 0; pageIdx < extraction.pages.length; pageIdx++) {
    const page = extraction.pages[pageIdx];

    if (pageIdx > 0) {
      rtfParts.push("\\page ");
    }

    const elements =
      page.elements && page.elements.length > 0
        ? page.elements
        : page.paragraphs.map((p) => ({
            type: "paragraph" as const,
            paragraph: p,
            y: p.y ?? 0,
          }));

    for (const elem of elements) {
      if (elem.type === "paragraph") {
        const p = elem.paragraph;
        if (p.isHeading) {
          const size = p.headingLevel === 1 ? 32 : p.headingLevel === 2 ? 26 : 24;
          rtfParts.push(
            `\\pard\\b\\fs${size} ${escapeRtf(p.text)}\\b0\\fs22\\par\\sa120\\sl276\\slmult1 `
          );
        } else {
          rtfParts.push("\\pard\\sa120\\sl276\\slmult1 ");
          for (const run of p.runs) {
            const runSize = Math.max(16, Math.min(36, Math.round(run.fontSize * 2)));
            let runPrefix = "";
            let runSuffix = "";

            if (run.bold) {
              runPrefix += "\\b ";
              runSuffix = "\\b0 " + runSuffix;
            }
            if (run.italic) {
              runPrefix += "\\i ";
              runSuffix = "\\i0 " + runSuffix;
            }

            rtfParts.push(
              `\\fs${runSize} ${runPrefix}${escapeRtf(run.text)}${runSuffix}`
            );
          }
          rtfParts.push("\\par ");
        }
      } else if (elem.type === "image" && includeImages) {
        const img = elem.image;
        if (img.data && img.data.length > 0) {
          const maxPtWidth = 520;
          const displayWidth = img.width > 0 ? img.width : 400;
          const displayHeight = img.height > 0 ? img.height : 300;
          const scale = displayWidth > maxPtWidth ? maxPtWidth / displayWidth : 1;
          const targetPtWidth = displayWidth * scale;
          const targetPtHeight = displayHeight * scale;
          const twipsWidth = Math.round(targetPtWidth * 20);
          const twipsHeight = Math.round(targetPtHeight * 20);

          let hex = "";
          for (let i = 0; i < img.data.length; i++) {
            hex += img.data[i].toString(16).padStart(2, "0");
          }
          rtfParts.push(
            `\\pard\\qc\\sa140 {\\pict\\pngblip\\picw${img.naturalWidth || Math.round(displayWidth)}\\pich${img.naturalHeight || Math.round(displayHeight)}\\picwgoal${twipsWidth}\\pichgoal${twipsHeight}\n${hex}\n}\\par\\pard\\sa120 `
          );
        }
      }
    }
  }

  rtfParts.push("}");

  const rtfContent = rtfParts.join("");
  return new Blob([rtfContent], { type: "application/msword" });
}

/**
 * High-level orchestrator: converts a PDF ArrayBuffer to a Word (.docx or .doc) Blob.
 */
export async function convertPdfToWord(
  arrayBuffer: ArrayBuffer,
  options: PdfToWordOptions,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; extraction: PdfExtractionResult }> {
  onProgress?.({
    status: "parsing",
    message: "Initializing PDF parser in browser...",
    percent: 5,
    current: 0,
    total: 0,
  });

  const pdfjs = await getPdfJs();
  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  onProgress?.({
    status: "parsing",
    message: `Reading document with ${pdfDoc.numPages} page(s)...`,
    percent: 15,
    current: 0,
    total: pdfDoc.numPages,
  });

  const extraction = await extractTextFromPdf(pdfDoc, options, onProgress);

  onProgress?.({
    status: "converting",
    message: `Generating Word ${options.format.toUpperCase()} document with text and images...`,
    percent: 85,
    current: extraction.totalPages,
    total: extraction.totalPages,
  });

  let blob: Blob;
  if (options.format === "docx") {
    blob = await generateDocxBlob(extraction, options);
  } else {
    blob = generateDocBlob(extraction, options);
  }

  onProgress?.({
    status: "done",
    message: `Word (${options.format.toUpperCase()}) document created successfully!`,
    percent: 100,
    current: extraction.totalPages,
    total: extraction.totalPages,
  });

  return { blob, extraction };
}
