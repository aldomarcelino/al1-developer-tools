import {
  encodeCanvas,
  loadImage,
  validateDimensions,
  type ImageMime,
} from "@/lib/browser/image-codec";
import { pixelArea, type PercentArea } from "./geometry";
export async function exportCrop(
  url: string,
  crop: PercentArea,
  width: number,
  height: number,
  format: ImageMime,
  quality: number
) {
  validateDimensions(width, height);
  const image = await loadImage(url),
    canvas = document.createElement("canvas");
  try {
    const area = pixelArea(crop, image.naturalWidth, image.naturalHeight);
    if (area.width < 1 || area.height < 1)
      throw new Error("The crop must contain at least one source pixel.");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    if (format === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
    return await encodeCanvas(canvas, format, quality);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    image.src = "";
  }
}
