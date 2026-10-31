import type { ImageFormat } from "./image-tools";
export type ImageSource = { file: File; url: string; width: number; height: number };
export type ImageResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  name: string;
  format: ImageFormat;
};

async function decodeImage(
  file: File,
  url: string
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* SVG and older browsers use Image. */
    }
  }
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not decode this image."));
    image.src = url;
  });
  return image;
}

export async function readImage(file: File): Promise<ImageSource> {
  if (
    !file.type.startsWith("image/") &&
    !/\.(jpe?g|png|webp|avif|bmp|gif|svg)$/i.test(file.name)
  )
    throw new Error("Unsupported file. Choose an image.");
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > 30 * 1024 * 1024) throw new Error("Image exceeds 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const decoded = await decodeImage(file, url);
    const width =
      decoded instanceof HTMLImageElement ? decoded.naturalWidth : decoded.width;
    const height =
      decoded instanceof HTMLImageElement ? decoded.naturalHeight : decoded.height;
    if ("close" in decoded) decoded.close();
    if (!width || !height || width * height > 60_000_000)
      throw new Error("Image must be between 1 pixel and 60 megapixels.");
    return { file, url, width, height };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function convertImage(
  source: ImageSource,
  format: ImageFormat,
  quality: number,
  width: number,
  height: number
): Promise<Omit<ImageResult, "name" | "url">> {
  const decoded = await decodeImage(source.file, source.url);
  const canvas = document.createElement("canvas");
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas could not be initialized.");
    if (format === "image/jpeg") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, quality / 100)
    );
    if (!blob) throw new Error("Conversion failed. Try another format.");
    // Some browsers silently fall back to PNG for unsupported canvas encoders.
    if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type))
      throw new Error("Output format is not supported by this browser.");
    return { blob, width, height, format: blob.type as ImageFormat };
  } finally {
    if ("close" in decoded) decoded.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
