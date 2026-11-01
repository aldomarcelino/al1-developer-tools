export type PageSize = "a4" | "letter" | "legal";
export type Orientation = "portrait" | "landscape";
export type MarginOption = "normal" | "narrow" | "wide";

export interface PageSettings {
  pageSize: PageSize;
  orientation: Orientation;
  margin: MarginOption;
}

export interface DocxValidation {
  valid: boolean;
  error?: string;
}

export interface ConversionProgress {
  status: "idle" | "parsing" | "rendering" | "compiling" | "done" | "error";
  message: string;
  percent: number;
}

export const WORD_LIMITS = {
  maxFileSize: 25 * 1024 * 1024, // 25 MB limit
  defaultPageSize: "a4" as PageSize,
  defaultOrientation: "portrait" as Orientation,
  defaultMargin: "normal" as MarginOption,
};

export const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4 (210 x 297 mm)" },
  { value: "letter", label: "Letter (8.5 x 11 in)" },
  { value: "legal", label: "Legal (8.5 x 14 in)" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "portrait", label: "Portrait (Vertical)" },
  { value: "landscape", label: "Landscape (Horizontal)" },
] as const;

export const MARGIN_OPTIONS = [
  { value: "normal", label: "Normal (1 in / 25.4 mm)" },
  { value: "narrow", label: "Narrow (0.5 in / 12.7 mm)" },
  { value: "wide", label: "Wide (1.5 in / 38.1 mm)" },
] as const;

/**
 * Standard PDF points (72 points per inch)
 */
export function getPageDimensions(
  pageSize: PageSize,
  orientation: Orientation
): { width: number; height: number } {
  let width = 595.28;
  let height = 841.89;

  switch (pageSize) {
    case "a4":
      width = 595.28;
      height = 841.89;
      break;
    case "letter":
      width = 612.0;
      height = 792.0;
      break;
    case "legal":
      width = 612.0;
      height = 1008.0;
      break;
  }

  if (orientation === "landscape") {
    return { width: height, height: width };
  }

  return { width, height };
}

