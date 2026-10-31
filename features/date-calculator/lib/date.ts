import { Temporal } from "@js-temporal/polyfill";

export function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a complete date.");
  const date = Temporal.PlainDate.from(value, { overflow: "reject" });
  if (date.year < 1 || date.year > 9999)
    throw new Error("Use dates from year 0001 to 9999.");
  return date;
}

/** Count weekdays after the earlier date, through the later date; reverse is negative. */
export function dateDifference(start: string, end: string, includeBoth = false) {
  const a = parseDate(start),
    b = parseDate(end);
  const direction = Temporal.PlainDate.compare(a, b) <= 0 ? 1 : -1;
  const first = direction === 1 ? a : b,
    last = direction === 1 ? b : a;
  const elapsed = first.until(last, { largestUnit: "day" }).days;
  let weekdays = Math.floor(elapsed / 7) * 5;
  const tail = elapsed % 7;
  for (let day = 1; day <= tail; day++)
    if (first.add({ days: day }).dayOfWeek <= 5) weekdays++;
  if (includeBoth && first.dayOfWeek <= 5) weekdays++;
  const days = elapsed + (includeBoth ? 1 : 0);
  return {
    days: direction * days,
    businessDays: weekdays ? direction * weekdays : 0,
    weekendDays: days - weekdays ? direction * (days - weekdays) : 0,
    weeks: Math.floor(days / 7),
    remainder: days % 7,
  };
}

export function shiftDate(start: string, days: number): string {
  if (!Number.isSafeInteger(days) || Math.abs(days) > 100_000)
    throw new Error("Enter a whole number of days from −100,000 to 100,000.");
  const result = parseDate(start).add({ days });
  if (result.year < 1 || result.year > 9999)
    throw new Error("The result must be between years 0001 and 9999.");
  return result.toString();
}
