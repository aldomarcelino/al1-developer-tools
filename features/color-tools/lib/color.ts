export interface Rgb {
  r: number;
  g: number;
  b: number;
}
const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
function number(value: string) {
  if (!numeric.test(value)) throw new Error("Enter a valid color value.");
  return Number(value);
}
function bounded(value: number, max: number) {
  if (!Number.isFinite(value) || value < 0 || value > max)
    throw new Error(`Color components must be between 0 and ${max}.`);
  return value;
}
export function hslToRgb(h: number, s: number, l: number): Rgb {
  if (!Number.isFinite(h)) throw new Error("Enter a finite hue.");
  bounded(s, 100);
  bounded(l, 100);
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const channels =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const [r, g, b] = channels.map((value) => Math.round((value + m) * 255));
  return { r, g, b };
}
export function parseColor(input: string): Rgb {
  const value = input.trim();
  const hex = value.match(/^#?([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
    };
  }
  const match = value.match(/^(rgb|hsl)\(([^()]*)\)$/i);
  if (!match)
    throw new Error(
      "Use opaque HEX, rgb(), or hsl(). Alpha and named colors are not supported."
    );
  const parts = match[2].trim().split(/\s*,\s*|\s+/);
  if (parts.length !== 3 || parts.some((part) => !part))
    throw new Error("Enter exactly three color components.");
  if (match[1].toLowerCase() === "rgb") {
    const [r, g, b] = parts.map((part) =>
      part.endsWith("%")
        ? Math.round((bounded(number(part.slice(0, -1)), 100) * 255) / 100)
        : Math.round(bounded(number(part), 255))
    );
    return { r, g, b };
  }
  if (!parts[1].endsWith("%") || !parts[2].endsWith("%"))
    throw new Error("HSL saturation and lightness need percentages.");
  return hslToRgb(
    number(parts[0].replace(/deg$/i, "")),
    number(parts[1].slice(0, -1)),
    number(parts[2].slice(0, -1))
  );
}
export function colorFormats({ r, g, b }: Rgb) {
  const hex =
    "#" +
    [r, g, b]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const [red, green, blue] = [r, g, b].map((value) => value / 255);
  const max = Math.max(red, green, blue),
    min = Math.min(red, green, blue),
    d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d)
    h =
      max === red
        ? ((green - blue) / d + (green < blue ? 6 : 0)) * 60
        : max === green
          ? ((blue - red) / d + 2) * 60
          : ((red - green) / d + 4) * 60;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    hex,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${round(h)}, ${round(s * 100)}%, ${round(l * 100)}%)`,
  };
}
export function contrastRatio(first: Rgb, second: Rgb): number {
  const luminance = ({ r, g, b }: Rgb) => {
    const [red, green, blue] = [r, g, b].map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
