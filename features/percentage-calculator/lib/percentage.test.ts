import test from "node:test";
import assert from "node:assert/strict";
import { calculatePercentage } from "./percentage.ts";
test("calculates percentage, ratio, discount and both change directions", () => {
  assert.equal(calculatePercentage("of", "20", "250").value, 50);
  assert.equal(calculatePercentage("ratio", "25", "200").value, 12.5);
  assert.equal(calculatePercentage("change", "100", "125").value, 25);
  assert.equal(calculatePercentage("change", "100", "75").value, -25);
  assert.equal(calculatePercentage("discount", "200", "25").value, 150);
  assert.equal(calculatePercentage("discount", "200", "100").value, 0);
  assert.equal(calculatePercentage("of", "0", "250").value, 0);
});
test("rejects empty, non-finite, undefined ratios and invalid discounts", () => {
  assert.throws(() => calculatePercentage("of", "", "25"));
  assert.throws(() => calculatePercentage("of", "Infinity", "25"));
  assert.throws(() => calculatePercentage("ratio", "10", "0"));
  assert.throws(() => calculatePercentage("change", "0", "10"));
  assert.throws(() => calculatePercentage("change", "-20", "10"));
  assert.throws(() => calculatePercentage("discount", "100", "101"));
  assert.throws(() => calculatePercentage("discount", "-1", "20"));
});
