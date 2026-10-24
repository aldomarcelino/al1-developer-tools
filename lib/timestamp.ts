/**
 * Unix Timestamp & Date Converter Engine
 * Robust conversion across seconds, milliseconds, microseconds, nanoseconds,
 * local and UTC timezones, ISO 8601, and relative human durations.
 */

export type TimestampUnit = "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

export interface ParsedDateInfo {
  valid: boolean;
  error?: string;
  unixSeconds: number;
  unixMilliseconds: number;
  iso8601: string;
  utcString: string;
  localString: string;
  relativeTime: string;
  dayOfWeek: string;
  dayOfYear: number;
  weekNumber: number;
  isLeapYear: boolean;
  timezoneOffset: string;
}

export function detectUnit(input: number | string): TimestampUnit {
  const digits = String(input).replace(/[^\d]/g, "").length;
  if (digits >= 18) return "nanoseconds";
  if (digits >= 15) return "microseconds";
  if (digits >= 12) return "milliseconds";
  return "seconds";
}

export function normalizeToMs(value: number, unit: TimestampUnit): number {
  switch (unit) {
    case "seconds":
      return Math.round(value * 1000);
    case "milliseconds":
      return Math.round(value);
    case "microseconds":
      return Math.round(value / 1000);
    case "nanoseconds":
      return Math.round(value / 1_000_000);
  }
}

export function getRelativeTimeString(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const isFuture = diffSec > 0;
  const absSec = Math.abs(diffSec);

  if (absSec < 5) return "just now";
  if (absSec < 60) return `${absSec} seconds ${isFuture ? "from now" : "ago"}`;

  const absMin = Math.round(absSec / 60);
  if (absMin < 60)
    return `${absMin} minute${absMin > 1 ? "s" : ""} ${isFuture ? "from now" : "ago"}`;

  const absHours = Math.round(absMin / 60);
  if (absHours < 24)
    return `${absHours} hour${absHours > 1 ? "s" : ""} ${isFuture ? "from now" : "ago"}`;

  const absDays = Math.round(absHours / 24);
  if (absDays < 30)
    return `${absDays} day${absDays > 1 ? "s" : ""} ${isFuture ? "from now" : "ago"}`;

  const absMonths = Math.round(absDays / 30);
  if (absMonths < 12)
    return `${absMonths} month${absMonths > 1 ? "s" : ""} ${isFuture ? "from now" : "ago"}`;

  const absYears = Math.round(absDays / 365);
  return `${absYears} year${absYears > 1 ? "s" : ""} ${isFuture ? "from now" : "ago"}`;
}

export function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function parseTimestamp(
  rawInput: string | number,
  forcedUnit?: TimestampUnit
): ParsedDateInfo {
  const str = String(rawInput).trim();
  if (!str) {
    return {
      valid: false,
      error: "Empty input.",
      unixSeconds: 0,
      unixMilliseconds: 0,
      iso8601: "",
      utcString: "",
      localString: "",
      relativeTime: "",
      dayOfWeek: "",
      dayOfYear: 0,
      weekNumber: 0,
      isLeapYear: false,
      timezoneOffset: "",
    };
  }

  const num = Number(str);
  if (isNaN(num)) {
    return {
      valid: false,
      error: "Invalid numeric timestamp.",
      unixSeconds: 0,
      unixMilliseconds: 0,
      iso8601: "",
      utcString: "",
      localString: "",
      relativeTime: "",
      dayOfWeek: "",
      dayOfYear: 0,
      weekNumber: 0,
      isLeapYear: false,
      timezoneOffset: "",
    };
  }

  const unit = forcedUnit || detectUnit(str);
  const ms = normalizeToMs(num, unit);
  const date = new Date(ms);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: "Timestamp falls outside valid date range.",
      unixSeconds: 0,
      unixMilliseconds: 0,
      iso8601: "",
      utcString: "",
      localString: "",
      relativeTime: "",
      dayOfWeek: "",
      dayOfYear: 0,
      weekNumber: 0,
      isLeapYear: false,
      timezoneOffset: "",
    };
  }

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const tzOffsetMin = -date.getTimezoneOffset();
  const tzHours = Math.floor(Math.abs(tzOffsetMin) / 60);
  const tzMins = Math.abs(tzOffsetMin) % 60;
  const tzSign = tzOffsetMin >= 0 ? "+" : "-";
  const timezoneOffset = `GMT${tzSign}${String(tzHours).padStart(2, "0")}:${String(tzMins).padStart(2, "0")}`;

  return {
    valid: true,
    unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: ms,
    iso8601: date.toISOString(),
    utcString: date.toUTCString(),
    localString: date.toString(),
    relativeTime: getRelativeTimeString(date),
    dayOfWeek: daysOfWeek[date.getDay()],
    dayOfYear: getDayOfYear(date),
    weekNumber: getWeekNumber(date),
    isLeapYear: isLeapYear(date.getFullYear()),
    timezoneOffset,
  };
}

export function parseDateStringToTimestamp(dateStr: string): ParsedDateInfo {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: "Date string is empty.",
      unixSeconds: 0,
      unixMilliseconds: 0,
      iso8601: "",
      utcString: "",
      localString: "",
      relativeTime: "",
      dayOfWeek: "",
      dayOfYear: 0,
      weekNumber: 0,
      isLeapYear: false,
      timezoneOffset: "",
    };
  }

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: "Could not parse date string. Try ISO 8601 format (YYYY-MM-DD HH:mm:ss).",
      unixSeconds: 0,
      unixMilliseconds: 0,
      iso8601: "",
      utcString: "",
      localString: "",
      relativeTime: "",
      dayOfWeek: "",
      dayOfYear: 0,
      weekNumber: 0,
      isLeapYear: false,
      timezoneOffset: "",
    };
  }

  return parseTimestamp(date.getTime(), "milliseconds");
}
