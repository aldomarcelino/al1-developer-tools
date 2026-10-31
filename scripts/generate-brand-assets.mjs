// Uses the existing Next.js Sharp installation; checked-in assets need no runtime generator.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { brand, brandMark, brandMarkSvg } from "../config/brand.ts";

const root = new URL("../", import.meta.url);
const save = (path, value) => writeFile(new URL(path, root), value);
await mkdir(new URL("public/brand/", root), { recursive: true });
const svg = brandMarkSvg();
for (const path of ["app/icon.svg", "public/icon.svg", "public/brand/ramupod-mark.svg"])
  await save(path, svg + "\n");
await save("public/brand/ramupod-mark-mono.svg", brandMarkSvg(true) + "\n");
await save(
  "public/apple-icon.png",
  await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer()
);

// Actual-size proofs share the same geometry as the favicon.
for (const size of [16, 24, 32]) {
  await save(
    `public/brand/ramupod-mark-${size}.png`,
    await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  );
}
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer())
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const position = 6 + index * 16;
  header[position] = sizes[index];
  header[position + 1] = sizes[index];
  header.writeUInt16LE(1, position + 4);
  header.writeUInt16LE(32, position + 6);
  header.writeUInt32LE(image.length, position + 8);
  header.writeUInt32LE(offset, position + 12);
  offset += image.length;
});
await save("public/favicon.ico", Buffer.concat([header, ...images]));

function markAt(x, y, size, mono = false, tile = true, ink) {
  const standalone = mono || !tile;
  let symbol = brandMarkSvg(mono, tile);
  if (ink) symbol = symbol.replaceAll(`fill="${brandMark.forest}"`, `fill="${ink}"`);
  return symbol
    .replace(
      /<svg[^>]*>/,
      `<g fill="none" transform="translate(${x} ${y}) scale(${size / (standalone ? 32 : 40)})">${standalone ? '<g transform="translate(-4 -4)">' : ""}`
    )
    .replace("</svg>", standalone ? "</g></g>" : "</g>");
}
await save("public/brand/ramupod-mark-standalone.svg", brandMarkSvg(false, false) + "\n");
await save(
  "public/brand/ramupod-mark-standalone-dark.svg",
  brandMarkSvg(false, false).replaceAll(
    `fill="${brandMark.forest}"`,
    `fill="${brandMark.cream}"`
  ) + "\n"
);
const font = 'font-family="Manrope, Helvetica, Arial, sans-serif"';
const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="48" viewBox="0 0 256 48">${markAt(0, 0, 48, false, false)}<text x="62" y="34" ${font} font-size="32" font-weight="700" letter-spacing="-1" fill="${brandMark.forest}">${brand.wordmark}</text></svg>`;
await save("public/brand/ramupod-wordmark.svg", wordmark + "\n");

const [socialLead, socialTail] = brand.description.split(", and ");
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0A2726"/>
<rect x="915" y="256" width="380" height="380" rx="114" fill="${brandMark.forest}" transform="rotate(-12 1105 446)"/>
${markAt(82, 72, 76)}
<text x="180" y="125" ${font} font-size="44" font-weight="700" letter-spacing="-1.5" fill="${brandMark.cream}">${brand.wordmark}</text>
<text x="82" y="287" ${font} font-size="76" font-weight="700" letter-spacing="-2" fill="${brandMark.cream}">Useful tools.</text>
<text x="82" y="377" ${font} font-size="76" font-weight="700" letter-spacing="-2" fill="${brandMark.lime}">Less effort.</text>
<text x="84" y="452" ${font} font-size="27" fill="#C1D0C9">${socialLead},</text>
<text x="84" y="491" ${font} font-size="27" fill="#C1D0C9">and ${socialTail}</text>
<text x="84" y="566" ${font} font-size="18" fill="#C1D0C9">Write. Format. Compare. Get things done.</text>
</svg>`;
await save("public/social-preview.svg", social + "\n");
await save(
  "public/social-preview.jpg",
  await sharp(Buffer.from(social))
    .jpeg({ quality: 93, chromaSubsampling: "4:4:4" })
    .toBuffer()
);

