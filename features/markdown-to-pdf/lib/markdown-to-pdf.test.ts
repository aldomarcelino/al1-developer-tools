import test from "node:test";
import assert from "node:assert/strict";
import {
  getPageDimensions,
  getMarginPadding,
  calculateMarkdownStats,
  renderMarkdownToHtml,
  escapeHtml,
  sanitizeUrl,
  formatFileSize,
  validateMarkdownFile,
  sanitizePdfFilename,
} from "./md-to-pdf-compiler.ts";
import { TEMPLATES } from "./md-to-pdf-types.ts";
import toolsData from "../../../config/tools.json" with { type: "json" };
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";
import { toolGuides } from "../../../lib/seo/tool-guides.ts";

test("calculates page dimensions accurately for all page sizes and orientations", () => {
  const a4Portrait = getPageDimensions("a4", "portrait");
  assert.equal(a4Portrait.width, 595.28);
  assert.equal(a4Portrait.height, 841.89);

  const a4Landscape = getPageDimensions("a4", "landscape");
  assert.equal(a4Landscape.width, 841.89);
  assert.equal(a4Landscape.height, 595.28);

  const letterPortrait = getPageDimensions("letter", "portrait");
  assert.equal(letterPortrait.width, 612.0);
  assert.equal(letterPortrait.height, 792.0);

  const legalLandscape = getPageDimensions("legal", "landscape");
  assert.equal(legalLandscape.width, 1008.0);
  assert.equal(legalLandscape.height, 612.0);
});

test("returns appropriate CSS padding for margin settings", () => {
  assert.equal(getMarginPadding("normal"), "22mm");
  assert.equal(getMarginPadding("compact"), "14mm");
  assert.equal(getMarginPadding("wide"), "32mm");
});

test("accurately computes writing metrics", () => {
  const text = `# Hello World\n\nThis is a sample document with seven words.`;
  const stats = calculateMarkdownStats(text);
  assert.equal(stats.words, 11);
  assert.equal(stats.lines, 3);
  assert.equal(stats.readingTimeMinutes, 1);
});

test("escapes HTML entities and sanitizes dangerous URLs", () => {
  assert.equal(
    escapeHtml(`<script>alert("xss")</script>`),
    `&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;`
  );
  assert.equal(sanitizeUrl("https://example.com"), "https://example.com");
  assert.equal(sanitizeUrl("javascript:alert(1)"), "#unsafe-url");
  assert.equal(sanitizeUrl("data:text/html,<script>"), "#unsafe-url");
});

test("compiles GitHub Flavored Markdown to structured HTML", () => {
  const md = `# Title
## Subtitle
Paragraph with **bold**, *italic*, and \`inline code\`.

- Item 1
- Item 2

1. First
2. Second

- [x] Done task
- [ ] Todo task

> [!NOTE]
> This is a callout note.

| Col A | Col B |
| :--- | :---: |
| Val 1 | Val 2 |

\`\`\`javascript
const answer = 42;
\`\`\`

---
`;

  const html = renderMarkdownToHtml(md);

  assert.ok(html.includes('<h1 class="md-h1">Title</h1>'));
  assert.ok(html.includes('<h2 class="md-h2">Subtitle</h2>'));
  assert.ok(html.includes("<strong>bold</strong>"));
  assert.ok(html.includes("<em>italic</em>"));
  assert.ok(html.includes('<code class="md-inline-code">inline code</code>'));
  assert.ok(html.includes('<ul class="md-list">'));
  assert.ok(html.includes('<ol class="md-list md-ordered-list">'));
  assert.ok(html.includes("md-task-item md-task-done"));
  assert.ok(html.includes("md-alert-note"));
  assert.ok(html.includes('<table class="md-table">'));
  assert.ok(html.includes("language-javascript"));
  assert.ok(html.includes('<hr class="md-hr" />'));
});

test("all sample templates are valid non-empty markdown", () => {
  assert.ok(TEMPLATES.documentation.length > 50);
  assert.ok(TEMPLATES.resume.length > 50);
  assert.ok(TEMPLATES.report.length > 50);
  assert.ok(TEMPLATES.meeting.length > 50);

  const docHtml = renderMarkdownToHtml(TEMPLATES.documentation);
  assert.ok(docHtml.includes("<h1"));
});

test("unfinished fenced code remains visible in the preview and PDF", () => {
  const html = renderMarkdownToHtml("# Example\n\n```js\nconst value = 42;\n");
  assert.ok(html.includes("const value = 42;"));
  assert.ok(html.includes("</code></pre></div>"));
});

test("PDF filenames preserve Unicode and version numbers while removing path characters", () => {
  assert.equal(
    sanitizePdfFilename("Catatan rapat 日本語.md"),
    "Catatan rapat 日本語.pdf"
  );
  assert.equal(sanitizePdfFilename("Report v1.2"), "Report v1.2.pdf");
  assert.equal(sanitizePdfFilename("Quarterly: Report.pdf"), "Quarterly_ Report.pdf");
  assert.equal(sanitizePdfFilename("..."), "document.pdf");
});

test("formatFileSize, validateMarkdownFile and sanitizePdfFilename work correctly", () => {
  assert.equal(formatFileSize(500), "500 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(2 * 1024 * 1024), "2.0 MB");

  assert.equal(sanitizePdfFilename("my-report.md"), "my-report.pdf");
  assert.equal(
    sanitizePdfFilename("Documentation Spec.markdown"),
    "Documentation Spec.pdf"
  );
  assert.equal(sanitizePdfFilename(""), "document.pdf");

  const validMd = new File(["# hello"], "test.md", { type: "text/markdown" });
  assert.equal(validateMarkdownFile(validMd).valid, true);

  const invalidExt = new File(["data"], "test.exe", { type: "application/octet-stream" });
  assert.equal(validateMarkdownFile(invalidExt).valid, false);
});

test("markdown-to-pdf is properly registered in tools catalog, icons, and SEO without em-dash", () => {
  const tool = toolsData.find((t) => t.slug === "markdown-to-pdf");
  assert.ok(tool, "markdown-to-pdf must exist in tools.json");
  assert.equal(tool.category, "Documents");
  assert.equal(tool.status, "available");

  // Distinct icon component registered
  const iconComponent = toolIcons[tool.icon as keyof typeof toolIcons];
  assert.ok(iconComponent, "Icon component must be registered in toolIcons");

  // SEO metadata check
  const seo = toolSeo["markdown-to-pdf"];
  assert.ok(seo, "SEO metadata must exist for markdown-to-pdf");
  assert.ok(!seo.title.includes("—"), "SEO title must not contain em-dash");
  assert.ok(!seo.description.includes("—"), "SEO description must not contain em-dash");

  // SEO guide check
  const guide = toolGuides["markdown-to-pdf"];
  assert.ok(guide, "SEO guide must exist for markdown-to-pdf");
  assert.ok(!guide.example.includes("—"), "SEO guide example must not contain em-dash");
  assert.ok(!guide.result.includes("—"), "SEO guide result must not contain em-dash");
  assert.ok(
    guide.steps.every((step) => !step.includes("—")),
    "SEO guide steps must not contain em-dash"
  );
});
