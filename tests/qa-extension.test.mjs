import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const root = new URL("../", import.meta.url);
function archiveFiles() {
  const data = readFileSync(new URL("public/qa-capture/ramupod-qa-capture.zip", root));
  const files = new Map();
  let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(
      data.readUInt16LE(offset + 8),
      0,
      "Distribution uses uncompressed known files"
    );
    const size = data.readUInt32LE(offset + 18),
      nameLength = data.readUInt16LE(offset + 26),
      extraLength = data.readUInt16LE(offset + 28);
    const name = data.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    assert.ok(name && !/[\\/\x00]/.test(name) && name !== "." && name !== "..");
    assert.ok(size <= 256 * 1024);
    assert.ok(!files.has(name));
    const start = offset + 30 + nameLength + extraLength;
    assert.ok(start + size <= data.length);
    files.set(name, data.subarray(start, start + size));
    offset = start + size;
  }
  assert.ok(files.size > 5 && files.size <= 64);
  assert.equal(data.readUInt32LE(offset), 0x02014b50);
  return files;
}
test("QA extension distribution has only local module references and minimal MV3 permissions", () => {
  const files = archiveFiles();
  const manifest = JSON.parse(files.get("manifest.json").toString());
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, [
    "storage",
    "activeTab",
    "scripting",
    "debugger",
  ]);
  assert.equal(manifest.optional_permissions, undefined);
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: [
        "http://localhost:3000/tools/qa-bug-report*",
        "https://dotools.com/tools/qa-bug-report*",
      ],
      js: ["bridge.js"],
      run_at: "document_idle",
    },
  ]);
  assert.ok(files.has(manifest.background.service_worker));
  assert.ok(files.has(manifest.action.default_popup));
  for (const key of [
    "host_permissions",
    "optional_host_permissions",
    "externally_connectable",
    "web_accessible_resources",
  ])
    assert.equal(manifest[key], undefined);
  for (const [size, file] of Object.entries(manifest.icons)) {
    const png = files.get(file);
    assert.ok(png);
    assert.equal(png.readUInt32BE(16), Number(size));
    assert.equal(png.readUInt32BE(20), Number(size));
    assert.equal(manifest.action.default_icon[size], file);
  }
  assert.ok(files.has(manifest.devtools_page));
  assert.deepEqual(
    manifest,
    JSON.parse(readFileSync(new URL("extensions/qa-capture/manifest.json", root), "utf8"))
  );
  for (const [name, bytes] of files) {
    const text = bytes.toString("utf8");
    if (name.endsWith(".js"))
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        assert.ok(match[1].startsWith("./"), `${name}: no remote/bare imports`);
        assert.ok(files.has(match[1].slice(2)), `${name}: module ${match[1]} exists`);
      }
    if (name.endsWith(".html"))
      for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g))
        assert.ok(files.has(match[1]), `${name}: local asset ${match[1]} exists`);
  }
});
test("shipped capture, redaction and validation modules match their TypeScript sources", () => {
  const files = archiveFiles();
  for (const file of [
    "extensions/qa-capture/src/capture.ts",
    "extensions/qa-capture/src/worker.ts",
    "extensions/qa-capture/src/overlay.ts",
    "extensions/qa-capture/src/ui.ts",
    "extensions/qa-capture/src/screenshot.ts",
    "extensions/qa-capture/src/bridge.ts",
    "extensions/qa-capture/src/network.ts",
    "extensions/qa-capture/src/handoff.ts",
    "extensions/qa-capture/src/devtools.ts",
    "extensions/qa-capture/src/panel.ts",
    "features/qa-bug-report/lib/model.ts",
    "features/qa-bug-report/lib/har.ts",
    "features/qa-bug-report/lib/redact.ts",
    "features/qa-bug-report/lib/validate.ts",
  ]) {
    const name = file.split("/").pop();
    const expected = ts
      .transpileModule(readFileSync(new URL(file, root), "utf8"), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
          verbatimModuleSyntax: true,
        },
        fileName: name,
      })
      .outputText.replace(
        /from\s+(["'])([^"']+)\.ts\1/g,
        (_m, q, p) => `from ${q}./${p.split("/").pop()}.js${q}`
      );
    assert.equal(
      files.get(name.replace(/\.ts$/, ".js"))?.toString("utf8"),
      expected,
      `Rebuild extension after editing ${file}`
    );
  }
});
