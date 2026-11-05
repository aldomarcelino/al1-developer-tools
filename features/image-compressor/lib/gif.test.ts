import test from "node:test";
import assert from "node:assert/strict";
import { GifWriter, GifReader } from "omggif";
import {
  isGifBuffer,
  qualityToMaxColors,
  quantizeFrame,
  compressGif,
} from "./gif.ts";

test("qualityToMaxColors maps 1-100 to valid GIF palette sizes", () => {
  assert.equal(qualityToMaxColors(100), 256);
  assert.equal(qualityToMaxColors(90), 256);
  assert.equal(qualityToMaxColors(80), 128);
  assert.equal(qualityToMaxColors(65), 64);
  assert.equal(qualityToMaxColors(50), 32);
  assert.equal(qualityToMaxColors(20), 16);
  assert.equal(qualityToMaxColors(1), 16);
});

test("isGifBuffer correctly identifies GIF headers", () => {
  const gif89a = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]);
  const gif87a = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const short = new Uint8Array([0x47, 0x49]);

  assert.equal(isGifBuffer(gif89a), true);
  assert.equal(isGifBuffer(gif87a), true);
  assert.equal(isGifBuffer(png), false);
  assert.equal(isGifBuffer(short), false);
});

test("quantizeFrame produces a power-of-2 palette and valid indexed array", () => {
  const width = 20;
  const height = 15;
  const rgba = new Uint8ClampedArray(width * height * 4);

  // Fill with gradients and a few transparent pixels
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = (i * 3) % 256;
    rgba[i + 1] = (i * 7) % 256;
    rgba[i + 2] = (i * 11) % 256;
    rgba[i + 3] = i < 40 ? 0 : 255; // First 10 pixels transparent
  }

  const result = quantizeFrame(rgba, width, height, 64, 0.5);

  assert.equal(result.transIndex, 0);
  assert.equal(result.indexed.length, width * height);

  // Check palette size is power of 2
  const pLen = result.palette.length;
  assert.ok(pLen >= 2 && pLen <= 256);
  assert.equal(pLen & (pLen - 1), 0, "Palette length must be power of 2");

  // Every index must be valid
  for (let i = 0; i < result.indexed.length; i++) {
    const idx = result.indexed[i];
    assert.ok(idx >= 0 && idx < pLen);
  }

  // First 10 pixels must be transparent index 0
  for (let i = 0; i < 10; i++) {
    assert.equal(result.indexed[i], 0);
  }
});

test("compressGif processes animated GIF frames and preserves animation timing and loops", async () => {
  // Create an animated 2-frame test GIF in memory
  const width = 16;
  const height = 16;
  const rawBuf = new Uint8Array(4096);
  const writer = new GifWriter(rawBuf, width, height, { loop: 0 });

  const palette = [0x000000, 0xff0000, 0x00ff00, 0x0000ff];
  const frame1 = new Uint8Array(width * height);
  frame1.fill(1); // Red
  writer.addFrame(0, 0, width, height, frame1 as unknown as number[], {
    palette,
    delay: 25,
  });

  const frame2 = new Uint8Array(width * height);
  frame2.fill(2); // Green
  writer.addFrame(0, 0, width, height, frame2 as unknown as number[], {
    palette,
    delay: 35,
  });

  const len = writer.end();
  const sampleGifBuffer = rawBuf.buffer.slice(0, len);

  // Compress the animated GIF (same dimensions, quality 80 -> 128 colors)
  const compressedBlob = await compressGif(sampleGifBuffer, width, height, 80);

  assert.equal(compressedBlob.type, "image/gif");
  assert.ok(compressedBlob.size > 0);

  const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());
  assert.equal(isGifBuffer(compressedBytes), true);

  const reader = new GifReader(compressedBytes);
  assert.equal(reader.numFrames(), 2);
  assert.equal(reader.width, width);
  assert.equal(reader.height, height);
  assert.equal(reader.loopCount(), 0);

  const f0 = reader.frameInfo(0);
  const f1 = reader.frameInfo(1);
  assert.equal(f0.delay, 25);
  assert.equal(f1.delay, 35);
});
