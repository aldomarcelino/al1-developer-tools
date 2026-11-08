import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PdfToMarkdownOptions {
  includePageDividers: boolean;
  includePageHeaders: boolean;
  headingDetection: boolean;
  detectLists: boolean;
  detectLinks: boolean;
  detectCodeBlocks: boolean;
  preserveLineBreaks: boolean;
}

export const PDF_MD_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  maxPagesNotice: 300,
  defaultOptions: {
    includePageDividers: true,
    includePageHeaders: false,
    headingDetection: true,
    detectLists: true,
    detectLinks: true,
    detectCodeBlocks: true,
    preserveLineBreaks: false,
  } satisfies PdfToMarkdownOptions,
} as const;

export interface ConversionProgress {
  status: "idle" | "parsing" | "converting" | "done" | "error";
  message: string;
  percent: number;
  current: number;
  total: number;
}

export interface ExtractedPage {
  pageNumber: number;
  markdown: string;
  wordCount: number;
  characterCount: number;
  hasText: boolean;
}

export interface PdfMarkdownResult {
  markdown: string;
  totalPages: number;
  totalWords: number;
  totalCharacters: number;
  readingTimeMinutes: number;
  pages: ExtractedPage[];
  hasScannedPages: boolean;
}

export interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

export interface RawAnnotation {
  subtype: string;
  url?: string;
  rect?: [number, number, number, number];
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