const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="580" viewBox="0 0 1200 580">
<rect width="600" height="580" fill="#F7F8FA"/><rect x="600" width="600" height="580" fill="#0E191D"/>
<text x="48" y="50" ${font} font-size="12" letter-spacing="2" fill="#747B80">FOLDED POD / LIGHT</text>
<text x="648" y="50" ${font} font-size="12" letter-spacing="2" fill="#AFBEC0">FOLDED POD / DARK</text>
${markAt(40, 88, 96, false, false)}${markAt(640, 88, 96, false, false, brandMark.cream)}
<text x="152" y="153" ${font} font-size="52" font-weight="700" letter-spacing="-2" fill="${brandMark.forest}">${brand.wordmark}</text>
<text x="752" y="153" ${font} font-size="52" font-weight="700" letter-spacing="-2" fill="${brandMark.cream}">${brand.wordmark}</text>
<text x="48" y="225" ${font} font-size="21" fill="${brandMark.forest}">${brand.tagline}</text>
<text x="648" y="225" ${font} font-size="21" fill="${brandMark.cream}">${brand.tagline}</text>
${markAt(48, 280, 80)}${markAt(648, 280, 80)}
<text x="152" y="305" ${font} font-size="12" fill="#747B80">APP ICON / FAVICON</text>
<text x="752" y="305" ${font} font-size="12" fill="#AFBEC0">APP ICON / FAVICON</text>
${[16, 24, 32].map((size, i) => markAt(152 + i * 66, 324, size) + markAt(752 + i * 66, 324, size)).join("")}
<g color="${brandMark.forest}">${markAt(48, 426, 64, true)}</g><g color="${brandMark.cream}">${markAt(648, 426, 64, true)}</g>
<text x="152" y="458" ${font} font-size="13" fill="#747B80">ONE COLOR / SAME SILHOUETTE</text>
<text x="752" y="458" ${font} font-size="13" fill="#AFBEC0">ONE COLOR / SAME SILHOUETTE</text>
<text x="48" y="542" ${font} font-size="12" fill="#747B80">Folded pod. Negative-space r.</text>
<text x="648" y="542" ${font} font-size="12" fill="#AFBEC0">Folded pod. Negative-space r.</text>
</svg>`;
await save(
  "public/brand/ramupod-preview.png",
  await sharp(Buffer.from(preview)).png().toBuffer()
);
const old = await readFile(
  new URL("public/brand/archive/ramupod-mark-geometric.svg", root),
  "utf8"
);
const oldAt = (x, y, size) =>
  old
    .replace(/<svg[^>]*>/, `<g transform="translate(${x} ${y}) scale(${size / 40})">`)
    .replace("</svg>", "</g>");
const comparison = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="440" viewBox="0 0 1200 440">
<rect width="1200" height="440" fill="#F7F8FA"/><rect x="600" width="600" height="440" fill="#EEF3F2"/>
<text x="48" y="52" ${font} font-size="12" letter-spacing="2" fill="#747B80">BEFORE</text><text x="648" y="52" ${font} font-size="12" letter-spacing="2" fill="#747B80">FOLDED POD</text>
${oldAt(48, 112, 104)}${markAt(648, 112, 104)}
<text x="176" y="181" ${font} font-size="48" font-weight="700" letter-spacing="-1.7" fill="${brandMark.forest}">${brand.wordmark}</text><text x="776" y="181" ${font} font-size="48" font-weight="700" letter-spacing="-1.7" fill="${brandMark.forest}">${brand.wordmark}</text>
<text x="48" y="279" ${font} font-size="17" fill="#747B80">Previous geometric R</text><text x="648" y="279" ${font} font-size="17" fill="#526B67">Flat color + consistent diagonal seams</text>
${markAt(648, 322, 52, false, false)}<text x="719" y="359" ${font} font-size="29" font-weight="700" letter-spacing="-1" fill="${brandMark.forest}">${brand.wordmark}</text>
<text x="48" y="394" ${font} font-size="12" fill="#747B80">Original preserved in brand/archive</text><text x="648" y="410" ${font} font-size="12" fill="#526B67">Standalone header version</text>
</svg>`;
await save(
  "public/brand/ramupod-comparison.png",
  await sharp(Buffer.from(comparison)).png().toBuffer()
);

// Verify real raster formats and sizes rather than trusting file extensions.
for (const [path, format, width, height] of [
  ["public/apple-icon.png", "png", 180, 180],
  ["public/social-preview.jpg", "jpeg", 1200, 630],
]) {
  const metadata = await sharp(await readFile(new URL(path, root))).metadata();
  if (
    metadata.format !== format ||
    metadata.width !== width ||
    metadata.height !== height
  )
    throw new Error(`Invalid brand asset: ${path}`);
}
console.log(
  "Generated Ramupod SVGs, 16/32/48px ICO, 180px Apple icon, 1200×630 social preview, and logo proof."
);
