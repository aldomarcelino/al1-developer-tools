import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePdfFile,
  sanitizeBaseFilename,
  generatePageFilename,
  generateZipFilename,
  getScaleFactor,
  getDpiEstimate,
  getMimeType,
  getFileExtension,
  formatFileSize,
  packagePagesAsZip,
  type RenderedPage,
} from "./pdf-to-image.ts";
import { tools } from "../../../config/tools.ts";
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("validates PDF file format and size limits", () => {
  assert.equal(
    validatePdfFile({ name: "document.pdf", size: 1024 * 100 }).valid,
    true
  );
  assert.equal(
    validatePdfFile({ name: "REPORT.PDF", size: 1024 * 500 }).valid,
    true
  );

  // Reject non-PDF
  const notPdf = validatePdfFile({ name: "document.docx", size: 1024 });
  assert.equal(notPdf.valid, false);
  assert.match(notPdf.error ?? "", /valid PDF file/);

  // Reject empty file
  const emptyPdf = validatePdfFile({ name: "empty.pdf", size: 0 });
  assert.equal(emptyPdf.valid, false);
  assert.match(emptyPdf.error ?? "", /empty/);

  // Reject oversized file (> 50 MB)
  const oversized = validatePdfFile({
    name: "huge.pdf",
    size: 51 * 1024 * 1024,
  });
  assert.equal(oversized.valid, false);
  assert.match(oversized.error ?? "", /50 MB/);
});

test("sanitizes base filename and formats page/zip filenames cleanly", () => {
  assert.equal(sanitizeBaseFilename("Annual Report 2026.pdf"), "Annual-Report-2026");
  assert.equal(sanitizeBaseFilename("clean-doc.pdf"), "clean-doc");
  assert.equal(sanitizeBaseFilename("special$@#characters!.pdf"), "specialcharacters");
  assert.equal(sanitizeBaseFilename(".pdf"), "document");

  // Single digit padding for < 10 pages
  assert.equal(
    generatePageFilename("guide", 1, 5, "jpg"),
    "guide-page-1.jpg"
  );
  // Two digit padding for 10-99 pages
  assert.equal(
    generatePageFilename("guide", 3, 25, "png"),
    "guide-page-03.png"
  );
  assert.equal(
    generatePageFilename("guide", 25, 25, "webp"),
    "guide-page-25.webp"
  );
  // Three digit padding for 100+ pages
  assert.equal(
    generatePageFilename("guide", 7, 100, "jpg"),
    "guide-page-007.jpg"
  );

  assert.equal(generateZipFilename("guide"), "guide-images.zip");
});

test("calculates scale factors, DPI estimates, and mime types correctly", () => {
  assert.equal(getScaleFactor("1"), 1.0);
  assert.equal(getScaleFactor("2"), 2.0);
  assert.equal(getScaleFactor("3"), 3.0);

  assert.equal(getDpiEstimate("1"), 72);
  assert.equal(getDpiEstimate("2"), 144);
  assert.equal(getDpiEstimate("3"), 216);

  assert.equal(getMimeType("jpg"), "image/jpeg");
  assert.equal(getMimeType("png"), "image/png");
  assert.equal(getMimeType("webp"), "image/webp");

  assert.equal(getFileExtension("jpg"), "jpg");
  assert.equal(getFileExtension("png"), "png");
  assert.equal(getFileExtension("webp"), "webp");
});

test("formats file sizes legibly", () => {
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(1500 * 1024), "1.46 MB");
});

test("packages rendered pages into a valid non-empty ZIP archive", async () => {
  const dummyBlob1 = new Blob(["page 1 dummy image content"], {
    type: "image/jpeg",
  });
  const dummyBlob2 = new Blob(["page 2 dummy image content"], {
    type: "image/jpeg",
  });

  const mockPages: RenderedPage[] = [
    {
      pageIndex: 0,
      pageNumber: 1,
      width: 800,
      height: 1100,
      blob: dummyBlob1,
      previewUrl: "blob:http://localhost/1",
      filename: "test-page-1.jpg",
      size: dummyBlob1.size,
    },
    {
      pageIndex: 1,
      pageNumber: 2,
      width: 800,
      height: 1100,
      blob: dummyBlob2,
      previewUrl: "blob:http://localhost/2",
      filename: "test-page-2.jpg",
      size: dummyBlob2.size,
    },
  ];

  const zipBytes = await packagePagesAsZip(mockPages);
  assert.ok(zipBytes instanceof Uint8Array);
  assert.ok(zipBytes.length > 50);

  // ZIP header starts with PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);
});

test("pdf-to-image is properly registered in tools catalog, icons, and SEO without em-dash", () => {
  const tool = tools.find((t) => t.slug === "pdf-to-image");
  assert.ok(tool, "pdf-to-image must be present in tools catalog");
  assert.equal(tool.status, "available");
  assert.equal(tool.category, "Documents");
  assert.equal(tool.icon, "pdfimages");

  // Icon registered
  const iconComponent = toolIcons[tool.icon];
  assert.ok(iconComponent, "pdfimages icon must resolve in toolIcons");

  // SEO metadata
  const seo = toolSeo["pdf-to-image"];
  assert.ok(seo, "pdf-to-image must have an entry in toolSeo");
  assert.ok(seo.title.includes("PDF to Image"));
  assert.ok(seo.description.includes("JPG, PNG, or WebP"));

  // Check no em-dash character (U+2014) in tool copy
  const emDashRegex = /\u2014/;
  assert.doesNotMatch(tool.name, emDashRegex, "Tool name must not contain em-dash");
  assert.doesNotMatch(tool.description, emDashRegex, "Tool description must not contain em-dash");
  assert.doesNotMatch(seo.title, emDashRegex, "SEO title must not contain em-dash");
  assert.doesNotMatch(seo.description, emDashRegex, "SEO description must not contain em-dash");
  assert.doesNotMatch(seo.note, emDashRegex, "SEO note must not contain em-dash");
});
