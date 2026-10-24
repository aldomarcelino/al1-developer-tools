import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarkdownStats,
  parseInlineMarkdown,
  renderMarkdownToHtml,
} from "./markdown.ts";

test("calculates markdown stats correctly", () => {
  const text = "Hello world from markdown editor!\nSecond line of text.";
  const stats = calculateMarkdownStats(text);
  assert.equal(stats.words, 9);
  assert.equal(stats.lines, 2);
  assert.equal(stats.characters, text.length);
  assert.equal(stats.readingTimeMinutes, 1);
});

test("parses inline markdown styling", () => {
  assert.equal(parseInlineMarkdown("**bold text**"), "<strong>bold text</strong>");
  assert.equal(parseInlineMarkdown("*italic text*"), "<em>italic text</em>");
  assert.equal(
    parseInlineMarkdown("`code snippet`"),
    '<code class="md-inline-code">code snippet</code>'
  );
  assert.equal(parseInlineMarkdown("~~deleted~~"), "<del>deleted</del>");
  assert.match(
    parseInlineMarkdown("[Google](https://google.com)"),
    /<a href="https:\/\/google\.com".*>Google<\/a>/
  );
});

test("prevents XSS with dangerous javascript: links and script tags", () => {
  const unsafeLink = parseInlineMarkdown("[Click me](javascript:alert(1))");
  assert.ok(!unsafeLink.includes("javascript:alert(1)"));
  assert.ok(unsafeLink.includes("#unsafe-url"));

  const unsafeScript = parseInlineMarkdown("<script>alert('xss')</script>");
  assert.ok(!unsafeScript.includes("<script>"));
  assert.ok(unsafeScript.includes("&lt;script&gt;"));
});

test("renders headings with auto slug IDs", () => {
  const html = renderMarkdownToHtml("# Main Title\n## Sub heading!");
  assert.ok(html.includes('<h1 id="main-title">Main Title</h1>'));
  assert.ok(html.includes('<h2 id="sub-heading">Sub heading!</h2>'));
});

test("renders fenced code blocks with language badge", () => {
  const md = "```typescript\nconst x: number = 42;\n```";
  const html = renderMarkdownToHtml(md);
  assert.ok(html.includes('class="code-lang-badge">typescript</span>'));
  assert.ok(html.includes('class="md-code-block"'));
  assert.ok(html.includes("const x: number = 42;"));
});

test("renders GFM tables with column alignment", () => {
  const md = `
| Name | Role | Score |
| :--- | :---: | ---: |
| Alice | Admin | 100 |
| Bob | User | 50 |
`.trim();
  const html = renderMarkdownToHtml(md);
  assert.ok(html.includes('<table class="md-table">'));
  assert.ok(html.includes('<th style="text-align:left">Name</th>'));
  assert.ok(html.includes('<th style="text-align:center">Role</th>'));
  assert.ok(html.includes('<th style="text-align:right">Score</th>'));
  assert.ok(html.includes('<td style="text-align:left">Alice</td>'));
});

test("renders task checklists and standard lists", () => {
  const md = `
- [x] Completed task
- [ ] Incomplete task
- Standard bullet
`.trim();
  const html = renderMarkdownToHtml(md);
  assert.ok(html.includes('class="md-task-list"'));
  assert.ok(html.includes('type="checkbox" disabled checked'));
  assert.ok(html.includes('type="checkbox" disabled  />'));
  assert.ok(html.includes("Completed task"));
});

test("renders alert callouts", () => {
  const md = `> [!TIP]\n> This is a helpful tip.`;
  const html = renderMarkdownToHtml(md);
  assert.ok(html.includes('class="md-alert md-alert-tip"'));
  assert.ok(html.includes('class="md-alert-title">TIP</div>'));
  assert.ok(html.includes("This is a helpful tip."));
});
