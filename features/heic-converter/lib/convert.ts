import {
  encodeCanvas,
  MAX_SOURCE_PIXELS,
  type ImageMime,
} from "@/lib/browser/image-codec";
import { hasHeicHeader, validateHeicFile } from "./validation";

export async function convertHeic(
  file: File,
  mime: ImageMime,
  quality: number,
  signal: AbortSignal
): Promise<Blob> {
  validateHeicFile(file);
  if (!(await hasHeicHeader(file)))
    throw new Error("This file does not contain a valid HEIC/HEIF header.");
  signal.throwIfAborted();
  const bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
    const worker = new Worker(new URL("./decode-worker.ts", import.meta.url));
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Conversion cancelled.", "AbortError"));
    };
    const timer = setTimeout(
      () => fail("Conversion timed out after 90 seconds. Try a smaller image."),
      90_000
    );
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      fail("Could not start the local HEIC decoder. Reload and try again.");
    worker.onmessage = (
      event: MessageEvent<{ bitmap?: ImageBitmap; error?: string }>
    ) => {
      cleanup();
      if (event.data.bitmap) resolve(event.data.bitmap);
      else reject(new Error(event.data.error || "Could not decode this HEIC image."));
    };
    worker.postMessage(file);
  });
  const canvas = document.createElement("canvas");
  try {
    signal.throwIfAborted();
    if (
      bitmap.width * bitmap.height > MAX_SOURCE_PIXELS ||
      Math.max(bitmap.width, bitmap.height) > 12000
    )
      throw new Error("HEIC images are limited to 40 megapixels and 12,000 px per side.");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    const blob = await encodeCanvas(canvas, mime, quality);
    signal.throwIfAborted();
    return blob;
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