  if (file.size > PDF_MD_LIMITS.maxFileSize) {
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
 * Cleans the base name and appends the markdown extension (.md).
 */
export function sanitizeMarkdownFilename(originalName: string): string {
  const stripped = originalName.replace(/\.pdf$/i, "").trim();
  const safeName = stripped.replace(/[^a-zA-Z0-9_\-. ]/g, "_") || "converted_document";
  return `${safeName}.md`;
}

/**
 * Detects if a font is bold based on font name.
 */
export function isFontBold(fontName: string): boolean {
  return /bold|black|heavy|semibold|demibold/i.test(fontName);
}

/**
 * Detects if a font is italic based on font name.
 */
export function isFontItalic(fontName: string): boolean {
  return /italic|oblique|slanted/i.test(fontName);
}

/**
 * Detects if a font is monospaced (code).
 */
export function isFontMonospace(fontName: string): boolean {
  return /courier|consolas|monaco|menlo|inconsolata|monospace|fira-code|source-code/i.test(
    fontName
  );
}

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

interface RawLine {
  y: number;
  items: RawTextItem[];
  avgFontSize: number;
  isMonospace: boolean;
}

/**
 * Reconstructs raw text items of a single page into structured Markdown.
 */
export function convertPdfPageToMarkdown(
  items: RawTextItem[],
  annotations: RawAnnotation[] = [],
  options: PdfToMarkdownOptions = PDF_MD_LIMITS.defaultOptions
): string {
  if (!items.length) return "";

  // Sort items by Y descending (PDF origin bottom-left), then X ascending
  const sortedItems = [...items].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3.5) return yDiff;
    return a.x - b.x;
  });

  // Group items into visual lines
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
      const isMono = currentLine.every((it) => isFontMonospace(it.fontName));
      lines.push({
        y: currentY,
        items: currentLine,
        avgFontSize: totalSize / currentLine.length,
        isMonospace: isMono,
      });
      currentLine = [item];
      currentY = item.y;
    }
  }

  if (currentLine.length) {
    currentLine.sort((a, b) => a.x - b.x);
    const totalSize = currentLine.reduce((sum, it) => sum + it.fontSize, 0);
    const isMono = currentLine.every((it) => isFontMonospace(it.fontName));
    lines.push({
      y: currentY,
      items: currentLine,
      avgFontSize: totalSize / currentLine.length,
      isMonospace: isMono,
    });
  }

  // Calculate median body font size
  const allFontSizes = lines.map((l) => l.avgFontSize).sort((a, b) => a - b);
  const medianFontSize = allFontSizes[Math.floor(allFontSizes.length / 2)] || 11;

  // Filter valid link annotations
  const linkAnnotations = (annotations || []).filter(
    (ann) => ann.subtype === "Link" && ann.url && ann.rect
  );

  function findAnnotationUrl(item: RawTextItem): string | undefined {
    if (!options.detectLinks) return undefined;
    for (const ann of linkAnnotations) {
      if (!ann.rect || !ann.url) continue;
      const [x1, y1, x2, y2] = ann.rect;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const centerX = item.x + item.width / 2;
      const centerY = item.y;
      if (centerX >= minX - 2 && centerX <= maxX + 2 && centerY >= minY - 3 && centerY <= maxY + 3) {
        return ann.url;
      }
    }
    return undefined;
  }

  // Format each line into formatted markdown string
  interface ProcessedLine {
    markdown: string;
    rawText: string;
    avgFontSize: number;
    isHeading: boolean;
    headingLevel?: 1 | 2 | 3;
    isListItem: boolean;
    isMonospace: boolean;
    y: number;
  }

  const processedLines: ProcessedLine[] = [];

  for (const line of lines) {
    let lineMd = "";
    let lineRaw = "";

    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      const prevItem = i > 0 ? line.items[i - 1] : null;

      let str = item.str;
      // Add space if separated horizontally
      if (
        prevItem &&
        item.x > prevItem.x + prevItem.width + 1.5 &&
        !str.startsWith(" ") &&
        !lineRaw.endsWith(" ")
      ) {
        str = " " + str;
      }

      lineRaw += str;

      const trimmed = str.trim();
      if (!trimmed) {
        lineMd += str;
        continue;
      }

      const bold = isFontBold(item.fontName);
      const italic = isFontItalic(item.fontName);
      const mono = isFontMonospace(item.fontName);
      const linkUrl = findAnnotationUrl(item);

      let formatted = trimmed;
      if (mono && options.detectCodeBlocks) {
        formatted = `\`${formatted}\``;
      }
      if (bold && italic) {
        formatted = `***${formatted}***`;
      } else if (bold) {
        formatted = `**${formatted}**`;
      } else if (italic) {
        formatted = `*${formatted}*`;
      }

      if (linkUrl) {
        formatted = `[${formatted}](${linkUrl})`;
      }

      // Preserve leading and trailing spaces from original chunk
      const leadingSpace = str.startsWith(" ") ? " " : "";
      const trailingSpace = str.endsWith(" ") ? " " : "";
      lineMd += `${leadingSpace}${formatted}${trailingSpace}`;
    }

    const trimmedRaw = lineRaw.trim();
    if (!trimmedRaw) continue;

    // Detect heading
    let isHeading = false;
    let headingLevel: 1 | 2 | 3 | undefined;

    if (options.headingDetection && trimmedRaw.length < 160) {
      if (line.avgFontSize >= 20 || line.avgFontSize >= medianFontSize * 1.7) {
        isHeading = true;
        headingLevel = 1;
      } else if (line.avgFontSize >= 15 || line.avgFontSize >= medianFontSize * 1.4) {
        isHeading = true;
        headingLevel = 2;
      } else if (line.avgFontSize >= 13 && line.avgFontSize >= medianFontSize * 1.22) {
        isHeading = true;
        headingLevel = 3;
      }
    }

    // Detect list items
    let isListItem = false;
    let formattedMd = lineMd.trim();

    if (options.detectLists && !isHeading) {
      // Bullet list checks (e.g. •, -, *, etc.)
      const bulletMatch = trimmedRaw.match(/^([•\u2022\u25cf\u25cb\u25aa\u25ab\u2013\u2014\-*])\s*(.*)/);
      if (bulletMatch) {
        isListItem = true;
        // Clean out bullet symbol and replace with Markdown dash
        const cleanContent = formattedMd.replace(
          /^(\*\*|\*|`)*([•\u2022\u25cf\u25cb\u25aa\u25ab\u2013\u2014\-*])(\*\*|\*|`)*\s*/,
          ""
        );
        formattedMd = `- ${cleanContent}`;
      } else {
        // Numbered list checks (e.g. 1., 1), etc.)
        const numberedMatch = trimmedRaw.match(/^(\d+)[\.\)]\s*(.*)/);
        if (numberedMatch) {
          isListItem = true;
          const num = numberedMatch[1];
          const cleanContent = formattedMd.replace(/^(\*\*|\*|`)*(\d+)[\.\)](\*\*|\*|`)*\s*/, "");
          formattedMd = `${num}. ${cleanContent}`;
        }
      }
    }

    if (isHeading && headingLevel) {
      const hashes = "#".repeat(headingLevel);
      // Remove any duplicate bold formatting inside heading line
      const cleanHeading = formattedMd.replace(/^\*\*(.*)\*\*$/, "$1");
      formattedMd = `${hashes} ${cleanHeading}`;
    }

    processedLines.push({
      markdown: formattedMd,
      rawText: trimmedRaw,
      avgFontSize: line.avgFontSize,
      isHeading,
      headingLevel,
      isListItem,
      isMonospace: line.isMonospace,
      y: line.y,
    });
  }

  if (!processedLines.length) return "";

  // Group lines into paragraphs and code blocks
  const outputBlocks: string[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  function flushParagraph() {
    if (!currentParagraph.length) return;
    if (options.preserveLineBreaks) {
      outputBlocks.push(currentParagraph.join("  \n"));
    } else {
      outputBlocks.push(currentParagraph.join(" "));
    }
    currentParagraph = [];
  }

  function flushCodeBlock() {
    if (!codeBlockLines.length) return;
    outputBlocks.push("```\n" + codeBlockLines.join("\n") + "\n```");
    codeBlockLines = [];
    inCodeBlock = false;
  }

  for (let idx = 0; idx < processedLines.length; idx++) {
    const cur = processedLines[idx];
    const prev = idx > 0 ? processedLines[idx - 1] : null;

    // Check if consecutive monospace lines form a fenced code block
    if (options.detectCodeBlocks && cur.isMonospace && !cur.isHeading && !cur.isListItem) {
      flushParagraph();
      inCodeBlock = true;
      codeBlockLines.push(cur.rawText);
      continue;
    } else if (inCodeBlock) {
      flushCodeBlock();
    }

    // Headings and list items start their own blocks
    if (cur.isHeading) {
      flushParagraph();
      outputBlocks.push(cur.markdown);
      continue;
    }

    if (cur.isListItem) {
      flushParagraph();
      outputBlocks.push(cur.markdown);
      continue;
    }

    // Regular text flow
    if (prev) {
      const yGap = Math.abs(prev.y - cur.y);
      const isLargeGap = yGap > prev.avgFontSize * 1.85;

      if (prev.isHeading || prev.isListItem || isLargeGap) {
        flushParagraph();
      }
    }

    currentParagraph.push(cur.markdown);
  }

  flushParagraph();
  flushCodeBlock();

  return outputBlocks.join("\n\n");
}

