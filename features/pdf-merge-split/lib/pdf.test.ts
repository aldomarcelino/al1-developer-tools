import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";
import { parsePageRange, loadPdf, combinePages, splitPages } from "./pdf.ts";
async function source(id: string, widths: number[]) {
  const document = await PDFDocument.create();
  for (const width of widths) document.addPage([width, 300]);
  const bytes = await document.save();
  return { id, name: `${id}.pdf`, document: await loadPdf(new Uint8Array(bytes).buffer) };
}
test("page ranges validate bounds, deduplicate, and preserve the displayed order", () => {
  assert.deepEqual([...parsePageRange("1-3, 2, 5", 5)], [0, 1, 2, 4]);
  for (const value of ["", "0", "3-1", "1-9999999999", "x", "1,", "6"])
    assert.throws(() => parsePageRange(value, 5), value);
});
test("merge preserves selected source pages in the requested order", async () => {
  const a = await source("first", [200, 210]),
    b = await source("second", [220]);
  const output = await combinePages(
    [a, b],
    [
      { sourceId: b.id, pageIndex: 0 },
      { sourceId: a.id, pageIndex: 1 },
      { sourceId: a.id, pageIndex: 0 },
    ]
  );
  const document = await PDFDocument.load(output);
  assert.deepEqual(
    document.getPages().map((page) => page.getWidth()),
    [220, 210, 200]
  );
  assert.equal(document.getCreator(), "Ramupod");
  await assert.rejects(combinePages([a], []));
  await assert.rejects(combinePages([a], [{ sourceId: a.id, pageIndex: 99 }]));
  await assert.rejects(combinePages([a], [{ sourceId: "missing", pageIndex: 0 }]));
});
test("split creates one-page PDFs with deterministic safe filenames", async () => {
  const a = await source("first", [200, 210]);
  const files = await splitPages(
    [{ ...a, name: "../../my document.pdf" }],
    [
      { sourceId: a.id, pageIndex: 1 },
      { sourceId: a.id, pageIndex: 0 },
    ]
  );
  assert.equal(files.length, 2);
  assert.ok(files.every((file) => !/[\\/]/.test(file.name)));
  assert.equal((await PDFDocument.load(files[0].bytes)).getPage(0).getWidth(), 210);
  assert.equal((await PDFDocument.load(files[1].bytes)).getPageCount(), 1);
  await assert.rejects(splitPages([a], []));
});
test("rejects malformed files, empty PDFs, forms and orphaned widgets", async () => {
  await assert.rejects(
    loadPdf(new TextEncoder().encode("not a pdf").buffer),
    /could not be read/
  );
  const empty = await PDFDocument.create();
  await assert.rejects(
    loadPdf(new Uint8Array(await empty.save({ addDefaultPage: false })).buffer),
    /does not contain/
  );
  const form = await PDFDocument.create();
  const page = form.addPage();
  form.getForm().createTextField("name").addToPage(page);
  await assert.rejects(
    loadPdf(new Uint8Array(await form.save()).buffer),
    /forms and digitally signed/
  );
  const orphan = await PDFDocument.create();
  const orphanPage = orphan.addPage();
  const widget = orphan.context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Widget"),
    Rect: [0, 0, 20, 20],
  }) as PDFDict;
  orphanPage.node.set(
    PDFName.of("Annots"),
    orphan.context.obj([orphan.context.register(widget)]) as PDFArray
  );
  await assert.rejects(
    loadPdf(new Uint8Array(await orphan.save()).buffer),
    /forms and digitally signed/
  );
});
