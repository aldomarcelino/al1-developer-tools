import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  createImagePdf,
  imagePlacement,
  inspectImage,
  type PdfImage,
} from "./image-pdf.ts";

const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
    "base64"
  )
);
const jpg = new Uint8Array(
  readFileSync(new URL("../../../public/previews/landscape.jpg", import.meta.url))
);
const options = { size: "a4", orientation: "auto", margin: 24 } as const;
function image(bytes: Uint8Array<ArrayBuffer>, name: string): PdfImage {
  return { bytes, name, ...inspectImage(bytes) };
}

test("inspects JPG/PNG signatures and rejects unsupported or oversized dimensions", () => {
  assert.deepEqual(inspectImage(png), { format: "png", width: 1, height: 1 });
  assert.equal(inspectImage(jpg).format, "jpeg");
  assert.throws(() => inspectImage(new Uint8Array([1, 2, 3])), /JPG and PNG/);
  const large = png.slice();
  new DataView(large.buffer).setUint32(16, 12001);
  assert.throws(() => inspectImage(large), /megapixels/);
  assert.throws(
    () => inspectImage(new Uint8Array([255, 216, 255, 224, 0, 80])),
    /Truncated/
  );
});
test("page fitting preserves aspect ratio, margin, and orientation", () => {
  const p = imagePlacement(1600, 1000, options);
  assert.ok(p.pageWidth > p.pageHeight);
  assert.ok(Math.abs(p.width / p.height - 1.6) < 1e-10);
  assert.ok(p.x >= 23.99 && p.y >= 23.99);
  const portrait = imagePlacement(1600, 1000, { ...options, orientation: "portrait" });
  assert.ok(portrait.pageWidth < portrait.pageHeight);
  const native = imagePlacement(800, 600, { ...options, size: "image" });
  assert.equal(native.pageWidth, 648);
  assert.equal(native.pageHeight, 498);
});
test("produces readable mixed-image PDF pages in collection order", async () => {
  const bytes = await createImagePdf(
    [image(png, "small.png"), image(jpg, "landscape.jpg")],
    options
  );
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 2);
  assert.ok(document.getPage(0).getWidth() < document.getPage(0).getHeight());
  assert.ok(document.getPage(1).getWidth() > document.getPage(1).getHeight());
  const letter = await PDFDocument.load(
    await createImagePdf([image(png, "small.png")], {
      size: "letter",
      orientation: "portrait",
      margin: 0,
    })
  );
  assert.equal(letter.getPage(0).getWidth(), 612);
  assert.equal(letter.getPage(0).getHeight(), 792);
});
test("PDF export validates collections and declared image metadata", async () => {
  await assert.rejects(createImagePdf([], options), /1 to 20/);
  await assert.rejects(
    createImagePdf([{ ...image(png, "small.png"), width: 2 }], options),
    /dimensions/
  );
  await assert.rejects(
    createImagePdf(
      Array.from({ length: 21 }, () => image(png, "small.png")),
      options
    ),
    /1 to 20/
  );
});
