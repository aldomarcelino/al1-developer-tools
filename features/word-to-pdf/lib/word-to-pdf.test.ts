import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWordFile,
  validateDocxFile,
  sanitizeOutputFilename,
  getPageDimensions,
  formatFileSize,
  isZipDocument,
  extractDocText,
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  MARGIN_OPTIONS,
} from "./word-to-pdf.ts";
import { tools } from "../../../config/tools.ts";
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("validates DOCX and DOC file formats and size limits", () => {
  // Valid .docx
  assert.equal(
    validateWordFile({ name: "document.docx", size: 1024 * 50 }).valid,
    true
  );
  assert.equal(
    validateWordFile({ name: "REPORT.DOCX", size: 1024 * 500 }).valid,
    true
  );

  // Valid .doc
  assert.equal(
    validateWordFile({ name: "legacy-document.doc", size: 1024 * 100 }).valid,
    true
  );
  assert.equal(
    validateWordFile({ name: "SURAT-RESMI.DOC", size: 1024 * 200 }).valid,
    true
  );

  // Reject non-Word files
  const notWord = validateWordFile({ name: "document.pdf", size: 1024 });
  assert.equal(notWord.valid, false);
  assert.match(notWord.error ?? "", /valid Word document/);

  const excelFile = validateWordFile({ name: "data.xlsx", size: 1024 });
  assert.equal(excelFile.valid, false);

  // Reject empty file
  const emptyFile = validateWordFile({ name: "empty.doc", size: 0 });
  assert.equal(emptyFile.valid, false);
  assert.match(emptyFile.error ?? "", /empty/);

  // Reject oversized file (> 25 MB)
  const oversized = validateWordFile({
    name: "huge.docx",
    size: 26 * 1024 * 1024,
  });
  assert.equal(oversized.valid, false);
  assert.match(oversized.error ?? "", /25 MB/);

  // Alias validateDocxFile should also work identically
  assert.equal(
    validateDocxFile({ name: "contract.doc", size: 1024 * 80 }).valid,
    true
  );
});

test("sanitizes output filename to pdf cleanly for both docx and doc", () => {
  assert.equal(sanitizeOutputFilename("laporan.docx"), "laporan.pdf");
  assert.equal(sanitizeOutputFilename("laporan.doc"), "laporan.pdf");
  assert.equal(
    sanitizeOutputFilename("Laporan Tahunan 2026.doc"),
    "Laporan-Tahunan-2026.pdf"
  );
  assert.equal(
    sanitizeOutputFilename("Laporan Tahunan 2026.docx"),
    "Laporan-Tahunan-2026.pdf"
  );
  assert.equal(
    sanitizeOutputFilename("report.final.doc"),
    "report.final.pdf"
  );
  assert.equal(
    sanitizeOutputFilename("special$#@chars.doc"),
    "specialchars.pdf"
  );
  assert.equal(sanitizeOutputFilename(".doc"), "document.pdf");
  assert.equal(sanitizeOutputFilename(".docx"), "document.pdf");
});

test("detects ZIP DOCX archives correctly", () => {
  const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
  assert.equal(isZipDocument(zipHeader), true);

  const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  assert.equal(isZipDocument(oleHeader), false);
});

