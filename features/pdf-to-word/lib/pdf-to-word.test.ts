import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePdfFile,
  sanitizeWordFilename,
  formatFileSize,
  isFontBold,
  isFontItalic,
  processPageTextItems,
  generateDocxBlob,
  generateDocBlob,
  type PdfExtractionResult,
} from "./pdf-to-word.ts";
import toolsData from "../../../config/tools.json" with { type: "json" };
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("validatePdfFile verifies valid PDF files and rejects invalid or oversized files", () => {
  const validFile = new File([new Uint8Array(100)], "document.pdf", {
    type: "application/pdf",
  });
  assert.equal(validatePdfFile(validFile).valid, true);

  const txtFile = new File([new Uint8Array(100)], "document.txt", {
    type: "text/plain",
  });
  const txtCheck = validatePdfFile(txtFile);
  assert.equal(txtCheck.valid, false);
  assert.ok(txtCheck.error?.includes("valid PDF file"));

  const emptyFile = new File([], "empty.pdf", {
    type: "application/pdf",
  });
  const emptyCheck = validatePdfFile(emptyFile);
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.error?.includes("empty"));

  const oversizedFile = new File([new Uint8Array(10)], "huge.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(oversizedFile, "size", { value: 60 * 1024 * 1024 });
  const sizeCheck = validatePdfFile(oversizedFile);
  assert.equal(sizeCheck.valid, false);
  assert.ok(sizeCheck.error?.includes("50 MB limit"));
});

test("sanitizeWordFilename outputs clean filenames with proper word extensions", () => {
  assert.equal(
    sanitizeWordFilename("Laporan_Keuangan_2026.pdf", "docx"),
    "Laporan_Keuangan_2026.docx"
  );
  assert.equal(
    sanitizeWordFilename("surat-perjanjian.PDF", "doc"),
    "surat-perjanjian.doc"
  );
  assert.equal(
    sanitizeWordFilename("Dokumen Asli (Final).pdf", "docx"),
    "Dokumen Asli _Final_.docx"
  );
});

test("formatFileSize formats bytes cleanly", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(1024), "1.0 KB");
  assert.equal(formatFileSize(2.5 * 1024 * 1024), "2.5 MB");
});

test("font style detection accurately parses bold and italic metadata", () => {
  assert.equal(isFontBold("Helvetica-Bold"), true);
  assert.equal(isFontBold("Arial-Black"), true);
  assert.equal(isFontBold("Roboto-Semibold"), true);
  assert.equal(isFontBold("TimesNewRoman-Regular"), false);

  assert.equal(isFontItalic("Helvetica-Oblique"), true);
  assert.equal(isFontItalic("Calibri-Italic"), true);
  assert.equal(isFontItalic("Georgia-Slanted"), true);
  assert.equal(isFontItalic("Arial-Bold"), false);
});

test("processPageTextItems detects headings and groups flow vs exact paragraphs", () => {
  const sampleItems = [
    {
      str: "Executive Summary",
      x: 72,
      y: 720,
      width: 150,
      height: 18,
      fontName: "Helvetica-Bold",
      fontSize: 18,
    },
    {
      str: "This is the first sentence of the body paragraph. ",
      x: 72,
      y: 680,
      width: 250,
      height: 11,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "And this is the continuation on the second line.",
      x: 72,
      y: 666,
      width: 230,
      height: 11,
      fontName: "Helvetica",
      fontSize: 11,
    },
  ];

  // Flow mode: merges continuous lines into single paragraph
  const flowParagraphs = processPageTextItems(sampleItems, 1, "flow");
  assert.equal(flowParagraphs.length, 2);
  assert.equal(flowParagraphs[0].isHeading, true);
  assert.equal(flowParagraphs[0].headingLevel, 2);
  assert.equal(flowParagraphs[0].text, "Executive Summary");
  assert.equal(flowParagraphs[1].isHeading, false);
  assert.ok(flowParagraphs[1].text.includes("first sentence"));
  assert.ok(flowParagraphs[1].text.includes("second line"));

  // Exact mode: preserves separate line breaks as individual paragraphs
  const exactParagraphs = processPageTextItems(sampleItems, 1, "exact");
  assert.equal(exactParagraphs.length, 3);
  assert.equal(exactParagraphs[0].text, "Executive Summary");
  assert.ok(exactParagraphs[1].text.includes("first sentence"));
  assert.ok(exactParagraphs[2].text.includes("second line"));
});

test("generateDocxBlob produces valid OpenXML ZIP archive for Word", async () => {
  const mockExtraction: PdfExtractionResult = {
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            runs: [
              {
                text: "Test Title",
                bold: true,
                italic: false,
                fontSize: 18,
              },
            ],
            isHeading: true,
            headingLevel: 1,
            text: "Test Title",
            pageNumber: 1,
          },
          {
            runs: [
              {
                text: "This is body text in the document.",
                bold: false,
                italic: false,
                fontSize: 11,
              },
            ],
            isHeading: false,
            text: "This is body text in the document.",
            pageNumber: 1,
          },
        ],
        text: "Test Title\n\nThis is body text in the document.",
      },
    ],
    totalPages: 1,
    totalParagraphs: 2,
    totalWords: 9,
    totalCharacters: 44,
  };

  const blob = await generateDocxBlob(mockExtraction, {
    format: "docx",
    layout: "flow",
  });
  assert.ok(blob.size > 1000);

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  // OpenXML DOCX is a ZIP file starting with PK magic bytes (0x50 0x4B 0x03 0x04)
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
});

test("generateDocBlob produces valid RTF document for legacy Word .doc", async () => {
  const mockExtraction: PdfExtractionResult = {
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            runs: [
              {
                text: "Heading Title",
                bold: true,
                italic: false,
                fontSize: 16,
              },
            ],
            isHeading: true,
            headingLevel: 2,
            text: "Heading Title",
            pageNumber: 1,
          },
        ],
        text: "Heading Title",
      },
    ],
    totalPages: 1,
    totalParagraphs: 1,
    totalWords: 2,
    totalCharacters: 13,
  };

  const docBlob = generateDocBlob(mockExtraction, {
    format: "doc",
    layout: "flow",
  });
  assert.equal(docBlob.type, "application/msword");
  const text = await docBlob.text();
  assert.ok(text.startsWith("{\\rtf1"));
  assert.ok(text.includes("Heading Title"));
});

test("pdf-to-word is registered with unique icon and SEO without em-dash", () => {
  const tool = toolsData.find((t) => t.slug === "pdf-to-word");
  assert.ok(tool, "pdf-to-word must exist in tools.json");
  assert.equal(tool.category, "Documents");
  assert.equal(tool.icon, "pdfword");

  // Ensure unique icon in toolIcons
  assert.ok(
    tool.icon in toolIcons,
    `Icon ${tool.icon} must be registered in toolIcons`
  );

  // SEO metadata check
  const seo = toolSeo["pdf-to-word"];
  assert.ok(seo, "SEO metadata must exist for pdf-to-word");
  assert.ok(!seo.title.includes("—"), "SEO title must not contain em-dash");
  assert.ok(
    !seo.description.includes("—"),
    "SEO description must not contain em-dash"
  );
  assert.ok(!seo.note.includes("—"), "SEO note must not contain em-dash");
});
