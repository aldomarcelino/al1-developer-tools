import test from "node:test";
import assert from "node:assert/strict";
import { encodeImageToJxl } from "./jxl.ts";

test("encodeImageToJxl produces valid JXL codestream bytes", async () => {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 120; // R
    data[i + 1] = 200; // G
    data[i + 2] = 80; // B
    data[i + 3] = 255; // A
  }

  const blob = await encodeImageToJxl({ data, width, height }, { quality: 75 });
  assert.equal(blob.type, "image/jxl");
  assert.ok(blob.size > 0, "Output blob should not be empty");

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // JPEG XL signature: 0xFF 0x0A (codestream) or 0x00 0x00 0x00 0x0C (container box)
  const isCodestream = bytes[0] === 0xff && bytes[1] === 0x0a;
  const isBoxContainer =
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x0c &&
    bytes[4] === 0x4a && // J
    bytes[5] === 0x58 && // X
    bytes[6] === 0x4c; // L
  assert.ok(
    isCodestream || isBoxContainer,
    "Output must have valid JPEG XL signature"
  );
});

test("encodeImageToJxl supports lossless option", async () => {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(200);

  const blob = await encodeImageToJxl({ data, width, height }, { lossless: true });
  assert.equal(blob.type, "image/jxl");
  assert.ok(blob.size > 0);
});
