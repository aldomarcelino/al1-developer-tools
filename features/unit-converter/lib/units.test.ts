import test from "node:test";
import assert from "node:assert/strict";
import { convertUnit, formatUnitValue, units, type Category } from "./units.ts";
const close = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
    `${actual} != ${expected}`
  );
test("common length, weight and area factors and reversible negative displacement", () => {
  assert.equal(convertUnit("1.25", "length", "km", "m"), 1250);
  close(convertUnit("-12", "length", "in", "ft"), -1);
  close(convertUnit("2.5", "weight", "lb", "kg"), 1.133980925);
  close(convertUnit("1", "area", "acre", "m2"), 4046.8564224);
  assert.equal(convertUnit("1", "area", "ha", "m2"), 10000);
  for (const category of Object.keys(units) as Category[])
    for (const from of units[category])
      for (const to of units[category]) {
        const forward = convertUnit("42.125", category, from.value, to.value);
        close(convertUnit(String(forward), category, to.value, from.value), 42.125);
      }
});
test("temperature uses offsets as well as scales and rejects below absolute zero", () => {
  assert.equal(convertUnit("0", "temperature", "C", "F"), 32);
  close(convertUnit("212", "temperature", "F", "C"), 100);
  close(convertUnit("-40", "temperature", "C", "F"), -40);
  assert.equal(convertUnit("-273.15", "temperature", "C", "K"), 0);
  close(convertUnit("0", "temperature", "K", "F"), -459.67);
  close(convertUnit("-459.67", "temperature", "F", "K"), 0);
  for (const [value, from] of [
    ["-0.01", "K"],
    ["-273.151", "C"],
    ["-459.671", "F"],
  ])
    assert.throws(() => convertUnit(value, "temperature", from, "C"), /absolute zero/);
});
test("decimal bytes and binary bytes remain distinct", () => {
  assert.equal(convertUnit("1", "data", "KB", "B"), 1000);
  assert.equal(convertUnit("1", "data", "KiB", "B"), 1024);
  assert.equal(convertUnit("1", "data", "GB", "MB"), 1000);
  assert.equal(convertUnit("1", "data", "GiB", "MiB"), 1024);
  close(convertUnit("1", "data", "MiB", "MB"), 1.048576);
  assert.equal(convertUnit("0.5", "data", "KiB", "B"), 512);
});
test("invalid input, mismatched units, overflow and underflow have actionable errors", () => {
  for (const input of ["", " ", "abc", "Infinity", "NaN", "1,000", "0x10", "2.3.4"])
    assert.throws(() => convertUnit(input, "length", "m", "km"));
  assert.throws(() => convertUnit("1e309", "length", "m", "km"), /range/);
  assert.throws(() => convertUnit("1e308", "length", "km", "mm"), /range/);
  assert.throws(() => convertUnit("1e-324", "length", "m", "km"), /small/);
  assert.throws(() => convertUnit("5e-324", "length", "mm", "km"), /small/);
  assert.throws(() => convertUnit("1", "weight", "m", "kg"), /same category/);
  for (const category of ["weight", "area", "data"] as Category[])
    assert.throws(
      () =>
        convertUnit("-1", category, units[category][0].value, units[category][1].value),
      /non-negative/
    );
  assert.equal(convertUnit("0", "data", "MiB", "B"), 0);
  assert.equal(convertUnit("1e308", "length", "m", "m"), 1e308);
});
test("formatting keeps small numbers readable without losing them to zero", () => {
  assert.equal(formatUnitValue(1000), "1,000");
  assert.notEqual(formatUnitValue(1e-14), "0");
  assert.equal(String(convertUnit("1", "length", "m", "ft")), "3.280839895013123");
});
