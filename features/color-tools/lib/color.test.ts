import test from "node:test";
import assert from "node:assert/strict";
import { parseColor, colorFormats, contrastRatio } from "./color.ts";
test("parses short and full HEX, RGB percentages and modern RGB syntax", () => {
  assert.deepEqual(parseColor("#AbC"), { r: 170, g: 187, b: 204 });
  assert.equal(colorFormats(parseColor("103e3b")).hex, "#103E3B");
  assert.deepEqual(parseColor("rgb(100%, 0%, 50%)"), { r: 255, g: 0, b: 128 });
  assert.deepEqual(parseColor("rgb(10 20 30)"), { r: 10, g: 20, b: 30 });
});
test("HSL converts primaries, wraps hue, and handles grayscale", () => {
  assert.deepEqual(parseColor("hsl(360, 100%, 50%)"), { r: 255, g: 0, b: 0 });
  assert.deepEqual(parseColor("hsl(-120deg 100% 50%)"), { r: 0, g: 0, b: 255 });
  assert.deepEqual(parseColor("hsl(120, 100%, 50%)"), { r: 0, g: 255, b: 0 });
  assert.equal(colorFormats(parseColor("#ffffff")).hsl, "hsl(0, 0%, 100%)");
  for (const hex of ["#103E3B", "#CBF58C", "#123456"]) {
    const original = parseColor(hex),
      next = parseColor(colorFormats(original).hsl);
    for (const key of ["r", "g", "b"] as const)
      assert.ok(Math.abs(original[key] - next[key]) <= 1);
  }
});
test("rejects out of range components, alpha and invalid CSS color strings", () => {
  for (const input of [
    "red",
    "#ff000080",
    "rgba(0,0,0,.5)",
    "rgb(256,0,0)",
    "rgb(-1,0,0)",
    "hsl(20,101%,50%)",
    "hsl(20,50,50)",
    "rgb(1,2)",
    "rgb(NaN,0,0)",
  ])
    assert.throws(() => parseColor(input), input);
});
test("contrast uses known 21:1 and 1:1 pairs, and is symmetric", () => {
  assert.equal(contrastRatio(parseColor("#000"), parseColor("#fff")), 21);
  assert.equal(contrastRatio(parseColor("#123"), parseColor("#123")), 1);
  const a = parseColor("#103E3B"),
    b = parseColor("#F5F9EF");
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
  assert.ok(contrastRatio(a, b) > 7);
  assert.ok(contrastRatio(parseColor("#777"), parseColor("#fff")) < 4.5);
});
