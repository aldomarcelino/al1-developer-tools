import { inspectImage, MAX_PDF_IMAGE_PIXELS } from "../../../lib/pdf/inspect-image.ts";

export { inspectImage };

export const imagePdfLimits = {
  files: 20,
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  pixels: MAX_PDF_IMAGE_PIXELS,
  totalPixels: 64_000_000,
  encodedBytes: 75 * 1024 * 1024,
};
export type PdfImage = {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
  format: "png" | "jpeg";
};
export type PageOptions = {
  size: "a4" | "letter" | "image";
  orientation: "auto" | "portrait" | "landscape";
  margin: number;
};

export function imagePlacement(width: number, height: number, options: PageOptions) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("Invalid image dimensions.");
  if (
    !["a4", "letter", "image"].includes(options.size) ||
    !["auto", "portrait", "landscape"].includes(options.orientation) ||
    ![0, 12, 24, 36].includes(options.margin)
  )
    throw new Error("Choose supported page settings.");
  let pageWidth: number, pageHeight: number;
  if (options.size === "image") {
    pageWidth = width * 0.75 + options.margin * 2;
    pageHeight = height * 0.75 + options.margin * 2;
  } else {
    [pageWidth, pageHeight] = options.size === "a4" ? [595.28, 841.89] : [612, 792];
    if (
      options.orientation === "landscape" ||
      (options.orientation === "auto" && width > height)
    )
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }
  const scale = Math.min(
    (pageWidth - options.margin * 2) / width,
    (pageHeight - options.margin * 2) / height
  );
  const drawWidth = width * scale,
    drawHeight = height * scale;
  return {
    pageWidth,
    pageHeight,
    width: drawWidth,
    height: drawHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
  };
}

export async function createImagePdf(
  images: PdfImage[],
  options: PageOptions
): Promise<Uint8Array<ArrayBuffer>> {
  if (!images.length || images.length > imagePdfLimits.files)
    throw new Error("Choose from 1 to 20 images.");
  let bytes = 0,
    pixels = 0;
  for (const image of images) {
    const actual = inspectImage(image.bytes);
    if (
      actual.width !== image.width ||
      actual.height !== image.height ||
      actual.format !== image.format
    )
      throw new Error("Image dimensions do not match its data.");
    bytes += image.bytes.byteLength;
    pixels += image.width * image.height;
  }
  if (bytes > imagePdfLimits.encodedBytes || pixels > imagePdfLimits.totalPixels)
    throw new Error("The image collection is too large. Remove some images.");
  const { PDFDocument, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  document.setTitle("Images");
  document.setCreator("Ramupod");
  for (const image of images) {
    const placement = imagePlacement(image.width, image.height, options);
    const embedded =
      image.format === "png"
        ? await document.embedPng(image.bytes)
        : await document.embedJpg(image.bytes);
    const page = document.addPage([placement.pageWidth, placement.pageHeight]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: placement.pageWidth,
      height: placement.pageHeight,
      color: rgb(1, 1, 1),
    });
    page.drawImage(embedded, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });
  }
  const output = await document.save();
  if (output.byteLength > imagePdfLimits.encodedBytes)
    throw new Error("PDF output exceeds 75 MB. Remove some images.");
  return new Uint8Array(output);
}
