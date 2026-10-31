export type PercentArea = { x: number; y: number; width: number; height: number };
export const ratioPresets = [
  { value: "free", label: "Free crop", ratio: undefined },
  { value: "square", label: "Square · 1:1", ratio: 1 },
  { value: "portrait", label: "Social portrait · 4:5", ratio: 4 / 5 },
  { value: "landscape", label: "Landscape · 16:9", ratio: 16 / 9 },
  { value: "photo34", label: "Photo ratio · 3:4", ratio: 3 / 4 },
  { value: "photo46", label: "Photo ratio · 4:6", ratio: 4 / 6 },
  { value: "custom", label: "Custom ratio", ratio: undefined },
] as const;
export function centeredArea(width: number, height: number, ratio?: number): PercentArea {
  if (!ratio) return { x: 0, y: 0, width: 100, height: 100 };
  if (!Number.isFinite(ratio) || ratio <= 0)
    throw new Error("Enter a positive aspect ratio.");
  let w = width,
    h = w / ratio;
  if (h > height) {
    h = height;
    w = h * ratio;
  }
  return {
    x: ((width - w) / width) * 50,
    y: ((height - h) / height) * 50,
    width: (w / width) * 100,
    height: (h / height) * 100,
  };
}
export function pixelArea(area: PercentArea, width: number, height: number) {
  if (
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x + area.width > 100.001 ||
    area.y + area.height > 100.001
  )
    throw new Error("Select a crop area inside the image.");
  const x = (area.x / 100) * width,
    y = (area.y / 100) * height;
  return {
    x,
    y,
    width: Math.min((area.width / 100) * width, width - x),
    height: Math.min((area.height / 100) * height, height - y),
  };
}
export function fitDimensions(width: number, height: number) {
  const scale = Math.min(
    1,
    8192 / width,
    8192 / height,
    Math.sqrt(16_000_000 / (width * height))
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
export function pairedDimension(value: string, ratio: number, axis: "width" | "height") {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < 1) return "";
  return String(Math.max(1, Math.round(axis === "width" ? n / ratio : n * ratio)));
}
