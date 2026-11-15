import test from "node:test";
import assert from "node:assert/strict";
import {
  centeredArea,
  pixelArea,
  pairedDimension,
  fitDimensions,
  ratioPresets,
  shapePresets,
  getShapeSvgPath,
  clipCanvasShape,
  type CropShape,
} from "./geometry.ts";
import { validateDimensions, imageFilename } from "../../../lib/browser/image-codec.ts";

test("every ratio preset produces a centered in-bounds crop in source pixels", () => {
  for (const [w, h] of [
    [4000, 3000],
    [600, 1200],
    [1, 1],
  ])
    for (const preset of ratioPresets) {
      const crop = centeredArea(w, h, preset.ratio),
        px = pixelArea(crop, w, h);
      assert.ok(
        px.x >= 0 &&
          px.y >= 0 &&
          px.x + px.width <= w + 0.001 &&
          px.y + px.height <= h + 0.001
      );
      assert.ok(Math.abs(px.x - (w - px.width) / 2) < 0.001);
      if (preset.ratio) assert.ok(Math.abs(px.width / px.height - preset.ratio) < 0.0001);
    }
});
test("free and custom crops map accurately without rounding away source pixels", () => {
  assert.deepEqual(pixelArea({ x: 25, y: 10, width: 50, height: 40 }, 800, 600), {
    x: 200,
    y: 60,
    width: 400,
    height: 240,
  });
  assert.equal(centeredArea(800, 600, 2).height, (800 / 2 / 600) * 100);
  assert.throws(() => pixelArea({ x: 90, y: 0, width: 20, height: 20 }, 800, 600));
  assert.throws(() => centeredArea(800, 600, -1));
});
test("locked dimensions follow crop ratio; empty fields remain empty", () => {
  assert.equal(pairedDimension("1200", 4 / 6, "width"), "1800");
  assert.equal(pairedDimension("1800", 4 / 6, "height"), "1200");
  assert.equal(pairedDimension("", 1, "width"), "");
});
test("source-sized defaults fit the canvas budget and invalid outputs are rejected", () => {
  for (const [w, h] of [
    [8000, 5000],
    [20000, 300],
    [600, 600],
  ]) {
    const fitted = fitDimensions(w, h);
    validateDimensions(fitted.width, fitted.height);
    assert.ok(fitted.width <= w && fitted.height <= h);
  }
  for (const pair of [
    [0, 100],
    [1.5, 100],
    [9000, 10],
    [5000, 5000],
    [NaN, 20],
  ])
    assert.throws(() => validateDimensions(...(pair as [number, number])));
});
test("encoded filenames preserve stems, sanitize paths, and avoid case-insensitive ZIP collisions", () => {
  const used = new Set<string>();
  assert.equal(imageFilename("Photo.HEIC", "image/jpeg", used), "Photo.jpg");
  assert.equal(imageFilename("photo.heif", "image/jpeg", used), "photo-2.jpg");
  assert.equal(imageFilename("a/b.png", "image/webp"), "a_b.webp");
});

test("raster upload signatures reject renamed SVG and corrupt images", async () => {
  const { validateRasterFile } = await import("../../../lib/browser/image-codec.ts");
  await assert.rejects(validateRasterFile(new File(["<svg></svg>"], "renamed.png")));
  await assert.rejects(validateRasterFile(new File(["broken"], "broken.jpg")));
  await assert.rejects(
    validateRasterFile(new File([new Uint8Array(30 * 1024 * 1024 + 1)], "large.png"))
  );
  await validateRasterFile(new File([new Uint8Array([255, 216, 255, 224])], "photo.jpg"));
});

test("all shape presets provide valid SVG paths", () => {
  assert.equal(shapePresets.length, 7);
  for (const preset of shapePresets) {
    const path = getShapeSvgPath(preset.value);
    assert.ok(typeof path === "string" && path.length > 5);
    assert.ok(path.startsWith("M "));
    assert.ok(path.endsWith("Z"));
  }
  const customRounded = getShapeSvgPath("rounded", 35);
  assert.ok(customRounded.includes("35"));
});

test("clipCanvasShape traces and clips all geometric shapes on canvas", () => {
  const shapes: CropShape[] = [
    "rectangle",
    "circle",
    "rounded",
    "heart",
    "star",
    "hexagon",
    "diamond",
  ];

  for (const s of shapes) {
    let clipped = false;
    let closed = false;
    let began = false;
    const ops: string[] = [];

    const mockCtx = {
      beginPath: () => { began = true; ops.push("beginPath"); },
      moveTo: (x: number, y: number) => { ops.push(`moveTo(${x},${y})`); },
      lineTo: (x: number, y: number) => { ops.push(`lineTo(${x},${y})`); },
      bezierCurveTo: () => { ops.push("bezierCurveTo"); },
      ellipse: () => { ops.push("ellipse"); },
      arcTo: () => { ops.push("arcTo"); },
      roundRect: () => { ops.push("roundRect"); },
      closePath: () => { closed = true; ops.push("closePath"); },
      clip: () => { clipped = true; ops.push("clip"); },
    };

    clipCanvasShape(mockCtx, s, 400, 300, 25);

    if (s === "rectangle") {
      assert.equal(clipped, false);
      assert.equal(ops.length, 0);
    } else {
      assert.equal(began, true, `shape ${s} should call beginPath`);
      assert.equal(closed, true, `shape ${s} should call closePath`);
      assert.equal(clipped, true, `shape ${s} should call clip`);
      assert.ok(ops.length > 2, `shape ${s} should perform path operations`);
    }
  }
});
