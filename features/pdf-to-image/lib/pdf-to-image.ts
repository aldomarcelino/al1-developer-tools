import { createZip } from "../../../lib/browser/zip.ts";

export type ImageFormat = "jpg" | "png" | "webp";
export type ScaleOption = "1" | "2" | "3";

export interface ConversionOptions {
  format: ImageFormat;
  scale: ScaleOption;
  quality?: number;
}

export interface RenderedPage {
  pageIndex: number;
  pageNumber: number;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
  filename: string;
  size: number;
}

export interface RenderProgress {
  current: number;
  total: number;
  status: "idle" | "loading" | "rendering" | "done" | "error";
  message: string;
}

export const PDF_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  maxPages: 100,
  defaultFormat: "jpg" as ImageFormat,
  defaultScale: "2" as ScaleOption,
  defaultQuality: 0.92,
};

export const FORMAT_OPTIONS = [
  { value: "jpg", label: "JPG (Standard photo, small size)" },
  { value: "png", label: "PNG (Lossless, sharp graphics)" },
  { value: "webp", label: "WebP (Modern compressed web format)" },
] as const;

export const SCALE_OPTIONS = [
  { value: "1", label: "Standard (1x - ~72 DPI)" },
  { value: "2", label: "High (2x - ~144 DPI)" },
  { value: "3", label: "Ultra Crisp (3x - ~216 DPI)" },
] as const;

export function getScaleFactor(scale: ScaleOption): number {
  switch (scale) {
    case "1":
      return 1.0;
    case "2":
      return 2.0;
    case "3":
      return 3.0;
    default:
      return 2.0;
  }
}

export function getDpiEstimate(scale: ScaleOption): number {
  switch (scale) {
    case "1":
      return 72;
    case "2":
      return 144;
    case "3":
      return 216;
    default:
      return 144;
  }
}

export function getMimeType(format: ImageFormat): string {
  switch (format) {
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export function getFileExtension(format: ImageFormat): string {
  switch (format) {
    case "jpg":
      return "jpg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    default:
      return "jpg";
  }
}

export function sanitizeBaseFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, "");
  const clean = withoutExt
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return clean || "document";
}

export function generatePageFilename(
  baseName: string,
  pageNumber: number,
  totalPages: number,
  format: ImageFormat
): string {
  const padLength = totalPages >= 100 ? 3 : totalPages >= 10 ? 2 : 1;
  const pageStr = String(pageNumber).padStart(padLength, "0");
  const ext = getFileExtension(format);
  return `${baseName}-page-${pageStr}.${ext}`;
}

export function generateZipFilename(baseName: string): string {
  return `${baseName}-images.zip`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validatePdfFile(file: { name: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return {
      valid: false,
      error: "Please choose a valid PDF file (.pdf extension).",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "Selected PDF file is empty (0 bytes).",
    };
  }

  if (file.size > PDF_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: `PDF file exceeds the 50 MB limit (${formatFileSize(file.size)}).`,
    };
  }

  return { valid: true };
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

/**
 * Converts an HTML Canvas to a Blob with selected image format and quality.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = PDF_LIMITS.defaultQuality
): Promise<Blob> {
  const mimeType = getMimeType(format);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Failed to encode page canvas to ${format.toUpperCase()}.`));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Packages all rendered page blobs into a single ZIP archive.
 */
export async function packagePagesAsZip(
  pages: RenderedPage[]
): Promise<Uint8Array<ArrayBuffer>> {
  if (!pages.length) {
    throw new Error("No rendered pages to download.");
  }

  const files = await Promise.all(
    pages.map(async (page) => {
      const buffer = await page.blob.arrayBuffer();
      return {
        name: page.filename,
        bytes: new Uint8Array(buffer),
      };
    })
  );

  return createZip(files);
}
