export type Category = "length" | "weight" | "temperature" | "area" | "data";
export type Unit = { value: string; label: string; symbol: string; factor: number };
const unit = (value: string, label: string, symbol: string, factor: number): Unit => ({
  value,
  label,
  symbol,
  factor,
});
export const categories: { value: Category; label: string }[] = [
  { value: "length", label: "Length" },
  { value: "weight", label: "Weight" },
  { value: "temperature", label: "Temperature" },
  { value: "area", label: "Area" },
  { value: "data", label: "Data size" },
];
export const units: Record<Category, Unit[]> = {
  length: [
    unit("m", "Metres (m)", "m", 1),
    unit("km", "Kilometres (km)", "km", 1000),
    unit("cm", "Centimetres (cm)", "cm", 0.01),
    unit("mm", "Millimetres (mm)", "mm", 0.001),
    unit("in", "Inches (in)", "in", 0.0254),
    unit("ft", "Feet (ft)", "ft", 0.3048),
    unit("yd", "Yards (yd)", "yd", 0.9144),
    unit("mi", "Miles (mi)", "mi", 1609.344),
  ],
  weight: [
    unit("kg", "Kilograms (kg)", "kg", 1000),
    unit("g", "Grams (g)", "g", 1),
    unit("mg", "Milligrams (mg)", "mg", 0.001),
    unit("t", "Metric tonnes (t)", "t", 1e6),
    unit("lb", "Pounds (lb)", "lb", 453.59237),
    unit("oz", "Ounces (oz)", "oz", 28.349523125),
  ],
  temperature: [
    unit("C", "Celsius (°C)", "°C", 1),
    unit("F", "Fahrenheit (°F)", "°F", 1),
    unit("K", "Kelvin (K)", "K", 1),
  ],
  area: [
    unit("m2", "Square metres (m²)", "m²", 1),
    unit("km2", "Square kilometres (km²)", "km²", 1e6),
    unit("cm2", "Square centimetres (cm²)", "cm²", 0.0001),
    unit("ha", "Hectares (ha)", "ha", 10000),
    unit("acre", "Acres (ac)", "ac", 4046.8564224),
    unit("ft2", "Square feet (ft²)", "ft²", 0.09290304),
    unit("in2", "Square inches (in²)", "in²", 0.00064516),
  ],
  data: [
    unit("B", "Bytes (B)", "B", 1),
    unit("KB", "Kilobytes (KB) · decimal", "KB", 1e3),
    unit("MB", "Megabytes (MB) · decimal", "MB", 1e6),
    unit("GB", "Gigabytes (GB) · decimal", "GB", 1e9),
    unit("TB", "Terabytes (TB) · decimal", "TB", 1e12),
    unit("KiB", "Kibibytes (KiB) · binary", "KiB", 1024),
    unit("MiB", "Mebibytes (MiB) · binary", "MiB", 1024 ** 2),
    unit("GiB", "Gibibytes (GiB) · binary", "GiB", 1024 ** 3),
    unit("TiB", "Tebibytes (TiB) · binary", "TiB", 1024 ** 4),
  ],
};
export function convertUnit(
  input: string,
  category: Category,
  fromId: string,
  toId: string
): number {
  if (!input.trim()) throw new Error("Enter a value to convert.");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(input.trim()))
    throw new Error("Enter a valid number using a decimal point.");
  const value = Number(input);
  if (!Number.isFinite(value))
    throw new Error("The input is outside the supported number range.");
  if (value === 0 && /[1-9]/.test(input.split(/[eE]/)[0]))
    throw new Error("The input is too small to represent.");
  const from = units[category]?.find((item) => item.value === fromId);
  const to = units[category]?.find((item) => item.value === toId);
  if (!from || !to) throw new Error("Choose units from the same category.");
  if (["weight", "area", "data"].includes(category) && value < 0)
    throw new Error("Use a non-negative value for this category.");
  let result: number;
  if (category === "temperature") {
    const minimum = fromId === "K" ? 0 : fromId === "C" ? -273.15 : -459.67;
    if (value < minimum) throw new Error("Temperature cannot be below absolute zero.");
    const celsius =
      fromId === "C"
        ? value
        : fromId === "K"
          ? value - 273.15
          : value * (5 / 9) - 32 * (5 / 9);
    result =
      fromId === toId
        ? value
        : toId === "C"
          ? celsius
          : toId === "F"
            ? celsius * 1.8 + 32
            : celsius + 273.15;
    if (toId === "K" && result < 0 && result > -1e-10) result = 0;
  } else {
    result = value * (from.factor / to.factor);
    if (value !== 0 && result === 0)
      throw new Error("The result is too small to represent.");
  }
  if (!Number.isFinite(result))
    throw new Error("The result is outside the supported number range.");
  return Object.is(result, -0) ? 0 : result;
}
export function formatUnitValue(value: number): string {
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 15,
    notation:
      magnitude !== 0 && (magnitude < 1e-8 || magnitude >= 1e15)
        ? "scientific"
        : "standard",
  }).format(value);
}
