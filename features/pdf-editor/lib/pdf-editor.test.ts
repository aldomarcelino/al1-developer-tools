import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  hexToRgbFraction,
  resizeAnnotation,
  percentToPdfCoords,
  screenToPercent,
  sanitizeBaseFilename,
  formatFileSize,
  exportEditedPdf,
  FONT_OPTIONS,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  type PdfAnnotation,
} from "./pdf-editor.ts";

test("hexToRgbFraction parses 3-digit and 6-digit hex colors correctly", () => {
  const black = hexToRgbFraction("#000000");
  assert.equal(black.r, 0);
  assert.equal(black.g, 0);
  assert.equal(black.b, 0);

  const white = hexToRgbFraction("#ffffff");
  assert.equal(white.r, 1);
  assert.equal(white.g, 1);
  assert.equal(white.b, 1);

  const shortRed = hexToRgbFraction("#f00");
  assert.equal(shortRed.r, 1);
  assert.equal(shortRed.g, 0);
  assert.equal(shortRed.b, 0);

  const invalid = hexToRgbFraction("invalid");
  assert.equal(invalid.r, 0);
  assert.equal(invalid.g, 0);
  assert.equal(invalid.b, 0);
});

test("coordinate conversion maps percentage to PDF points (bottom-left origin)", () => {
  const pageWidth = 600;
  const pageHeight = 800;

  // Top-left 10% x, 10% y, 20% w, 10% h
  const coords = percentToPdfCoords(10, 10, 20, 10, pageWidth, pageHeight);
  assert.equal(coords.x, 60);
  assert.equal(coords.width, 120);
  assert.equal(coords.height, 80);
  // Bottom-left PDF Y = pageHeight - (10% + 10%) * pageHeight = 800 - 160 = 640
  assert.equal(coords.y, 640);
});

test("screenToPercent converts viewport coordinates to percentages clamped between 0 and 100", () => {
  const percent = screenToPercent(150, 200, 300, 400, 600, 800);
  assert.equal(percent.xPct, 25);
  assert.equal(percent.yPct, 25);
  assert.equal(percent.widthPct, 50);
  assert.equal(percent.heightPct, 50);

  // Clamped bounds
  const clamped = screenToPercent(-50, 900, 1000, 1000, 500, 500);
  assert.equal(clamped.xPct, 0);
  assert.equal(clamped.yPct, 100);
  assert.equal(clamped.widthPct, 100);
  assert.equal(clamped.heightPct, 100);
});

test("sanitizeBaseFilename removes illegal characters and falls back cleanly", () => {
  assert.equal(sanitizeBaseFilename("My Quarterly Report.pdf"), "My-Quarterly-Report");
  assert.equal(sanitizeBaseFilename("invoice_#123@final!.pdf"), "invoice_123final");
  assert.equal(sanitizeBaseFilename("....pdf"), "edited-document");
});

