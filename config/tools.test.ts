import test from "node:test";
import assert from "node:assert/strict";
import {
  tools,
  headerTools,
  matchesToolQuery,
  isPopularTool,
  searchTools,
} from "./tools.ts";
import { toolIcons } from "../components/cummon/tool-icons.ts";

const matches = (query: string) =>
  tools.filter((tool) => matchesToolQuery(tool, query)).map((tool) => tool.slug);

test("header and popular badges use the same nine ranked available tools", () => {
  assert.equal(headerTools.length, 9);
  assert.equal(new Set(headerTools.map((tool) => tool.slug)).size, 9);
  assert.equal(headerTools[0].slug, "screen-recorder");
  assert.deepEqual(
    headerTools.map((tool) => tool.slug),
    tools
      .filter((tool) => tool.status === "available")
      .slice(0, 9)
      .map((tool) => tool.slug)
  );
  assert.deepEqual(
    tools
      .filter((tool) => isPopularTool(tool.slug))
      .map((tool) => tool.slug)
      .sort(),
    headerTools.map((tool) => tool.slug).sort()
  );
  assert.equal(tools.filter((tool) => isPopularTool(tool.slug)).length, 9);
  assert.ok(headerTools.every((tool) => tool.status === "available"));
});
test("search resolves supported capabilities and aliases", () => {
  for (const [query, slug] of [
    ["svg to jsx", "svg-optimizer"],
    ["optimasi svg", "svg-optimizer"],
    ["konversi satuan", "unit-converter"],
    ["binary data", "unit-converter"],
    ["cron expression", "cron-builder"],
    ["jadwal cron", "cron-builder"],
    ["JSON to YAML", "json-yaml-converter"],
    ["yaml to json", "json-yaml-converter"],
    ["gambar ke pdf", "image-to-pdf"],
    ["pdf ke gambar", "pdf-to-image"],
    ["word ke pdf", "word-to-pdf"],
    ["selisih tanggal", "date-calculator"],
    ["working days", "date-calculator"],
    ["password generator", "uuid-generator"],
    ["epoch", "timestamp-converter"],
    ["JSON -> TS", "json-to-typescript"],
    ["hitung karakter", "character-counter"],
    ["notulen", "notes"],
    ["url decode", "base64-url"],
    [" AXIOS ", "curl-to-code"],
    ["json diff", "diff-viewer"],
    ["compare diff", "diff-viewer"],
    ["code diff", "diff-viewer"],
    ["compress gif", "image-compressor"],
    ["gif compressor", "image-compressor"],
    ["convert to jxl", "image-compressor"],
    ["jxl converter", "image-compressor"],
    ["excel to json", "csv-json-converter"],
    ["cron job", "cron-builder"],
    ["days between dates", "date-calculator"],
    ["pdf to markdown", "pdf-to-markdown"],
    ["pdf to md", "pdf-to-markdown"],
    ["pdf ke markdown", "pdf-to-markdown"],
    ["edit dokumen pdf", "pdf-editor"],
    ["edit file pdf", "pdf-editor"],
    ["markdown to pdf", "markdown-to-pdf"],
    ["md to pdf", "markdown-to-pdf"],
  ] as const)
    assert.ok(matches(query).includes(slug), query);
});
test("search supports multi-term queries and empty queries", () => {
  assert.ok(matches("count character").includes("character-counter"));
  assert.equal(matches("  ").length, tools.length);
  assert.deepEqual(matches("unknown capability xqz"), []);
});
test("keywords describe available features without promising token verification or live webhooks", () => {
  assert.ok(!matches("verify signature").includes("jwt-decoder"));
  assert.deepEqual(tools.find((tool) => tool.slug === "webhook-inspector")?.keywords, []);
});

test("every tool, including planned tools, has a distinct registered icon", () => {
  assert.equal(new Set(tools.map((tool) => tool.icon)).size, tools.length);
  const components = tools.map((tool) => toolIcons[tool.icon]);
  assert.ok(components.every(Boolean), "Every icon key must resolve without a fallback");
  assert.equal(
    new Set(components).size,
    tools.length,
    "Icon keys must not alias the same Lucide component"
  );
});

test("search tolerates spelling errors and adjacent transpositions", () => {
  for (const [query, slug] of [
    ["jsson fomratter", "json-formatter"],
    ["pdf compresor", "pdf-compressor"],
    ["lorem ipsmu", "lorem-ipsum-generator"],
    ["scren recroder", "screen-recorder"],
  ] as const) {
    assert.ok(matches(query).includes(slug), query);
  }
  assert.deepEqual(matches("zzzzzzz unknown xqz"), []);
  assert.ok(!matches("jst").includes("jwt-decoder"), "Short acronyms stay exact");
});

test("ranks Scientific Calculator as the top result for calculator and calculation queries", () => {
  for (const q of [
    "calculator",
    "Calculator",
    "kalkulator",
    "calc",
    "scientific calculator",
    "Scientific Calculator",
    "kalkulator ilmiah",
  ]) {
    for (const cat of ["All", "All tools", "Utilities"]) {
      const results = searchTools(tools, q, cat);
      assert.ok(results.length > 0, `Expected search results for query: ${q} in ${cat}`);
      assert.equal(
        results[0].slug,
        "scientific-calculator",
        `Expected scientific-calculator to be top result for "${q}" in "${cat}", but got "${results[0].slug}"`
      );
    }
  }
});
