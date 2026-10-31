import test from "node:test";
import assert from "node:assert/strict";
import { viewRect, sourcePoint, newScene } from "./studio-scene.ts";
test("zoom view never goes outside the screen, including edge focus points", () => {
  for (const zoom of [1, 1.5, 2, 3])
    for (const p of [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]) {
      const v = viewRect(zoom, p);
      assert.ok(v.x >= 0 && v.y >= 0);
      assert.ok(v.x + v.size <= 1 && v.y + v.size <= 1);
      const a = sourcePoint({ x: 0, y: 0 }, v),
        b = sourcePoint({ x: 1, y: 1 }, v);
      assert.equal(a.x, v.x);
      assert.equal(b.y, v.y + v.size);
    }
});
test("pointer coordinates invert the actual composed view instead of CSS zoom", () => {
  assert.deepEqual(sourcePoint({ x: 0.5, y: 0.5 }, viewRect(2, { x: 0.75, y: 0.25 })), {
    x: 0.75,
    y: 0.25,
  });
  assert.deepEqual(sourcePoint({ x: 1, y: 1 }, viewRect(1, { x: 0.2, y: 0.2 })), {
    x: 1,
    y: 1,
  });
});
test("each composition starts with isolated effect buffers", () => {
  const a = newScene(),
    b = newScene();
  a.annotations.push({
    tool: "text",
    points: [{ x: 0.5, y: 0.5 }],
    text: "Demo",
    color: "#fff",
    stroke: 4,
  });
  a.zoom = 3;
  assert.equal(b.annotations.length, 0);
  assert.equal(b.zoom, 1);
  assert.equal(b.clickHighlights, true);
});
