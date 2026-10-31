export const imagePdfLimits = {
  files: 20,
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  pixels: 16_000_000,
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

export function inspectImage(bytes: Uint8Array): {
  width: number;
  height: number;
  format: "png" | "jpeg";
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0,
    format: "png" | "jpeg";
  if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  ) {
    format = "png";
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    format = "jpeg";
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error("Invalid JPEG structure.");
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7))
        continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length)
        throw new Error("Truncated JPEG data.");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) throw new Error("Invalid JPEG dimensions.");
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else throw new Error("Only valid JPG and PNG images are supported.");
  if (
    !width ||
    !height ||
    width > 12000 ||
    height > 12000 ||
    width * height > imagePdfLimits.pixels
  )
    throw new Error("Images must be at most 16 megapixels and 12,000 px per side.");
  return { width, height, format };
}

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
