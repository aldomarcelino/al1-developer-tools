import test from "node:test";
import assert from "node:assert/strict";
import toolsData from "../../../config/tools.json" with { type: "json" };
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";
import { toolGuides } from "../../../lib/seo/tool-guides.ts";
import {
  tokenizeCode,
  autoDetectLanguage,
  escapeHtml,
} from "./code-highlighter.ts";
import {
  generateSvgString,
  sanitizeFilename,
} from "./code-to-image-export.ts";
import {
  DEFAULT_SETTINGS,
  THEMES,
  BACKGROUND_PRESETS,
  type ThemeId,
  type BackgroundId,
} from "./code-to-image-types.ts";

test("Code to Image Tool Registration", async (t) => {
  await t.test("is registered in tools.json with required fields", () => {
    const tool = toolsData.find((item) => item.slug === "code-to-image");
    assert.ok(tool, "Tool must exist in tools.json");
    assert.strictEqual(tool?.name, "Code to Image");
    assert.strictEqual(tool?.category, "Design");
    assert.strictEqual(tool?.icon, "codeimage");
    assert.strictEqual(tool?.status, "available");
  });

  await t.test("has a valid mapped icon without collisions", () => {
    assert.ok(toolIcons["codeimage"], "codeimage icon must be mapped");
    assert.strictEqual(typeof toolIcons["codeimage"], "object");
  });

  await t.test("has valid SEO metadata without em-dashes", () => {
    const meta = toolSeo["code-to-image"];
    assert.ok(meta, "Metadata must exist for code-to-image");
    assert.ok(meta.title, "Title must be present");
    assert.ok(meta.description, "Description must be present");
    assert.ok(!meta.title.includes("—"), "Title must not contain em-dash");
    assert.ok(!meta.description.includes("—"), "Description must not contain em-dash");
    if ("note" in meta && typeof meta.note === "string") {
      assert.ok(!meta.note.includes("—"), "Note must not contain em-dash");
    }
  });

  await t.test("has a complete guide without em-dashes", () => {
    const guide = toolGuides["code-to-image"];
    assert.ok(guide, "Guide must exist for code-to-image");
    assert.ok(guide.steps.length >= 3, "Guide must have at least 3 steps");
    for (const step of guide.steps) {
      assert.ok(!step.includes("—"), "Guide step must not contain em-dash");
    }
    assert.ok(guide.example, "Guide example must be present");
    assert.ok(guide.result, "Guide result must be present");
    assert.ok(!guide.example.includes("—"), "Guide example must not contain em-dash");
    assert.ok(!guide.result.includes("—"), "Guide result must not contain em-dash");
  });
});

test("Syntax Highlighter & Auto Detection", async (t) => {
  await t.test("escapes special HTML characters properly", () => {
    assert.strictEqual(
      escapeHtml("<script>alert('xss') & \"safe\"</script>"),
      "&lt;script&gt;alert(&#039;xss&#039;) &amp; &quot;safe&quot;&lt;/script&gt;"
    );
  });

  await t.test("detects language from code syntax patterns", () => {
    assert.strictEqual(autoDetectLanguage('{"key": "value", "count": 42}'), "json");
    assert.strictEqual(autoDetectLanguage("<!DOCTYPE html><html><body><h1>Hello</h1></body></html>"), "html");
    assert.strictEqual(autoDetectLanguage("SELECT u.id, u.email FROM users u WHERE u.active = 1;"), "sql");
    assert.strictEqual(
      autoDetectLanguage("def compute_stats(items: list) -> dict:\n    return {'total': len(items)}"),
      "python"
    );
    assert.strictEqual(autoDetectLanguage("#!/bin/bash\ncurl -fsSL https://example.com | sh"), "bash");
  });

  await t.test("tokenizes keywords, strings, comments and numbers", () => {
    const code = `// greeting\nconst name = "Antigravity";\nconst count = 42;`;
    const lines = tokenizeCode(code, "typescript");

    assert.strictEqual(lines.length, 3);

    // Line 1: comment
    assert.strictEqual(lines[0][0].type, "comment");
    assert.strictEqual(lines[0][0].value, "// greeting");

    // Line 2: keyword const, space, variable, space, operator, space, string
    const typesLine2 = lines[1].map((token) => token.type);
    assert.ok(typesLine2.includes("keyword"));
    assert.ok(typesLine2.includes("string"));

    // Line 3: number 42
    const typesLine3 = lines[2].map((token) => token.type);
    assert.ok(typesLine3.includes("number"));
  });
});

