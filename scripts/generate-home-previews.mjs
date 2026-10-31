import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const folder = new URL("../public/previews/", import.meta.url);
const source = await readFile(new URL("landscape.svg", folder));
const original = await sharp(source).jpeg({ quality: 92 }).toBuffer();
// Convert the original file, rather than rendering a different source image.
const optimized = await sharp(original).webp({ quality: 75 }).toBuffer();
await writeFile(new URL("landscape.jpg", folder), original);
await writeFile(new URL("landscape.webp", folder), optimized);
const preview = {
  width: 900,
  height: 600,
  originalBytes: original.length,
  optimizedBytes: optimized.length,
  savedPercent: Math.round((1 - optimized.length / original.length) * 100),
};
await writeFile(
  new URL("compression-example.json", folder),
  JSON.stringify(preview, null, 2) + "\n"
);
console.log(preview);
