import test from "node:test";
import assert from "node:assert/strict";
import { dateDifference, shiftDate, parseDate } from "./date.ts";

test("date differences include leap days and do not depend on DST", () => {
  assert.equal(dateDifference("2024-02-28", "2024-03-01").days, 2);
  assert.equal(dateDifference("2026-03-07", "2026-03-09").days, 2);
  assert.equal(dateDifference("2026-10-29", "2026-10-29").days, 0);
});
test("business day boundaries, inclusive dates and reverse ranges", () => {
  assert.equal(dateDifference("2026-10-23", "2026-10-26").businessDays, 1);
  assert.equal(dateDifference("2026-10-23", "2026-10-26", true).businessDays, 2);
  assert.equal(dateDifference("2026-10-26", "2026-10-23").businessDays, -1);
  assert.equal(dateDifference("2026-10-24", "2026-10-24", true).weekendDays, 1);
  assert.equal(dateDifference("2026-10-26", "2026-11-09").businessDays, 10);
});
test("weekday count matches a daily reference for every start weekday and short span", () => {
  for (let offset = 0; offset < 7; offset++)
    for (let span = 0; span <= 50; span++) {
      const start = parseDate("2026-10-19").add({ days: offset });
      let expected = 0;
      for (let i = 1; i <= span; i++)
        if (start.add({ days: i }).dayOfWeek <= 5) expected++;
      assert.equal(
        dateDifference(start.toString(), start.add({ days: span }).toString())
          .businessDays,
        expected
      );
    }
});
test("date shifts validate actual dates, integers, and supported year range", () => {
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.throws(() => parseDate("2026-02-30"));
  assert.throws(() => parseDate("0000-01-01"));
  assert.throws(() => shiftDate("9999-12-31", 1));
  assert.throws(() => shiftDate("2026-01-01", 1.5));
});
