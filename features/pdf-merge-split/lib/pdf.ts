import type { PDFDocument } from "pdf-lib";
export const pdfLimits = {
  files: 10,
  totalBytes: 50 * 1024 * 1024,
  fileBytes: 25 * 1024 * 1024,
  pages: 300,
  splitPages: 100,
  splitBytes: 100 * 1024 * 1024,
};
export interface LoadedPdf {
  id: string;
  name: string;
  document: PDFDocument;
}
export interface PdfPageRef {
  sourceId: string;
  pageIndex: number;
}
export function parsePageRange(value: string, count: number): Set<number> {
  if (!value.trim()) throw new Error("Enter a page range, such as 1-3, 5.");
  const pages = new Set<number>();
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match)
      throw new Error("Use page numbers and ranges separated by commas, such as 1-3, 5.");
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > count)
      throw new Error(`Page ranges must run from 1 to ${count}, in ascending order.`);
    for (let index = start - 1; index < end; index++) pages.add(index);
  }
  return pages;
}
export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocument> {
  const { PDFDocument, PDFName, PDFArray } = await import("pdf-lib");
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, {
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message))
      throw new Error(
        "Password-protected or encrypted PDFs are not supported. Use an unlocked PDF."
      );
    throw new Error(
      "This file could not be read as a PDF. It may be damaged or unsupported."
    );
  }
  if (!document.getPageCount()) throw new Error("The PDF does not contain any pages.");
  if (document.getPageCount() > pdfLimits.pages)
    throw new Error("Use a PDF with no more than 300 pages.");
  const permissions = document.catalog.get(PDFName.of("Perms"));
  const hasWidgets = document.getPages().some((page) => {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    return annotations?.asArray().some((ref) => {
      const annotation = document.context.lookup(ref);
      return (
        annotation &&
        "get" in annotation &&
        typeof annotation.get === "function" &&
        annotation.get(PDFName.of("Subtype"))?.toString() === "/Widget"
      );
    });
  });
  if (permissions || hasWidgets || document.getForm().getFields().length)
    throw new Error(
      "Interactive forms and digitally signed PDFs are not supported. Use a static, unsigned document."
    );
  return document;
}
export async function combinePages(
  sources: LoadedPdf[],
  pages: PdfPageRef[]
): Promise<Uint8Array<ArrayBuffer>> {
  if (!pages.length) throw new Error("Select at least one page.");
  if (pages.length > pdfLimits.pages) throw new Error("Select no more than 300 pages.");
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  const documents = new Map(sources.map((source) => [source.id, source.document]));
  // Copy each source's selected pages in one batch so shared images/fonts stay shared.
  const copies = new Map<string, Awaited<ReturnType<PDFDocument["copyPages"]>>>();
  for (const [id, document] of documents) {
    const selected = pages.filter((page) => page.sourceId === id);
    if (
      selected.some(
        (page) =>
          !Number.isInteger(page.pageIndex) ||
          page.pageIndex < 0 ||
          page.pageIndex >= document.getPageCount()
      )
    )
      throw new Error("A selected page does not exist.");
    if (selected.length)
      copies.set(
        id,
        await output.copyPages(
          document,
          selected.map((page) => page.pageIndex)
        )
      );
  }
  const used = new Map<string, number>();
  for (const page of pages) {
    const index = used.get(page.sourceId) ?? 0;
    const copied = copies.get(page.sourceId)?.[index];
    if (!copied) throw new Error("A source PDF is no longer available. Load it again.");
    output.addPage(copied);
    used.set(page.sourceId, index + 1);
  }
  output.setCreator("Ramupod");
  output.setProducer("Ramupod · PDF Merge & Split");
  return new Uint8Array(await output.save());
}
export async function splitPages(
  sources: LoadedPdf[],
  pages: PdfPageRef[]
): Promise<{ name: string; bytes: Uint8Array<ArrayBuffer> }[]> {
  if (!pages.length || pages.length > pdfLimits.splitPages)
    throw new Error("Select between 1 and 100 pages to split into a ZIP.");
  const files: { name: string; bytes: Uint8Array<ArrayBuffer> }[] = [];
  let total = 0;
  for (const [index, page] of pages.entries()) {
    const source = sources.find((source) => source.id === page.sourceId);
    if (!source) throw new Error("A source PDF is no longer available.");
    const bytes = await combinePages([source], [page]);
    total += bytes.byteLength;
    if (total > pdfLimits.splitBytes)
      throw new Error("The split output exceeds 100 MB. Select fewer pages.");
    const name =
      source.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60) || "document";
    files.push({
      name: `${String(index + 1).padStart(3, "0")}-${name}-page-${page.pageIndex + 1}.pdf`,
      bytes,
    });
  }
  return files;
}
