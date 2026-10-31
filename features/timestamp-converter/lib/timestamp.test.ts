import test from "node:test";
import assert from "node:assert/strict";
import {
  detectUnit,
  getRelativeTimeString,
  isLeapYear,
  normalizeToMs,
  parseDateStringToTimestamp,
  parseTimestamp,
} from "./timestamp.ts";

test("detects timestamp units correctly based on digit length", () => {
  assert.equal(detectUnit("1729750000"), "seconds"); // 10 digits
  assert.equal(detectUnit("1729750000000"), "milliseconds"); // 13 digits
  assert.equal(detectUnit("1729750000000000"), "microseconds"); // 16 digits
  assert.equal(detectUnit("1729750000000000000"), "nanoseconds"); // 19 digits
});

test("normalizes timestamp units to milliseconds", () => {
  assert.equal(normalizeToMs(1000, "seconds"), 1_000_000);
  assert.equal(normalizeToMs(1000, "milliseconds"), 1000);
  assert.equal(normalizeToMs(1_000_000, "microseconds"), 1000);
  assert.equal(normalizeToMs(1_000_000_000, "nanoseconds"), 1000);
});

test("parses unix timestamp into ISO 8601, UTC, and calendar details", () => {
  // 1700000000 = Wed Nov 15 2023 02:40:00 GMT
  const res = parseTimestamp(1700000000, "seconds");
  assert.equal(res.valid, true);
  assert.equal(res.unixSeconds, 1700000000);
  assert.equal(res.iso8601, "2023-11-14T22:13:20.000Z");
  assert.equal(res.dayOfWeek, "Wednesday");
});

test("parses human date string into unix timestamp", () => {
  const dateStr = "2026-10-24T00:00:00.000Z";
  const res = parseDateStringToTimestamp(dateStr);
  assert.equal(res.valid, true);
  assert.equal(res.iso8601, dateStr);
  assert.equal(res.unixSeconds, 1792800000);
});

test("calculates leap year correctly", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
});

test("calculates relative time correctly", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const past = new Date("2026-10-24T10:00:00Z");
  const future = new Date("2026-10-24T15:00:00Z");
  assert.equal(getRelativeTimeString(past, now), "2 hours ago");
  assert.equal(getRelativeTimeString(future, now), "3 hours from now");
});

test("handles invalid inputs safely", () => {
  const res = parseTimestamp("not-a-number");
  assert.equal(res.valid, false);
  assert.equal(res.error, "Invalid numeric timestamp.");

  const emptyRes = parseDateStringToTimestamp("");
  assert.equal(emptyRes.valid, false);
});
