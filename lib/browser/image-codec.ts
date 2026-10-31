export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 40_000_000;
export const MAX_OUTPUT_PIXELS = 16_000_000;
export const MAX_SIDE = 8192;

export async function validateRasterFile(file: File) {
  if (!/\.(jpe?g|png|webp)$/i.test(file.name))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("Choose a nonempty image up to 30 MB.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = new TextDecoder("latin1").decode(b);
  const png =
    b[0] === 137 &&
    ascii.slice(1, 4) === "PNG" &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10;
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp = ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP";
  if (!png && !jpg && !webp)
    throw new Error("This file does not contain a valid JPG, PNG, or WebP image.");
}

export function validateDimensions(width: number, height: number) {
  if (![width, height].every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_SIDE))
    throw new Error("Enter whole-number dimensions from 1 to 8,192 px.");
  if (width * height > MAX_OUTPUT_PIXELS)
    throw new Error("Output is limited to 16 megapixels. Reduce the dimensions.");
}
export function imageFilename(name: string, mime: ImageMime, used = new Set<string>()) {
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/\x00-\x1f]/g, "_")
      .slice(0, 160) || "image";
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  let result = `${base}.${ext}`,
    i = 2;
  while (used.has(result.toLowerCase())) result = `${base}-${i++}.${ext}`;
  used.add(result.toLowerCase());
  return result;
}
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: ImageMime,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, quality / 100)
  );
  if (!blob || blob.type !== mime)
    throw new Error("Your browser cannot encode this format. Try PNG or JPG.");
  return blob;
}
export async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode().catch(() => {
    throw new Error("Could not decode this image. Choose a valid JPG, PNG, or WebP.");
  });
  if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > MAX_SOURCE_PIXELS)
    throw new Error("Source images are limited to 40 megapixels.");
  return image;
}
