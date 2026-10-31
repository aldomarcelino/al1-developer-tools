import { inspectImage, imagePdfLimits, type PdfImage } from "./image-pdf";

/** Decode orientation and re-encode locally to keep preview and PDF consistent. */
export async function prepareImage(file: File): Promise<PdfImage> {
  if (!file.size || file.size > imagePdfLimits.fileBytes)
    throw new Error("Choose a nonempty JPG or PNG up to 10 MB.");
  const raw = new Uint8Array(await file.arrayBuffer());
  const metadata = inspectImage(raw); // Check pixel dimensions before decoding.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > imagePdfLimits.pixels
    )
      throw new Error("Decoded image exceeds 16 megapixels.");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        metadata.format === "jpeg" ? "image/jpeg" : "image/png",
        0.95
      )
    );
    if (!blob) throw new Error("Could not prepare this image.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return {
      name: file.name,
      bytes,
      width: bitmap.width,
      height: bitmap.height,
      format: blob.type === "image/jpeg" ? "jpeg" : "png",
    };
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
