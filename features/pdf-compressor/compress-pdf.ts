import type { PDFDict as PdfDictionary } from "pdf-lib";
import { encodeCanvas } from "../../lib/browser/image-codec.ts";
import { inspectImage } from "../../lib/pdf/inspect-image.ts";
import { validatePdfFile } from "../../lib/pdf/validate-file.ts";

export const presets = {
  light: { label: "Light · higher image quality", quality: 85, maxSide: Infinity },
  balanced: { label: "Balanced · smaller images", quality: 72, maxSide: 1800 },
  strong: { label: "Strong · lowest image quality", quality: 55, maxSide: 1200 },
} as const;
export type Preset = keyof typeof presets;

async function recompressJpeg(
  contents: Uint8Array,
  width: number,
  height: number,
  preset: (typeof presets)[Preset]
) {
  const image = inspectImage(contents);
  if (image.format !== "jpeg" || image.width !== width || image.height !== height)
    return null;

  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(contents)], { type: "image/jpeg" }),
    {
      imageOrientation: "none",
      colorSpaceConversion: "none",
    }
  );
  const canvas = document.createElement("canvas");
  try {
    if (bitmap.width !== width || bitmap.height !== height) return null;
    const scale = Math.min(1, preset.maxSide / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await encodeCanvas(canvas, "image/jpeg", preset.quality);
    if (blob.size >= contents.byteLength) return null;
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}

export async function compressPdf(file: File, preset: Preset): Promise<Blob | null> {
  const validation = validatePdfFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const { EncryptedPDFError, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream } =
    await import("pdf-lib");
  const pdf = await PDFDocument.load(await file.arrayBuffer(), {
    updateMetadata: false,
    throwOnInvalidObject: true,
  }).catch((error: unknown) => {
    throw new Error(
      error instanceof EncryptedPDFError
        ? "Password-protected or encrypted PDFs are unsupported."
        : "Could not read this PDF. Choose a valid PDF file."
    );
  });
  const name = PDFName.of;
  const objects = pdf.context.enumerateIndirectObjects();
  const hasSignature = (dict: PdfDictionary) =>
    dict.has(name("ByteRange")) && dict.has(name("Contents"));

  if (
    pdf.catalog.has(name("Perms")) ||
    objects.some(([, object]) => {
      if (!(object instanceof PDFDict)) return false;
      const value = object.lookup(name("V"));
      return hasSignature(object) || (value instanceof PDFDict && hasSignature(value));
    })
  ) {
    throw new Error("This PDF is digitally signed. Compress an unsigned copy instead.");
  }

  for (const [ref, object] of objects) {
    if (!(object instanceof PDFRawStream)) continue;
    const { dict } = object;
    const color = dict.lookup(name("ColorSpace"));
    if (
      dict.lookup(name("Subtype")) !== name("Image") ||
      dict.lookup(name("Filter")) !== name("DCTDecode") ||
      (color !== name("DeviceRGB") && color !== name("DeviceGray")) ||
      dict.lookupMaybe(name("BitsPerComponent"), PDFNumber)?.asNumber() !== 8 ||
      [
        "Decode",
        "DecodeParms",
        "SMask",
        "Mask",
        "ImageMask",
        "Alternates",
        "Matte",
        "SMaskInData",
      ].some((key) => dict.has(name(key)))
    )
      continue;

    const width = dict.lookup(name("Width"));
    const height = dict.lookup(name("Height"));
    if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) continue;

    // Keep unsupported or un-decodable images in their original form.
    const image = await recompressJpeg(
      object.contents,
      width.asNumber(),
      height.asNumber(),
      presets[preset]
    ).catch(() => null);
    if (!image) continue;

    const replacement = dict.clone();
    replacement.set(name("ColorSpace"), name("DeviceRGB"));
    replacement.set(name("Width"), PDFNumber.of(image.width));
    replacement.set(name("Height"), PDFNumber.of(image.height));
    replacement.set(name("Length"), PDFNumber.of(image.bytes.byteLength));
    pdf.context.assign(ref, PDFRawStream.of(replacement, image.bytes));
  }

  const bytes = await pdf.save({ addDefaultPage: false, updateFieldAppearances: false });
  return bytes.byteLength < file.size
    ? new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
    : null;
}
