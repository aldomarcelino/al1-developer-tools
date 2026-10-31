import test from "node:test";
import assert from "node:assert/strict";
import { fitImage } from "./image-tools.ts";

test("image resize preserves ratio, never enlarges and never yields a zero dimension", () => {
  assert.deepEqual(fitImage(4000, 3000, 1920), { width: 1920, height: 1440 });
  assert.deepEqual(fitImage(400, 300, 1920), { width: 400, height: 300 });
  assert.deepEqual(fitImage(12000, 1, 1), { width: 1, height: 1 });
  assert.throws(() => fitImage(400, 300, NaN));
});