test("extracts text from OLE2 binary .doc and RTF buffers", () => {
  // Test RTF format .doc
  const rtfText = "{\\rtf1\\ansi This is a test RTF document from Word.\\par Next paragraph.}";
  const rtfBuffer = new TextEncoder().encode(rtfText).buffer;
  const extractedRtf = extractDocText(rtfBuffer);
  assert.ok(extractedRtf.includes("This is a test RTF document from Word."));

  // Test synthetic OLE2 WordDocument structure
  const sectorSize = 512;
  const buf = new Uint8Array(sectorSize * 4);
  const view = new DataView(buf.buffer);

  // OLE2 Magic
  const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  magic.forEach((b, i) => {
    buf[i] = b;
  });
  view.setUint16(30, 9, true); // sector shift 9 -> 512
  view.setUint32(44, 1, true); // 1 FAT sector
  view.setUint32(48, 1, true); // dir start sector 1
  view.setUint32(76, 0, true); // FAT at sector 0

  // Sector 0: FAT
  const fatView = new DataView(buf.buffer, sectorSize);
  fatView.setUint32(0, 0xfffffffd, true); // FAT
  fatView.setUint32(4, 0xfffffffe, true); // DIR EOF
  fatView.setUint32(8, 0xfffffffe, true); // Stream EOF

  // Sector 1: DIR Entry for WordDocument
  const dirOffset = sectorSize * 2 + 128;
  const dirView = new DataView(buf.buffer, dirOffset);
  const name = "WordDocument";
  for (let i = 0; i < name.length; i++) {
    buf[dirOffset + i * 2] = name.charCodeAt(i);
  }
  dirView.setUint16(64, (name.length + 1) * 2, true);
  buf[dirOffset + 66] = 2; // Stream type
  dirView.setUint32(116, 2, true); // Starting sector 2
  dirView.setUint32(120, 200, true); // Size

  // Sector 2: WordDocument Stream content in UTF-16LE
  const streamOffset = sectorSize * 3;
  const sampleDocText = "Ramupod Word to PDF Legacy Converter";
  for (let i = 0; i < sampleDocText.length; i++) {
    buf[streamOffset + i * 2] = sampleDocText.charCodeAt(i);
  }

  const extractedDoc = extractDocText(buf.buffer);
  assert.ok(
    extractedDoc.includes("Ramupod Word to PDF Legacy Converter"),
    "Should extract text from binary OLE2 doc"
  );
});

test("calculates page dimensions for all sizes and orientations", () => {
  const a4P = getPageDimensions("a4", "portrait");
  assert.equal(a4P.width, 595.28);
  assert.equal(a4P.height, 841.89);

  const a4L = getPageDimensions("a4", "landscape");
  assert.equal(a4L.width, 841.89);
  assert.equal(a4L.height, 595.28);

  const letterP = getPageDimensions("letter", "portrait");
  assert.equal(letterP.width, 612.0);
  assert.equal(letterP.height, 792.0);

  const letterL = getPageDimensions("letter", "landscape");
  assert.equal(letterL.width, 792.0);
  assert.equal(letterL.height, 612.0);

  const legalP = getPageDimensions("legal", "portrait");
  assert.equal(legalP.width, 612.0);
  assert.equal(legalP.height, 1008.0);

  const legalL = getPageDimensions("legal", "landscape");
  assert.equal(legalL.width, 1008.0);
  assert.equal(legalL.height, 612.0);
});

test("formats file sizes legibly", () => {
  assert.equal(formatFileSize(500), "500 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(3 * 1024 * 1024), "3.00 MB");
});

test("word-to-pdf is properly registered in tools catalog, icons, and SEO without em-dash", () => {
  const tool = tools.find((t) => t.slug === "word-to-pdf");
  assert.ok(tool, "word-to-pdf must be present in tools catalog");
  assert.equal(tool.status, "available");
  assert.equal(tool.category, "Documents");
  assert.equal(tool.icon, "wordpdf");

  // Icon registered
  const iconComponent = toolIcons[tool.icon];
  assert.ok(iconComponent, "wordpdf icon must resolve in toolIcons");

  // SEO metadata
  const seo = toolSeo["word-to-pdf"];
  assert.ok(seo, "word-to-pdf must have an entry in toolSeo");
  assert.ok(seo.title.includes("Word to PDF"));
  assert.ok(seo.description.includes("DOCX and DOC"));

  // Check no em-dash character (U+2014) in tool copy
  const emDashRegex = /\u2014/;
  assert.doesNotMatch(tool.name, emDashRegex, "Tool name must not contain em-dash");
  assert.doesNotMatch(
    tool.description,
    emDashRegex,
    "Tool description must not contain em-dash"
  );
  assert.doesNotMatch(seo.title, emDashRegex, "SEO title must not contain em-dash");
  assert.doesNotMatch(
    seo.description,
    emDashRegex,
    "SEO description must not contain em-dash"
  );
  assert.doesNotMatch(seo.note, emDashRegex, "SEO note must not contain em-dash");

  for (const opt of [...PAGE_SIZE_OPTIONS, ...ORIENTATION_OPTIONS, ...MARGIN_OPTIONS]) {
    assert.doesNotMatch(opt.label, emDashRegex, "Option label must not contain em-dash");
  }
});
