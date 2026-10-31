import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCron,
  presets,
  toBuilder,
  buildExpression,
  describeCron,
} from "./cron.ts";
import { previewCron } from "./preview.ts";
test("validates only numeric standard five-field grammar and safe bounds", () => {
  for (const expression of [
    "* * * * *",
    "0,15,30,45 9-17 * * 1-5",
    "0/5 * * * *",
    "0 0 * */2 0,7",
  ])
    assert.equal(validateCron(expression).parts.length, 5);
  for (const expression of [
    "",
    "* * * *",
    "0 * * * * *",
    "@daily",
    "0 9 ? * MON",
    "0 0 L * *",
    "0 0 * * 1#2",
    "H * * * *",
    "60 * * * *",
    "0 24 * * *",
    "0 0 0 * *",
    "0 0 * 13 *",
    "0 0 * * 8",
    "*/0 * * * *",
    "*/61 * * * *",
    "4-2 * * * *",
    "0,,1 * * * *",
    "1.5 * * * *",
  ])
    assert.throws(() => validateCron(expression), expression);
});
test("presets produce ten expected executions and round trip through Builder", () => {
  const expected = [
    "2026-12-31T23:55:00.000Z",
    "2027-01-01T00:00:00.000Z",
    "2027-01-01T09:00:00.000Z",
    "2027-01-01T09:00:00.000Z",
    "2027-01-01T00:00:00.000Z",
  ];
  presets.forEach((preset, index) => {
    assert.equal(buildExpression(toBuilder(preset.value)!), preset.value);
    const result = previewCron(preset.value, "UTC", "2026-12-31T23:54:00Z");
    assert.equal(result.times.length, 10);
    assert.equal(result.times[0], expected[index]);
  });
});
test("Builder declines lists and compound ranges without rewriting the original", () => {
  const original = "0,15 9-17/2 * * 1,3,5";
  assert.ok(validateCron(original));
  assert.equal(toBuilder(original), null);
  assert.equal(original, "0,15 9-17/2 * * 1,3,5");
  assert.equal(toBuilder("bad"), null);
  assert.equal(buildExpression(toBuilder("15 9-17 * 1-6 0")!), "15 9-17 * 1-6 0");
});
test("month ends, year rollover and leap days retain calendar constraints", () => {
  const month = previewCron("0 0 31 * *", "UTC", "2026-01-31T00:00:00Z");
  assert.equal(month.times[0], "2026-03-31T00:00:00.000Z");
  const leap = previewCron("0 0 29 2 *", "UTC", "2096-03-01T00:00:00Z");
  assert.equal(leap.times.length, 10);
  assert.equal(leap.times[0], "2104-02-29T00:00:00.000Z");
});
test("timezone offsets include non-whole hours and invalid zones are rejected", () => {
  assert.equal(
    previewCron("0 9 * * *", "Asia/Jakarta", "2026-10-30T00:00:00Z").times[0],
    "2026-10-30T02:00:00.000Z"
  );
  assert.equal(
    previewCron("0 9 * * *", "Asia/Kolkata", "2026-10-30T00:00:00Z").times[0],
    "2026-10-30T03:30:00.000Z"
  );
  assert.throws(
    () => previewCron("* * * * *", "Invalid/Zone", "2026-01-01T00:00:00Z"),
    /IANA/
  );
});
test("DST spring gap moves forward and repeated fall hour runs once", () => {
  const spring = previewCron(
    "30 2 * * *",
    "America/New_York",
    "2026-03-08T05:00:00Z"
  ).times;
  assert.deepEqual(spring.slice(0, 2), [
    "2026-03-08T07:30:00.000Z",
    "2026-03-09T06:30:00.000Z",
  ]);
  const fall = previewCron(
    "30 1 * * *",
    "America/New_York",
    "2026-11-01T04:00:00Z"
  ).times;
  assert.deepEqual(fall.slice(0, 2), [
    "2026-11-01T05:30:00.000Z",
    "2026-11-02T06:30:00.000Z",
  ]);
});
test("restricted day-of-month and day-of-week match with OR, month still applies", () => {
  const result = previewCron("0 9 1 * 1", "UTC", "2026-12-31T00:00:00Z").times;
  assert.deepEqual(result.slice(0, 3), [
    "2027-01-01T09:00:00.000Z",
    "2027-01-04T09:00:00.000Z",
    "2027-01-11T09:00:00.000Z",
  ]);
  assert.match(describeCron("0 9 1 * 1").summary, /OR/);
  const rescued = previewCron("0 9 30 2 1", "UTC", "2026-02-01T00:00:00Z");
  assert.equal(rescued.times[0], "2026-02-02T09:00:00.000Z");
  assert.equal(
    previewCron("0 0 1 * */1", "UTC", "2026-01-02T00:00:00Z").times[0],
    "2026-01-03T00:00:00.000Z"
  );
});
test("syntactically valid impossible calendars return no executions promptly", () => {
  const start = performance.now();
  for (const expression of ["0 0 30 2 *", "0 0 31 4,6 *"]) {
    assert.ok(validateCron(expression));
    assert.deepEqual(previewCron(expression, "UTC", "2026-01-01T00:00:00Z"), {
      times: [],
      limited: true,
    });
  }
  assert.ok(performance.now() - start < 2000);
});
test("explanations show clock time and readable weekday names", () => {
  assert.match(describeCron("0 9 * * 1-5").summary, /09:00.*Monday.*Friday/);
  assert.match(describeCron("*/5 * * * *").summary, /Every 5 minutes/);
});
