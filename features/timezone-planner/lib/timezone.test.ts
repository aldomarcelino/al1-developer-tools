import test from "node:test";
import assert from "node:assert/strict";
import { planZones, findNextOverlap } from "./timezone.ts";
test("converts half-hour offsets and crosses dates without guessing the machine zone", () => {
  const result = planZones("2026-10-29", "09:00", "Asia/Jakarta", [
    "Asia/Jakarta",
    "Asia/Kolkata",
    "America/New_York",
    "Pacific/Auckland",
  ]);
  assert.equal(result.instant, "2026-10-29T02:00:00Z");
  assert.equal(result.times[1].time, "07:30");
  assert.equal(result.times[2].date, "2026-10-28");
  assert.equal(result.times[2].time, "22:00");
  assert.equal(result.times[2].dayDifference, -1);
  assert.equal(result.times[3].time, "15:00");
});
test("DST changes UTC offsets and rejects skipped and repeated local times", () => {
  assert.equal(
    planZones("2026-01-15", "12:00", "America/New_York", ["UTC"]).times[0].time,
    "17:00"
  );
  assert.equal(
    planZones("2026-07-15", "12:00", "America/New_York", ["UTC"]).times[0].time,
    "16:00"
  );
  assert.throws(
    () => planZones("2026-03-08", "02:30", "America/New_York", ["UTC"]),
    /skipped or repeated/
  );
  assert.throws(
    () => planZones("2026-11-01", "01:30", "America/New_York", ["UTC"]),
    /skipped or repeated/
  );
});
test("validates calendar dates and time zones", () => {
  assert.throws(() => planZones("2026-02-30", "12:00", "UTC", ["UTC"]));
  assert.throws(() => planZones("2026-10-29", "25:00", "UTC", ["UTC"]));
  assert.throws(() => planZones("2026-10-29", "09:00", "Invalid/City", ["UTC"]));
});
test("finds a shared weekday work slot and does not invent an impossible overlap", () => {
  assert.deepEqual(
    findNextOverlap("2026-10-29", "08:10", "Asia/Jakarta", [
      "Asia/Singapore",
      "Asia/Tokyo",
    ]),
    { date: "2026-10-29", time: "09:00" }
  );
  assert.deepEqual(
    findNextOverlap("2026-10-30", "18:00", "Asia/Jakarta", ["Asia/Singapore"]),
    { date: "2026-11-02", time: "09:00" }
  );
  assert.equal(
    findNextOverlap("2026-10-29", "09:00", "Asia/Jakarta", ["America/New_York"]),
    null
  );
});