test("SVG Generation & Export", async (t) => {
  await t.test("generates a valid SVG markup string", () => {
    const sampleCode = `function hello() {\n  return "world";\n}`;
    const svg = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: sampleCode,
    });

    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("xmlns=\"http://www.w3.org/2000/svg\""));
    assert.ok(svg.includes("viewBox="));
    assert.ok(svg.includes("</svg>"));
    assert.ok(svg.includes("hello"));
    assert.ok(svg.includes("world"));
  });

  await t.test("renders macOS traffic light window buttons when windowStyle is macos", () => {
    const svg = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: "const x = 1;",
      windowStyle: "macos",
    });
    // macOS buttons: red (#ff5f56), yellow (#ffbd2e), green (#27c93f)
    assert.ok(svg.includes("#ff5f56"));
    assert.ok(svg.includes("#ffbd2e"));
    assert.ok(svg.includes("#27c93f"));
  });

  await t.test("renders Windows style buttons when windowStyle is windows", () => {
    const svg = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: "const x = 1;",
      windowStyle: "windows",
    });
    assert.ok(svg.includes("stroke-width=\"1.5\""));
  });

  await t.test("omits window buttons when windowStyle is none", () => {
    const svg = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: "const x = 1;",
      windowStyle: "none",
      showWindowHeader: false,
    });
    assert.ok(!svg.includes("#ff5f56"));
  });

  await t.test("includes line numbers when showLineNumbers is true", () => {
    const svgWithNumbers = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: "line1\nline2\nline3",
      showLineNumbers: true,
      startLineNumber: 1,
    });
    assert.ok(svgWithNumbers.includes(">1  </tspan>"));
    assert.ok(svgWithNumbers.includes(">2  </tspan>"));
    assert.ok(svgWithNumbers.includes(">3  </tspan>"));
  });

  await t.test("omits line numbers when showLineNumbers is false", () => {
    const svgNoNumbers = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: "first\nsecond",
      showLineNumbers: false,
    });
    assert.ok(!svgNoNumbers.includes("opacity=\"0.5\""));
  });

  await t.test("sanitizes filenames properly", () => {
    assert.strictEqual(sanitizeFilename("My Cool Snippet! #1"), "My_Cool_Snippet_1");
    assert.strictEqual(sanitizeFilename(""), "code-snippet");
    assert.strictEqual(sanitizeFilename("index.tsx"), "index.tsx");
  });

  await t.test("defaults to green palette gradient background", () => {
    assert.strictEqual(DEFAULT_SETTINGS.background, "palette");
    assert.ok(BACKGROUND_PRESETS.palette);
    assert.strictEqual(BACKGROUND_PRESETS.palette.name, "Green Palette");
    assert.ok(BACKGROUND_PRESETS.palette.css.includes("#0e363c"));
    assert.ok(BACKGROUND_PRESETS.palette.css.includes("#e1ffc1"));
  });

  await t.test("automatically wraps long lines when autoWrap is true", () => {
    const longLine = "const veryLongQueryString = 'SELECT id, username, email, full_name, phone_number, created_at FROM users WHERE status = active ORDER BY created_at DESC';";
    const svgWrapped = generateSvgString({
      ...DEFAULT_SETTINGS,
      code: longLine,
      autoWrap: true,
      showLineNumbers: true,
    });
    // With wrapping enabled, it should split into multiple text elements/tspans
    const textMatches = svgWrapped.match(/<text y=/g);
    assert.ok(textMatches && textMatches.length >= 2, "Long line must be split into multiple sublines");
  });

  await t.test("supports custom color background", () => {
    const svgCustom = generateSvgString({
      ...DEFAULT_SETTINGS,
      background: "custom",
      customBackground: "#ff007f",
    });
    assert.ok(svgCustom.includes("fill=\"#ff007f\""));
  });

  await t.test("supports all predefined themes and backgrounds", () => {
    for (const [themeKey] of Object.entries(THEMES)) {
      const svg = generateSvgString({
        ...DEFAULT_SETTINGS,
        code: "const ok = true;",
        theme: themeKey as ThemeId,
      });
      assert.ok(svg.includes("</svg>"));
    }

    for (const bg of Object.values(BACKGROUND_PRESETS)) {
      const svg = generateSvgString({
        ...DEFAULT_SETTINGS,
        code: "const ok = true;",
        background: bg.id as BackgroundId,
      });
      assert.ok(svg.includes("</svg>"));
    }
  });
});
