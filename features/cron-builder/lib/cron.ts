export const fields = [
  { label: "Minute", min: 0, max: 59 },
  { label: "Hour", min: 0, max: 23 },
  { label: "Day of month", min: 1, max: 31 },
  { label: "Month", min: 1, max: 12 },
  { label: "Day of week", min: 0, max: 7 },
] as const;
export const presets = [
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 9 * * *", label: "Daily at 09:00" },
  { value: "0 9 * * 1-5", label: "Weekdays at 09:00" },
  { value: "0 0 1 * *", label: "First of each month" },
];
export type FieldMode = "every" | "value" | "interval" | "range";
export type BuilderField = { mode: FieldMode; start: string; end: string; step: string };
export type ValidCron = { expression: string; parts: string[]; values: number[][] };
export function validateCron(expression: string): ValidCron {
  if (!expression.trim()) throw new Error("Enter a five-field cron expression.");
  if (expression.length > 250)
    throw new Error("Keep the expression within 250 characters.");
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5)
    throw new Error(
      "Use exactly five fields: minute, hour, day of month, month, day of week."
    );
  const values = parts.map((part, index) => {
    const { min, max, label } = fields[index];
    const expanded = new Set<number>();
    for (const token of part.split(",")) {
      const match = /^(\*|\d{1,2}(?:-\d{1,2})?)(?:\/(\d{1,2}))?$/.exec(token);
      if (!match)
        throw new Error(`${label}: use numbers, *, commas, ranges, and / steps only.`);
      const step = Number(match[2] ?? 1);
      const [first, last] = match[1].split("-");
      const start = first === "*" ? min : Number(first);
      const end = first === "*" || (!last && match[2]) ? max : Number(last ?? first);
      if (start < min || end > max || start > end || step < 1 || step > max - min + 1)
        throw new Error(
          `${label}: values must be ${min}–${max}, with an ascending range and a positive step no larger than ${max - min + 1}.`
        );
      for (let value = start; value <= end; value += step) expanded.add(value);
    }
    return [...expanded].sort((a, b) => a - b);
  });
  return { expression: parts.join(" "), parts, values };
}
export function toBuilder(expression: string): BuilderField[] | null {
  let parts: string[];
  try {
    parts = validateCron(expression).parts;
  } catch {
    return null;
  }
  const result: BuilderField[] = [];
  for (const [index, part] of parts.entries()) {
    const defaults = {
      start: String(fields[index].min),
      end: String(fields[index].max),
      step: "1",
    };
    if (part === "*") result.push({ ...defaults, mode: "every" });
    else if (/^\d+$/.test(part)) result.push({ ...defaults, mode: "value", start: part });
    else if (/^\*\/\d+$/.test(part))
      result.push({ ...defaults, mode: "interval", step: part.slice(2) });
    else if (/^\d+-\d+$/.test(part)) {
      const [start, end] = part.split("-");
      result.push({ ...defaults, mode: "range", start, end });
    } else return null;
  }
  return result;
}
export function buildExpression(values: BuilderField[]): string {
  return values
    .map((value) =>
      value.mode === "every"
        ? "*"
        : value.mode === "value"
          ? value.start
          : value.mode === "interval"
            ? `*/${value.step}`
            : `${value.start}-${value.end}`
    )
    .join(" ");
}
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const months = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const all = (values: number[], index: number) =>
  index === 4
    ? new Set(values.map((v) => v % 7)).size === 7
    : values.length === fields[index].max - fields[index].min + 1;
export function describeCron(expression: string): { summary: string; details: string[] } {
  const { values, parts } = validateCron(expression);
  const details = values.map((list, index) =>
    all(list, index)
      ? `Every ${fields[index].label.toLowerCase()}`
      : index === 4
        ? [...new Set(list.map((value) => weekdays[value]))].join(", ")
        : index === 3
          ? list.map((value) => months[value]).join(", ")
          : list.join(", ")
  );
  let clock: string;
  if (all(values[0], 0) && all(values[1], 1)) clock = "Every minute";
  else if (/^\*\/\d+$/.test(parts[0]) && all(values[1], 1))
    clock = `Every ${Number(parts[0].slice(2))} minutes, starting at minute 0 each hour`;
  else if (values[0].length === 1 && values[1].length === 1)
    clock = `At ${String(values[1][0]).padStart(2, "0")}:${String(values[0][0]).padStart(2, "0")}`;
  else
    clock = `${all(values[0], 0) ? "Every minute" : `At minute ${details[0]}`} ${all(values[1], 1) ? "of every hour" : `during hour ${details[1]} (24-hour clock)`}`;
  const dom = parts[2] === "*",
    dow = parts[4] === "*";
  const days =
    dom && dow
      ? "every day"
      : !dom && !dow
        ? `on day ${values[2].join(", ")} of the month OR on ${[...new Set(values[4].map((value) => weekdays[value]))].join(", ")}`
        : !dom
          ? `on day ${values[2].join(", ")} of the month`
          : `on ${[...new Set(values[4].map((value) => weekdays[value]))].join(", ")}`;
  return {
    summary: `${clock}, ${days}${all(values[3], 3) ? "" : `, in ${details[3]}`}.`,
    details,
  };
}
export function getTimezones(): { value: string; label: string }[] {
  let supported: string[] = [];
  try {
    supported = Intl.supportedValuesOf("timeZone");
  } catch {
    /* Common IANA fallback. */
  }
  return [
    ...new Set([
      "UTC",
      "Asia/Jakarta",
      "Asia/Singapore",
      "Asia/Kolkata",
      "Europe/London",
      "America/New_York",
      "Australia/Sydney",
      ...supported,
    ]),
  ]
    .sort()
    .map((value) => ({ value, label: value }));
}
