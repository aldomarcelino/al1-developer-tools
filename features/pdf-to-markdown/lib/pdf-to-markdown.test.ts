import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePdfFile,
  formatFileSize,
  sanitizeMarkdownFilename,
  isFontBold,
  isFontItalic,
  isFontMonospace,
  convertPdfPageToMarkdown,
  PDF_MD_LIMITS,
  type RawTextItem,
  type RawAnnotation,
} from "./pdf-to-markdown.ts";
import toolsData from "../../../config/tools.json" with { type: "json" };
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";
import { toolGuides } from "../../../lib/seo/tool-guides.ts";

test("validatePdfFile verifies valid PDF files and rejects invalid or oversized files", () => {
  const validFile = new File([new Uint8Array(100)], "sample.pdf", {
    type: "application/pdf",
  });
  assert.equal(validatePdfFile(validFile).valid, true);

  const txtFile = new File([new Uint8Array(100)], "sample.txt", {
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

test("formatFileSize formats bytes cleanly", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(1024), "1.0 KB");
  assert.equal(formatFileSize(1024 * 1024 * 2.5), "2.5 MB");
});

test("sanitizeMarkdownFilename strips pdf extension and handles unsafe characters", () => {
  assert.equal(sanitizeMarkdownFilename("Report 2026.pdf"), "Report 2026.md");
  assert.equal(sanitizeMarkdownFilename("Guide/V1:final.pdf"), "Guide_V1_final.md");
  assert.equal(sanitizeMarkdownFilename(".pdf"), "converted_document.md");
});

test("font style detection accurately parses bold, italic, and monospace", () => {
  assert.equal(isFontBold("Helvetica-Bold"), true);
  assert.equal(isFontBold("Arial-Black"), true);
  assert.equal(isFontBold("OpenSans-SemiBold"), true);
  assert.equal(isFontBold("Roboto-Regular"), false);

  assert.equal(isFontItalic("TimesNewRoman-Italic"), true);
  assert.equal(isFontItalic("Arial-Oblique"), true);
  assert.equal(isFontItalic("Courier-Regular"), false);

  assert.equal(isFontMonospace("CourierNewPSMT"), true);
  assert.equal(isFontMonospace("Consolas-Bold"), true);
  assert.equal(isFontMonospace("Monaco"), true);
  assert.equal(isFontMonospace("Menlo-Regular"), true);
  assert.equal(isFontMonospace("Helvetica"), false);
});

test("convertPdfPageToMarkdown accurately detects headings and body flow", () => {
  const items: RawTextItem[] = [
    {
      str: "Document Heading",
      x: 50,
      y: 700,
      width: 200,
      height: 24,
      fontName: "Helvetica-Bold",
      fontSize: 22,
    },
    {
      str: "This is a body paragraph explaining the document concept.",
      x: 50,
      y: 660,
      width: 350,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "It continues with regular text.",
      x: 50,
      y: 645,
      width: 200,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
  ];

  const md = convertPdfPageToMarkdown(items, [], PDF_MD_LIMITS.defaultOptions);
  assert.ok(md.includes("# Document Heading"));
  assert.ok(md.includes("This is a body paragraph explaining the document concept."));
  assert.ok(md.includes("It continues with regular text."));
});

test("convertPdfPageToMarkdown detects bold, italic, and links", () => {
  const items: RawTextItem[] = [
    {
      str: "Normal text with ",
      x: 50,
      y: 600,
      width: 100,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "bold phrase",
      x: 155,
      y: 600,
      width: 70,
      height: 12,
      fontName: "Helvetica-Bold",
      fontSize: 11,
    },
    {
      str: " and an ",
      x: 230,
      y: 600,
      width: 50,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "italic phrase",
      x: 285,
      y: 600,
      width: 70,
      height: 12,
      fontName: "Helvetica-Italic",
      fontSize: 11,
    },
    {
      str: "visit our site",
      x: 50,
      y: 570,
      width: 80,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
  ];

  const annotations: RawAnnotation[] = [
    {
      subtype: "Link",
      url: "https://ramupod.com",
      rect: [48, 565, 135, 585],
    },
  ];

  const md = convertPdfPageToMarkdown(items, annotations, PDF_MD_LIMITS.defaultOptions);
  assert.ok(md.includes("**bold phrase**"));
  assert.ok(md.includes("*italic phrase*"));
  assert.ok(md.includes("[visit our site](https://ramupod.com)"));
});

test("convertPdfPageToMarkdown detects bullet and numbered lists", () => {
  const items: RawTextItem[] = [
    {
      str: "• First bullet point",
      x: 50,
      y: 600,
      width: 150,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "• Second bullet point",
      x: 50,
      y: 580,
      width: 160,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "1. Step one instructions",
      x: 50,
      y: 550,
      width: 170,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
    {
      str: "2. Step two instructions",
      x: 50,
      y: 530,
      width: 170,
      height: 12,
      fontName: "Helvetica",
      fontSize: 11,
    },
  ];

  const md = convertPdfPageToMarkdown(items, [], PDF_MD_LIMITS.defaultOptions);
  assert.ok(md.includes("- First bullet point"));
  assert.ok(md.includes("- Second bullet point"));
  assert.ok(md.includes("1. Step one instructions"));
  assert.ok(md.includes("2. Step two instructions"));
});

test("convertPdfPageToMarkdown formats monospace text as code blocks", () => {
  const items: RawTextItem[] = [
    {
      str: "const x = 42;",
      x: 50,
      y: 600,
      width: 100,
      height: 12,
      fontName: "CourierNew",
      fontSize: 11,
    },
    {
      str: "console.log(x);",
      x: 50,
      y: 580,
      width: 110,
      height: 12,
      fontName: "CourierNew",
      fontSize: 11,
    },
  ];

  const md = convertPdfPageToMarkdown(items, [], PDF_MD_LIMITS.defaultOptions);
  assert.ok(md.includes("```"));
  assert.ok(md.includes("const x = 42;"));
  assert.ok(md.includes("console.log(x);"));
});

test("pdf-to-markdown is properly registered in tools catalog, icons, and SEO without em-dash", () => {
  const tool = toolsData.find((t) => t.slug === "pdf-to-markdown");
  assert.ok(tool, "pdf-to-markdown must exist in tools.json");
  assert.equal(tool.category, "Documents");
  assert.equal(tool.icon, "pdfmarkdown");
  assert.equal(tool.status, "available");

  // Ensure unique icon in toolIcons
  assert.ok(
    tool.icon in toolIcons,
    `Icon ${tool.icon} must be registered in toolIcons`
  );

  // SEO metadata check
  const seo = toolSeo["pdf-to-markdown"];
  assert.ok(seo, "SEO metadata must exist for pdf-to-markdown");
  assert.ok(!seo.title.includes("—"), "SEO title must not contain em-dash");
  assert.ok(
    !seo.description.includes("—"),
    "SEO description must not contain em-dash"
  );
  assert.ok(!seo.note.includes("—"), "SEO note must not contain em-dash");

  // Guide check
  const guide = toolGuides["pdf-to-markdown"];
  assert.ok(guide, "SEO guide must exist for pdf-to-markdown");
  assert.ok(guide.steps.length >= 3, "Guide must have at least 3 steps");
  assert.ok(guide.example, "Guide must have example");
  assert.ok(guide.result, "Guide must have result");
});