/**
 * Extracts and converts all pages of a loaded PDF document to Markdown.
 */
export async function extractMarkdownFromPdf(
  pdfDoc: PDFDocumentProxy,
  options: PdfToMarkdownOptions,
  onProgress?: (progress: ConversionProgress) => void
): Promise<PdfMarkdownResult> {
  const totalPages = pdfDoc.numPages;
  const pages: ExtractedPage[] = [];
  let totalWords = 0;
  let totalCharacters = 0;
  let hasScannedPages = false;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round((pageNum / totalPages) * 90);
    onProgress?.({
      status: "converting",
      message: `Converting page ${pageNum} of ${totalPages}...`,
      percent,
      current: pageNum,
      total: totalPages,
    });

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rawAnnotations = (await page.getAnnotations()) as unknown as RawAnnotation[];

    const items: RawTextItem[] = [];
    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const transform = item.transform;
      const x = transform[4] || 0;
      const y = transform[5] || 0;
      const fontSize = Math.sqrt((transform[0] || 0) ** 2 + (transform[1] || 0) ** 2) || item.height || 11;
      items.push({
        str: item.str,
        x,
        y,
        width: item.width || 0,
        height: item.height || 0,
        fontName: item.fontName || "",
        fontSize,
      });
    }

    const pageMarkdown = convertPdfPageToMarkdown(items, rawAnnotations, options);

    const words = pageMarkdown
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const chars = pageMarkdown.length;

    if (items.length === 0 || words === 0) {
      hasScannedPages = true;
    }

    totalWords += words;
    totalCharacters += chars;

    pages.push({
      pageNumber: pageNum,
      markdown: pageMarkdown,
      wordCount: words,
      characterCount: chars,
      hasText: words > 0,
    });
  }

  // Combine pages
  const pageSegments: string[] = [];
  for (const p of pages) {
    if (!p.markdown.trim()) continue;
    let seg = "";
    if (options.includePageHeaders) {
      seg += `<!-- Page ${p.pageNumber} -->\n\n`;
    }
    seg += p.markdown;
    pageSegments.push(seg);
  }

  const divider = options.includePageDividers ? "\n\n---\n\n" : "\n\n";
  const fullMarkdown = pageSegments.join(divider);

  const readingTimeMinutes = Math.max(1, Math.round(totalWords / 200));

  onProgress?.({
    status: "done",
    message: "Conversion complete.",
    percent: 100,
    current: totalPages,
    total: totalPages,
  });

  return {
    markdown: fullMarkdown,
    totalPages,
    totalWords,
    totalCharacters,
    readingTimeMinutes,
    pages,
    hasScannedPages,
  };
}
