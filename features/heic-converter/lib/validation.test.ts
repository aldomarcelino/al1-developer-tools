import test from "node:test";
import assert from "node:assert/strict";
import { hasHeicHeader, validateHeicFile } from "./validation.ts";
test("HEIC validation rejects unsupported, empty and oversized files", () => {
  validateHeicFile({ name: "photo.HEIF", size: 200 });
  for (const file of [
    { name: "a.jpg", size: 100 },
    { name: "a.heic", size: 0 },
    { name: "a.heic", size: 21 * 1024 * 1024 },
  ])
    assert.throws(() => validateHeicFile(file));
});
test("renamed JPGs and AVIF are not accepted as HEIC", async () => {
  for (const brand of ["heic", "heix", "mif1"])
    assert.equal(
      await hasHeicHeader(new Blob([`\x00\x00\x00\x18ftyp${brand}\x00\x00\x00\x00`])),
      true
    );
  for (const content of [
    "not an image",
    "\x00\x00\x00\x18ftypavif",
    "\x00\x00\x00\x18fakeheic",
  ])
    assert.equal(await hasHeicHeader(new Blob([content])), false);
});
