import test from "node:test";
import assert from "node:assert/strict";
import { tools, headerTools, matchesToolQuery, isPopularTool } from "./tools.ts";
import { toolIcons } from "../components/cummon/tool-icons.ts";

const matches = (query: string) =>
  tools.filter((tool) => matchesToolQuery(tool, query)).map((tool) => tool.slug);

test("header and popular badges use the same nine ranked available tools", () => {
  assert.equal(headerTools.length, 9);
  assert.equal(new Set(headerTools.map((tool) => tool.slug)).size, 9);
  assert.equal(headerTools[0].slug, "image-compressor");
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
    ["selisih tanggal", "date-calculator"],
    ["working days", "date-calculator"],
    ["password generator", "uuid-generator"],
    ["epoch", "timestamp-converter"],
    ["JSON -> TS", "json-to-typescript"],
    ["hitung karakter", "character-counter"],
    ["notulen", "notes"],
    ["url decode", "base64-url"],
    [" AXIOS ", "curl-to-code"],
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
