import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type WordOutputFormat = "docx" | "doc";
export type LayoutMode = "flow" | "exact";

export interface PdfToWordOptions {
  format: WordOutputFormat;
  layout: LayoutMode;
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
}

export interface ExtractedPage {
  pageNumber: number;
  paragraphs: ExtractedParagraph[];
  text: string;
}

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  totalParagraphs: number;
  totalWords: number;
  totalCharacters: number;
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
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("/pdf.worker.min.mjs", origin).toString();
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
export function sanitizeWordFilename(originalName: string, format: WordOutputFormat): string {
  const stripped = originalName.replace(/\.pdf$/i, "").trim();
  const safeName = stripped.replace(/[^a-zA-Z0-9_\-. ]/g, "_") || "converted_document";
  return `${safeName}.${format}`;
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
  const sortedItems = [...items].sort((a, b) => {
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
        accumulatedLines.reduce((s, l) => s + l.avgFontSize, 0) /
        accumulatedLines.length;

      // Heading detection: font size notably higher than body font
      const isHeadingCandidate =
        trimmedText.length < 150 &&
        (avgSize >= medianFontSize * 1.3 || avgSize >= 15);

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

/**
 * Extracts all text and structure from a loaded PDFDocumentProxy.
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

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round((pageNum / totalPages) * 70);
    onProgress?.({
      status: "parsing",
      message: `Extracting page ${pageNum} of ${totalPages}...`,
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
        const fontSize = Math.hypot(item.transform[0], item.transform[1]) || item.height || 11;

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

    for (const p of paragraphs) {
      totalParagraphs += 1;
      totalCharacters += p.text.length;
      totalWords += p.text.split(/\s+/).filter(Boolean).length;
    }

    pages.push({
      pageNumber: pageNum,
      paragraphs,
      text: pageText,
    });
  }

  return {
    pages,
    totalPages,
    totalParagraphs,
    totalWords,
    totalCharacters,
  };
}

/**
 * Compiles extracted PDF text and headings into a modern OpenXML .docx Blob.
 */
export async function generateDocxBlob(
  extraction: PdfExtractionResult,
  _options: PdfToWordOptions
): Promise<Blob> {
  const docChildren: Paragraph[] = [];

  for (let pageIdx = 0; pageIdx < extraction.pages.length; pageIdx++) {
    const page = extraction.pages[pageIdx];

    // Optional page indicator or page break before subsequent pages
    if (pageIdx > 0) {
      docChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }

    for (const p of page.paragraphs) {
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
    }
  }

  // Fallback paragraph if document is empty
  if (!docChildren.length) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun("No extractable text found in the source PDF.")],
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
  _options: PdfToWordOptions
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

    for (const p of page.paragraphs) {
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

          rtfParts.push(`\\fs${runSize} ${runPrefix}${escapeRtf(run.text)}${runSuffix}`);
        }
        rtfParts.push("\\par ");
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
    message: `Generating Word ${options.format.toUpperCase()} document...`,
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
