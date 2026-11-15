import {
  encodeCanvas,
  loadImage,
  validateDimensions,
  type ImageMime,
} from "@/lib/browser/image-codec";
import {
  pixelArea,
  clipCanvasShape,
  type PercentArea,
  type CropShape,
} from "./geometry";

export async function exportCrop(
  url: string,
  crop: PercentArea,
  width: number,
  height: number,
  format: ImageMime,
  quality: number,
  shape: CropShape = "rectangle",
  cornerRadius = 20,
  backgroundColor = "transparent"
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

    // Fill background: JPEG cannot be transparent, default to white
    const effectiveBg =
      format === "image/jpeg"
        ? backgroundColor === "transparent"
          ? "#ffffff"
          : backgroundColor
        : backgroundColor;

    if (effectiveBg && effectiveBg !== "transparent") {
      ctx.fillStyle = effectiveBg;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    if (shape !== "rectangle") {
      clipCanvasShape(ctx, shape, width, height, cornerRadius);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
    ctx.restore();

    return await encodeCanvas(canvas, format, quality);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    image.src = "";
  }
}
