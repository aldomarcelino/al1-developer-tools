const common = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Africa/Johannesburg",
];
export function zoneLabel(zone: string): string {
  return zone === "UTC"
    ? "UTC"
    : `${zone.split("/").at(-1)!.replaceAll("_", " ")} (${zone})`;
}
export function getZoneOptions() {
  let supported: string[] = [];
  try {
    supported = Intl.supportedValuesOf("timeZone");
  } catch {
    /* Use common zones in older browsers. */
  }
  return [...new Set([...common, ...supported])]
    .map((value) => ({ value, label: zoneLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}
export function todayInZone(zone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
