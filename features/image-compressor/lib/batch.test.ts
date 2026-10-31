import test from "node:test";
import assert from "node:assert/strict";
import { outputDimensions, outputFileName, type ExportSettings } from "./batch.ts";
const settings: ExportSettings = {
  format: "image/webp",
  quality: 80,
  scaleMode: "75",
  width: "",
  height: "",
  lockAspectRatio: true,
};
test("batch percentage resize uses each image's own dimensions", () => {
  assert.deepEqual(outputDimensions(1600, 1000, settings), { width: 1200, height: 750 });
  assert.deepEqual(outputDimensions(400, 800, settings), { width: 300, height: 600 });
  assert.deepEqual(outputDimensions(1, 1, settings), { width: 1, height: 1 });
});
test("custom bounds fit different aspect ratios without enlarging when locked", () => {
  const custom = {
    ...settings,
    scaleMode: "custom" as const,
    width: "1000",
    height: "1000",
  };
  assert.deepEqual(outputDimensions(2000, 1000, custom), { width: 1000, height: 500 });
  assert.deepEqual(outputDimensions(500, 1000, custom), { width: 500, height: 1000 });
  assert.deepEqual(outputDimensions(200, 100, custom), { width: 200, height: 100 });
  assert.deepEqual(outputDimensions(2000, 1000, { ...custom, lockAspectRatio: false }), {
    width: 1000,
    height: 1000,
  });
  assert.throws(() => outputDimensions(100, 100, { ...custom, width: "nope" }));
  assert.throws(() =>
    outputDimensions(100, 100, {
      ...custom,
      width: "12000",
      height: "12000",
      lockAspectRatio: false,
    })
  );
});
test("batch outputs are unique even when inputs have identical stems or case", () => {
  const used = new Set<string>();
  assert.equal(outputFileName("photo.jpg", "image/webp", used), "photo-compressed.webp");
  assert.equal(
    outputFileName("photo.png", "image/webp", used),
    "photo-compressed-2.webp"
  );
  assert.equal(
    outputFileName("PHOTO.jpg", "image/webp", used),
    "PHOTO-compressed-3.webp"
  );
  assert.equal(
    outputFileName("../photo.jpg", "image/jpeg", used),
    ".._photo-compressed.jpg"
  );
});
