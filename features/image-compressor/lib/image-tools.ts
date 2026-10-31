export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";
export function fitImage(width: number, height: number, maxWidth: number) {
  if (![width, height, maxWidth].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Enter a valid maximum width.");
  const scale = Math.min(1, maxWidth / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
