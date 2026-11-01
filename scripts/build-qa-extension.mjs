import { readdir, readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import sharp from "sharp";
import { createZip } from "../lib/browser/zip.ts";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist/qa-capture");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const names = new Set();
for (const folder of ["extensions/qa-capture/src", "features/qa-bug-report/lib"]) {
  for (const name of await readdir(path.join(root, folder))) {
    if (!name.endsWith(".ts") || name.endsWith(".d.ts") || name.endsWith(".test.ts"))
      continue;
    const filename = name.replace(/\.ts$/, ".js");
    if (names.has(filename))
      throw new Error(`Extension module filename collision: ${filename}`);
    names.add(filename);
    const source = await readFile(path.join(root, folder, name), "utf8");
    const result = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        verbatimModuleSyntax: true,
      },
      fileName: name,
      reportDiagnostics: true,
    });
    const errors =
      result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length)
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(errors, {
          getCanonicalFileName: (f) => f,
          getCurrentDirectory: () => root,
          getNewLine: () => "\n",
        })
      );
    // Flat, explicit local modules allow a small archive with no path entries.
    await writeFile(
      path.join(output, filename),
      result.outputText.replace(
        /from\s+(["'])([^"']+)\.ts\1/g,
        (_match, quote, file) => `from ${quote}./${path.basename(file)}.js${quote}`
      )
    );
  }
}
for (const name of [
  "manifest.json",
  "devtools.html",
  "panel.html",
  "panel.css",
  "popup.html",
  "popup.css",
  "offscreen.html",
])
  await copyFile(path.join(root, "extensions/qa-capture", name), path.join(output, name));
await copyFile(
  path.join(root, "styles/base/tokens.css"),
  path.join(output, "tokens.css")
);
// Popup and toolbar icons use the official brand tile with dark background
import { brandMarkSvg } from "../config/brand.ts";
const tileSvg = brandMarkSvg(false, true);
await writeFile(
  path.join(output, "popup-logo.png"),
  await sharp(Buffer.from(tileSvg)).resize(48, 48).png().toBuffer()
);
for (const size of [16, 32, 48, 128])
  await writeFile(
    path.join(output, `icon-${size}.png`),
    await sharp(Buffer.from(tileSvg)).resize(size, size).png().toBuffer()
  );
await copyFile(
  path.join(root, "node_modules/lucide-react/LICENSE"),
  path.join(output, "lucide-LICENSE.txt")
);
const files = await Promise.all(
  (await readdir(output)).sort().map(async (name) => ({
    name,
    bytes: new Uint8Array(await readFile(path.join(output, name))),
  }))
);
if (files.length > 64 || files.some((file) => file.bytes.length > 256 * 1024))
  throw new Error("Unexpected extension archive size/count.");
const archive = createZip(files);

// Also mirror to dist/ramupod-companion
const companionOutput = path.join(root, "dist/ramupod-companion");
await rm(companionOutput, { recursive: true, force: true });
await mkdir(companionOutput, { recursive: true });
for (const file of files) {
  await writeFile(path.join(companionOutput, file.name), file.bytes);
}

// Write downloadable ZIP archives
const publicDirectory = path.join(root, "public/qa-capture");
await mkdir(publicDirectory, { recursive: true });
await writeFile(path.join(publicDirectory, "ramupod-qa-capture.zip"), archive);
await writeFile(path.join(root, "public/ramupod-companion.zip"), archive);

console.log(
  `Built MV3 extension: dist/ramupod-companion & dist/qa-capture; downloadable archives: public/ramupod-companion.zip & public/qa-capture/ramupod-qa-capture.zip (${archive.length.toLocaleString()} bytes).`
);
