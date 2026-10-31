import { Temporal } from "@js-temporal/polyfill";
export interface ZoneTime {
  zone: string;
  date: string;
  time: string;
  weekday: string;
  offset: string;
  dayDifference: number;
  inWorkWindow: boolean;
}
function zoned(date: string, time: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Choose a date and a 24-hour time.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    throw new Error("Choose a valid IANA time zone.");
  }
  let local: Temporal.PlainDateTime;
  try {
    local = Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: "reject" });
  } catch {
    throw new Error("Choose a valid date and time.");
  }
  try {
    return Temporal.ZonedDateTime.from(
      {
        timeZone: zone,
        year: local.year,
        month: local.month,
        day: local.day,
        hour: local.hour,
        minute: local.minute,
      },
      { disambiguation: "reject", overflow: "reject" }
    );
  } catch {
    throw new Error(
      `That local time is skipped or repeated in ${zone} due to a clock change. Choose another time.`
    );
  }
}
function withinWorkWindow(value: Temporal.ZonedDateTime) {
  const minute = value.hour * 60 + value.minute;
  return value.dayOfWeek <= 5 && minute >= 540 && minute + 30 <= 1020;
}
export function planZones(
  date: string,
  time: string,
  base: string,
  zones: string[]
): { instant: string; times: ZoneTime[] } {
  const reference = zoned(date, time, base),
    instant = reference.toInstant();
  return {
    instant: instant.toString(),
    times: zones.map((zone) => {
      const value = instant.toZonedDateTimeISO(zone);
      return {
        zone,
        date: value.toPlainDate().toString(),
        time: `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`,
        weekday: new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          weekday: "long",
        }).format(Number(instant.epochMilliseconds)),
        offset: value.offset,
        dayDifference: value
          .toPlainDate()
          .since(reference.toPlainDate(), { largestUnit: "day" }).days,
        inWorkWindow: withinWorkWindow(value),
      };
    }),
  };
}
export function findNextOverlap(
  date: string,
  time: string,
  base: string,
  zones: string[]
): { date: string; time: string } | null {
  if (!zones.length) throw new Error("Add at least one comparison city.");
  const original = zoned(date, time, base).toInstant();
  const step = 30 * 60 * 1000;
  const first = Temporal.Instant.fromEpochMilliseconds(
    Math.ceil(Number(original.epochMilliseconds) / step) * step
  );
  for (let i = 0; i < 7 * 48; i++) {
    const instant = first.add({ minutes: 30 * i });
    if (
      [base, ...zones].every((zone) => withinWorkWindow(instant.toZonedDateTimeISO(zone)))
    ) {
      const value = instant.toZonedDateTimeISO(base);
      return {
        date: value.toPlainDate().toString(),
        time: `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`,
      };
    }
  }
  return null;
}
