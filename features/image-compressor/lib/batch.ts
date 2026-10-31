import type { ImageFormat } from "./image-tools.ts";

export const MAX_BATCH_FILES = 20;
export const MAX_BATCH_BYTES = 150 * 1024 * 1024;
export type ExportSettings = {
  format: ImageFormat;
  quality: number;
  scaleMode: "100" | "75" | "50" | "custom";
  width: string;
  height: string;
  lockAspectRatio: boolean;
};

export function outputDimensions(
  width: number,
  height: number,
  settings: ExportSettings
) {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Invalid image dimensions.");
  let w: number, h: number;
  if (settings.scaleMode !== "custom") {
    const scale = Number(settings.scaleMode) / 100;
    w = width * scale;
    h = height * scale;
  } else {
    w = settings.width.trim() ? Number(settings.width) : width;
    h = settings.height.trim() ? Number(settings.height) : height;
    if (![w, h].every((n) => Number.isFinite(n) && n >= 1 && n <= 12000))
      throw new Error("Enter dimensions from 1 to 12,000 px.");
    if (settings.lockAspectRatio) {
      const scale = Math.min(w / width, h / height, 1);
      w = width * scale;
      h = height * scale;
    }
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (w * h > 60_000_000)
    throw new Error("Output exceeds 60 megapixels. Reduce the dimensions.");
  return { width: w, height: h };
}

export function outputFileName(name: string, format: ImageFormat, used: Set<string>) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[\\/\x00-\x1f]/g, "_") || "image";
  const ext = format === "image/jpeg" ? "jpg" : format.split("/")[1];
  let candidate = `${base}-compressed.${ext}`;
  let n = 2;
  while (used.has(candidate.toLowerCase()))
    candidate = `${base}-compressed-${n++}.${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}