export function sanitizeOutputFilename(inputName: string): string {
  const lower = inputName.toLowerCase();
  let withoutExt = inputName;
  if (lower.endsWith(".docx")) {
    withoutExt = inputName.slice(0, -5);
  } else if (lower.endsWith(".doc")) {
    withoutExt = inputName.slice(0, -4);
  } else {
    withoutExt = inputName.replace(/\.[^/.]+$/, "");
  }

  const clean = withoutExt
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${clean || "document"}.pdf`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateWordFile(file: { name: string; size: number }): DocxValidation {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".docx") && !lower.endsWith(".doc")) {
    return {
      valid: false,
      error: "Please select a valid Word document (.docx or .doc extension).",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "Selected file is empty (0 bytes).",
    };
  }

  if (file.size > WORD_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: `File exceeds the 25 MB limit (${formatFileSize(file.size)}).`,
    };
  }

  return { valid: true };
}

export const validateDocxFile = validateWordFile;

/**
 * Checks if buffer is a PK ZIP archive (DOCX format)
 */
export function isZipDocument(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

/**
 * Extracts plain text from legacy OLE2/CFB binary .doc or RTF documents in pure JS
 */
export function extractDocText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8) return "";

  // Check OLE2 Compound Document magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const isOle =
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;

  if (!isOle) {
    // Check if file is RTF (starts with {\rtf)
    const headerStr = new TextDecoder("latin1").decode(bytes.slice(0, 10));
    if (headerStr.startsWith("{\\rtf")) {
      return parseRtfText(new TextDecoder("utf-8").decode(bytes));
    }
    // Fallback: extract printable strings
    return extractPrintableWords(bytes);
  }

  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sectorShift = view.getUint16(30, true);
    const sectorSize = 1 << sectorShift;
    const numFatSectors = view.getUint32(44, true);
    const dirFirstSector = view.getUint32(48, true);

    // Read DIFAT sector indices
    const fatSectors: number[] = [];
    for (let i = 0; i < Math.min(109, numFatSectors); i++) {
      fatSectors.push(view.getUint32(76 + i * 4, true));
    }

    // Build FAT (File Allocation Table)
    const fat: number[] = [];
    const entriesPerSector = sectorSize / 4;
    for (const fs of fatSectors) {
      const offset = (fs + 1) * sectorSize;
      if (offset + sectorSize <= bytes.length) {
        for (let j = 0; j < entriesPerSector; j++) {
          fat.push(view.getUint32(offset + j * 4, true));
        }
      }
    }

    // Helper to read a sector chain from FAT
    function readSectorChain(startSector: number): Uint8Array {
      const chunks: Uint8Array[] = [];
      let current = startSector;
      let count = 0;
      while (current >= 0 && current < 0xfffffffa && count++ < 10000) {
        const offset = (current + 1) * sectorSize;
        if (offset + sectorSize <= bytes.length) {
          chunks.push(bytes.slice(offset, offset + sectorSize));
        }
        current = fat[current] !== undefined ? fat[current] : 0xfffffffe;
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of chunks) {
        combined.set(c, pos);
        pos += c.length;
      }
      return combined;
    }

    // Read Directory Entries
    const dirBytes = readSectorChain(dirFirstSector);
    const dirView = new DataView(dirBytes.buffer, dirBytes.byteOffset, dirBytes.byteLength);
    const totalEntries = Math.floor(dirBytes.length / 128);

    let wordDocSector = -1;
    let wordDocSize = 0;

    for (let i = 0; i < totalEntries; i++) {
      const entryOffset = i * 128;
      const nameLen = dirView.getUint16(entryOffset + 64, true);
      let entryName = "";
      for (let c = 0; c < Math.min(nameLen / 2 - 1, 31); c++) {
        entryName += String.fromCharCode(dirView.getUint16(entryOffset + c * 2, true));
      }
      const type = dirBytes[entryOffset + 66];
      if (
        type === 2 &&
        (entryName === "WordDocument" || entryName.toLowerCase().includes("worddocument"))
      ) {
        wordDocSector = dirView.getUint32(entryOffset + 116, true);
        wordDocSize = dirView.getUint32(entryOffset + 120, true);
        break;
      }
    }

    if (wordDocSector >= 0) {
      const stream = readSectorChain(wordDocSector).slice(0, wordDocSize);
      return extractTextFromWordStream(stream);
    }
  } catch {
    // If structured OLE parsing fails, fallback to printable run extraction
  }

  return extractPrintableWords(bytes);
}

function extractTextFromWordStream(bytes: Uint8Array): string {
  const paragraphs: string[] = [];
  const len = bytes.length;

  // Scan UTF-16LE text runs
  let i = 0;
  while (i < len - 1) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code >= 160) {
      let run = "";
      while (i < len - 1) {
        const c = bytes[i] | (bytes[i + 1] << 8);
        if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c >= 160) {
          run += String.fromCharCode(c);
          i += 2;
        } else {
          break;
        }
      }
      const trimmed = run.trim();
      if (trimmed.length > 2) {
        paragraphs.push(trimmed);
      }
    }
    i += 2;
  }

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n");
  }

  return extractPrintableWords(bytes);
}

function extractPrintableWords(bytes: Uint8Array): string {
  const str = new TextDecoder("latin1").decode(bytes);
  const matches = str.match(/[A-Za-z0-9\s.,!?:;()\-]{4,}/g);
  return matches ? matches.map((m) => m.trim()).filter((m) => m.length > 3).join("\n\n") : "";
}

function parseRtfText(rtf: string): string {
  return rtf
    .replace(/\\[a-z]+(-?\d+)? ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\r?\n\s*\r?\n/g, "\n\n")
    .trim();
}

/**
 * Client-side rendering of Word document buffer (.docx or .doc) into target container
 */
export async function renderWordDocumentToElement(
  buffer: ArrayBuffer,
  container: HTMLElement
): Promise<void> {
  const bytes = new Uint8Array(buffer);
  container.innerHTML = "";

  // If file is a ZIP archive (DOCX format)
  if (isZipDocument(bytes)) {
    const docx = await import("docx-preview");
    await docx.renderAsync(buffer, container, undefined, {
      inWrapper: true,
      breakPages: true,
      useBase64URL: true,
      ignoreHeight: false,
      ignoreWidth: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    });
    return;
  }

  // File is legacy binary .doc or RTF
  const textContent = extractDocText(buffer);
  const wrapper = document.createElement("div");
  wrapper.className = "docx-wrapper";

  const section = document.createElement("section");
  section.className = "docx";
  section.style.cssText =
    "padding: 1in; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #ffffff; min-height: 297mm; box-sizing: border-box;";

  if (!textContent.trim()) {
    const emptyP = document.createElement("p");
    emptyP.textContent = "The document was parsed but contains no readable text content.";
    emptyP.style.color = "#64748b";
    section.appendChild(emptyP);
  } else {
    const paragraphs = textContent.split(/\n\s*\n/);
    paragraphs.forEach((pText, index) => {
      const cleanText = pText.trim();
      if (!cleanText) return;

      // Check if paragraph looks like a heading
      if (cleanText.length < 80 && !/[.!?]$/.test(cleanText) && index === 0) {
        const h1 = document.createElement("h1");
        h1.textContent = cleanText;
        h1.style.cssText =
          "font-size: 18pt; font-weight: 700; color: #0f172a; margin: 0 0 16pt 0; line-height: 1.3;";
        section.appendChild(h1);
      } else if (cleanText.length < 60 && !/[.!?]$/.test(cleanText)) {
        const h2 = document.createElement("h2");
        h2.textContent = cleanText;
        h2.style.cssText =
          "font-size: 14pt; font-weight: 600; color: #1e293b; margin: 16pt 0 8pt 0; line-height: 1.3;";
        section.appendChild(h2);
      } else {
        const p = document.createElement("p");
        p.textContent = cleanText;
        p.style.cssText = "margin: 0 0 10pt 0;";
        section.appendChild(p);
      }
    });
  }

  wrapper.appendChild(section);
  container.appendChild(wrapper);
}

export const renderDocxToElement = renderWordDocumentToElement;

function canvasToJpegBuffer(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Failed to export canvas to JPEG image."));
          return;
        }
        const arrayBuf = await blob.arrayBuffer();
        resolve(new Uint8Array(arrayBuf));
      },
      "image/jpeg",
      0.95
    );
  });
}

/**
 * Compiles rendered Word HTML DOM sections into a PDF document
 */
export async function convertRenderedDocxToPdf(
  container: HTMLElement,
  settings: PageSettings,
  onProgress?: (message: string, percent: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
  const { default: html2canvas } = await import("html2canvas");
  const { PDFDocument, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Converted Document");
  pdfDoc.setCreator("Ramupod");

  const { width: pageWidth, height: pageHeight } = getPageDimensions(
    settings.pageSize,
    settings.orientation
  );

  // Targets each section.docx rendered in wrapper
  const sections = Array.from(
    container.querySelectorAll<HTMLElement>("section.docx")
  );

  const targets = sections.length > 0 ? sections : [container];
  const totalTargets = targets.length;

  for (let i = 0; i < totalTargets; i++) {
    const target = targets[i];
    const targetProgress = Math.round(((i + 1) / totalTargets) * 80);
    onProgress?.(`Processing page ${i + 1} of ${totalTargets}...`, targetProgress);

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const pageRatio = pageHeight / pageWidth;
    const sliceHeight = Math.round(canvas.width * pageRatio);

    if (canvas.height <= sliceHeight * 1.05) {
      const imgBytes = await canvasToJpegBuffer(canvas);
      const embeddedImg = await pdfDoc.embedJpg(imgBytes);
      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

      pdfPage.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: rgb(1, 1, 1),
      });

      pdfPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    } else {
      const totalSlices = Math.ceil(canvas.height / sliceHeight);
      for (let s = 0; s < totalSlices; s++) {
        const y = s * sliceHeight;
        const currentSliceHeight = Math.min(sliceHeight, canvas.height - y);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            y,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );
        }

        const imgBytes = await canvasToJpegBuffer(sliceCanvas);
        const embeddedImg = await pdfDoc.embedJpg(imgBytes);
        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

        pdfPage.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(1, 1, 1),
        });

        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }
  }

  onProgress?.("Finalizing PDF file...", 92);
  const pdfBytes = await pdfDoc.save();
  onProgress?.("Conversion ready!", 100);

  return new Uint8Array(pdfBytes.buffer) as Uint8Array<ArrayBuffer>;
}
