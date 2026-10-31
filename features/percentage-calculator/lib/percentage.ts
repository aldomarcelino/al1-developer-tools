export type PercentageMode = "of" | "ratio" | "change" | "discount";
export const percentageModes = [
  { value: "of", label: "Percentage of a number" },
  { value: "ratio", label: "What percentage is this?" },
  { value: "change", label: "Percentage change" },
  { value: "discount", label: "Discount calculator" },
] as const;
export function calculatePercentage(
  mode: PercentageMode,
  first: string,
  second: string
): { value: number; formula: string; suffix: string } {
  if (!first.trim() || !second.trim()) throw new Error("Enter both values to calculate.");
  const a = Number(first),
    b = Number(second);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error("Enter valid, finite numbers using a dot for decimals.");
  let value: number;
  let formula: string;
  let suffix = "";
  switch (mode) {
    case "of":
      value = (a / 100) * b;
      formula = `${a}% × ${b}`;
      break;
    case "ratio":
      if (b === 0) throw new Error("The total cannot be zero.");
      value = (a / b) * 100;
      formula = `${a} ÷ ${b} × 100`;
      suffix = "%";
      break;
    case "change":
      if (a <= 0) throw new Error("The original value must be greater than zero.");
      value = ((b - a) / a) * 100;
      formula = `(${b} − ${a}) ÷ ${a} × 100`;
      suffix = "%";
      break;
    case "discount":
      if (a < 0) throw new Error("The original price cannot be negative.");
      if (b < 0 || b > 100) throw new Error("The discount must be between 0 and 100%.");
      value = a * (1 - b / 100);
      formula = `${a} × (1 − ${b} ÷ 100)`;
      break;
  }
  if (!Number.isFinite(value))
    throw new Error("The result is too large. Try smaller values.");
  return { value: Object.is(value, -0) ? 0 : value, formula, suffix };
}