test("formatFileSize formats bytes, KB, and MB accurately", () => {
  assert.equal(formatFileSize(500), "500 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(5 * 1024 * 1024), "5.00 MB");
});

test("exportEditedPdf modifies document with annotations, rotations, and page removals", async () => {
  // Create a 2-page test PDF document
  const sampleDoc = await PDFDocument.create();
  sampleDoc.addPage([595, 842]); // Page 0 (A4)
  sampleDoc.addPage([595, 842]); // Page 1 (A4)
  const initialBytes = await sampleDoc.save();

  // 1x1 transparent PNG data URL for image embedding test
  const transparentPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const annotations: PdfAnnotation[] = [
    {
      id: "ann-1",
      pageIndex: 0,
      type: "text",
      xPct: 10,
      yPct: 10,
      widthPct: 40,
      heightPct: 5,
      text: "Confidential Document",
      fontSize: 18,
      color: "#dc2626",
    },
    {
      id: "ann-2",
      pageIndex: 0,
      type: "whiteout",
      xPct: 10,
      yPct: 20,
      widthPct: 30,
      heightPct: 5,
    },
    {
      id: "ann-3",
      pageIndex: 0,
      type: "highlight",
      xPct: 10,
      yPct: 30,
      widthPct: 35,
      heightPct: 4,
      color: "#fde047",
    },
    {
      id: "ann-4",
      pageIndex: 0,
      type: "rectangle",
      xPct: 10,
      yPct: 40,
      widthPct: 20,
      heightPct: 10,
      strokeColor: "#2563eb",
      strokeWidth: 2,
    },
    {
      id: "ann-5",
      pageIndex: 0,
      type: "circle",
      xPct: 40,
      yPct: 40,
      widthPct: 20,
      heightPct: 10,
      strokeColor: "#16a34a",
    },
    {
      id: "ann-6",
      pageIndex: 0,
      type: "draw",
      xPct: 65,
      yPct: 40,
      widthPct: 20,
      heightPct: 10,
      imageDataUrl: transparentPng,
    },
  ];

  const exportedBytes = await exportEditedPdf(initialBytes, {
    annotations,
    pageRotations: { 0: 90 },
    deletedPages: [1], // Delete page 1
  });

  assert.ok(exportedBytes.length > 0, "Exported PDF must not be empty");

  // Load exported PDF and verify
  const resultDoc = await PDFDocument.load(exportedBytes);
  assert.equal(resultDoc.getPageCount(), 1, "Page 1 should have been deleted");

  const page0 = resultDoc.getPage(0);
  assert.equal(page0.getRotation().angle, 90, "Page 0 rotation should be 90 degrees");
});

test("font options and highlight colors contain no em-dashes", () => {
  const emDash = "\u2014";
  for (const font of FONT_OPTIONS) {
    assert.ok(
      !font.label.includes(emDash),
      `Font label must not contain em-dash: ${font.label}`
    );
  }
  for (const color of HIGHLIGHT_COLORS) {
    assert.ok(
      !color.label.includes(emDash),
      `Highlight label must not contain em-dash: ${color.label}`
    );
  }
  for (const color of TEXT_COLORS) {
    assert.ok(
      !color.label.includes(emDash),
      `Text color label must not contain em-dash: ${color.label}`
    );
  }
});

test("every font choice exports its corresponding PDF font, including bold and italic", async () => {
  const { StandardFonts, PDFDict, PDFName } = await import("pdf-lib");
  const source = await PDFDocument.create();
  source.addPage([595, 842]);
  const output = await exportEditedPdf(await source.save(), {
    annotations: FONT_OPTIONS.map((font, index) => ({
      id: String(index),
      pageIndex: 0,
      type: "text",
      xPct: 5,
      yPct: 5 + index * 5,
      widthPct: 80,
      heightPct: 5,
      text: font.label,
      fontFamily: font.value,
      fontSize: index === 0 ? 6 : index === 1 ? 144 : 12,
    })),
    pageRotations: {},
    deletedPages: [],
  });
  const result = await PDFDocument.load(output);
  const embedded = result.context.enumerateIndirectObjects().flatMap(([, object]) => {
    if (!(object instanceof PDFDict)) return [];
    const font = object.lookup(PDFName.of("BaseFont"));
    return font instanceof PDFName ? [font.decodeText()] : [];
  });
  for (const option of FONT_OPTIONS) {
    assert.ok(embedded.includes(StandardFonts[option.value]), option.label);
  }
});

const resizeSample: PdfAnnotation = {
  id: "resize",
  pageIndex: 0,
  type: "rectangle",
  xPct: 20,
  yPct: 30,
  widthPct: 40,
  heightPct: 20,
};

test("resize keeps the opposite corner anchored for all four handles", () => {
  for (const corner of ["nw", "ne", "sw", "se"] as const) {
    const result = resizeAnnotation(resizeSample, corner, 5, 4, 1, 1);
    assert.equal(result.widthPct, corner.endsWith("w") ? 35 : 45);
    assert.equal(result.heightPct, corner.startsWith("n") ? 16 : 24);
    assert.equal(
      corner.endsWith("w") ? result.xPct + result.widthPct : result.xPct,
      corner.endsWith("w") ? 60 : 20
    );
    assert.equal(
      corner.startsWith("n") ? result.yPct + result.heightPct : result.yPct,
      corner.startsWith("n") ? 50 : 30
    );
  }
});

test("resize clamps to page bounds and minimum size", () => {
  const larger = resizeAnnotation(resizeSample, "nw", -200, -200, 2, 2);
  assert.equal(larger.xPct, 0);
  assert.equal(larger.yPct, 0);
  const smaller = resizeAnnotation(resizeSample, "se", -200, -200, 2, 2);
  assert.equal(smaller.widthPct, 2);
  assert.equal(smaller.heightPct, 2);
});

test("image and signature resizing preserves proportions within the page", () => {
  for (const type of ["image", "draw"] as const) {
    const result = resizeAnnotation({ ...resizeSample, type }, "se", 200, 100, 1, 1);
    assert.equal(result.widthPct / result.heightPct, 2);
    assert.ok(result.xPct + result.widthPct <= 100);
    assert.ok(result.yPct + result.heightPct <= 100);
  }
});

test("text resizing scales font size for export and respects font limits", () => {
  const text = { ...resizeSample, type: "text" as const, fontSize: 12 };
  const result = resizeAnnotation(text, "se", 20, 10, 1, 1);
  assert.equal(result.fontSize, 18);
  assert.equal(result.widthPct, 60);
  const small = resizeAnnotation(text, "se", -100, -100, 1, 1);
  assert.equal(small.fontSize, 6);
  assert.equal(small.widthPct, 20);
});
