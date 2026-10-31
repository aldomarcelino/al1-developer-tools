import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";

test("shared components use only layout, ui, and cummon with no nested folders", () => {
  const root = new URL("../components/", import.meta.url);
  const entries = readdirSync(root, { withFileTypes: true });
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ["cummon", "layout", "ui"]);
  for (const entry of entries) {
    assert.ok(entry.isDirectory());
    const children = readdirSync(new URL(`${entry.name}/`, root), {
      withFileTypes: true,
    });
    assert.ok(
      children.every((child) => child.isFile()),
      `${entry.name} must stay flat`
    );
  }
});

test("feature styles stay outside the global CSS entry point", () => {
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(globals, /@import[^;]*features\//);
  const root = new URL("../features/", import.meta.url);
  for (const feature of readdirSync(root)) {
    assert.equal(
      existsSync(new URL(`${feature}/styles.css`, root)),
      false,
      `${feature}: use scoped CSS Modules`
    );
  }
});
