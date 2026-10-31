import test from "node:test";
import assert from "node:assert/strict";
import { createZip } from "./zip.ts";
test("ZIP stores UTF-8 filenames, bytes, CRC and correct central-directory offsets", () => {
  const bytes = new TextEncoder().encode("123456789");
  const zip = createZip([
    { name: "山.webp", bytes },
    { name: "empty.png", bytes: new Uint8Array() },
  ]);
  const view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(6, true), 0x0800);
  assert.equal(view.getUint32(14, true), 0xcbf43926); // Known CRC32 vector.
  const nameLength = view.getUint16(26, true);
  assert.equal(new TextDecoder().decode(zip.slice(30, 30 + nameLength)), "山.webp");
  assert.deepEqual(zip.slice(30 + nameLength, 30 + nameLength + bytes.length), bytes);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  const central = view.getUint32(end + 16, true);
  assert.equal(view.getUint32(central, true), 0x02014b50);
  assert.equal(view.getUint32(central + 42, true), 0);
  const second = central + 46 + nameLength;
  assert.equal(view.getUint32(second + 42, true), 30 + nameLength + bytes.length);
});
test("ZIP rejects empty archives and path traversal filenames", () => {
  assert.throws(() => createZip([]));
  assert.throws(() => createZip([{ name: "../x.png", bytes: new Uint8Array() }]));
});
