// Uses the existing Next.js Sharp installation; checked-in assets need no runtime generator.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { brand, brandMark, brandMarkSvg, brandMarkStandaloneSvg, brandMarkCapsuleSvg } from "../config/brand.ts";

const root = new URL("../", import.meta.url);
const save = (path, value) => writeFile(new URL(path, root), value);
await mkdir(new URL("public/brand/", root), { recursive: true });

// ── Tile SVG (1024×1024 with rounded-rect bg) ────────────────────────────────────
const tileSvg = brandMarkSvg(false, true); // full colour, tile
for (const path of ["app/icon.svg", "public/icon.svg", "public/brand/ramupod-mark.svg"])
  await save(path, tileSvg + "\n");

// ── Monochrome variant ────────────────────────────────────────────────────────
await save("public/brand/ramupod-mark-mono.svg", brandMarkSvg(true, false) + "\n");

// ── Apple touch icon (180×180 PNG from tile SVG) ─────────────────────────────
await save(
  "public/apple-icon.png",
  await sharp(Buffer.from(tileSvg)).resize(180, 180).png().toBuffer()
);

// ── Small raster proofs ───────────────────────────────────────────────────────
for (const [path, size] of [
  ["public/favicon-96x96.png", 96],
  ["public/brand/ramupod-logo-512.png", 512],
]) {
  await save(path, await sharp(Buffer.from(tileSvg)).resize(size, size).png().toBuffer());
}

for (const size of [16, 24, 32]) {
  await save(
    `public/brand/ramupod-mark-${size}.png`,
    await sharp(Buffer.from(tileSvg)).resize(size, size).png().toBuffer()
  );
}

// ── favicon.ico (multi-size: 16, 32, 48) ─────────────────────────────────────
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(Buffer.from(tileSvg)).resize(size, size).png().toBuffer())
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

// ── Standalone mark SVGs (no tile bg) ─────────────────────────────────
const standaloneLightSvg = brandMarkStandaloneSvg(false);
const standaloneDarkSvg = brandMarkStandaloneSvg(true);
await save("public/brand/ramupod-mark-standalone.svg", standaloneLightSvg + "\n");
await save("public/brand/ramupod-mark-standalone-dark.svg", standaloneDarkSvg + "\n");

// ── Capsule mark SVG (stadium pill bg) ────────────────────────────────
await save("public/brand/ramupod-mark-capsule.svg", brandMarkCapsuleSvg() + "\n");

// ── Helpers for placing marks in banners ──────────────────────────────────────
const font = 'font-family="Manrope, Helvetica, Arial, sans-serif"';
function markAt(x, y, height, darkMode = false, tile = false) {
  if (tile) {
    const scale = height / 1024;
    return `<g transform="translate(${x} ${y}) scale(${scale})">
<rect width="1024" height="1024" rx="${brandMark.radius}" fill="${brandMark.forest}"/>
<path fill="${brandMark.cream}" fill-rule="evenodd" d="${brandMark.whitePath}"/>
<path fill="${brandMark.lime}" fill-rule="evenodd" d="${brandMark.limePath}"/>
</g>`;
  }
  const scale = height / 480;
  return `<g transform="translate(${x - 90 * scale} ${y - 270 * scale}) scale(${scale})">
<path fill="${darkMode ? brandMark.cream : brandMark.forest}" fill-rule="evenodd" d="${brandMark.whitePath}"/>
<path fill="${brandMark.lime}" fill-rule="evenodd" d="${brandMark.limePath}"/>
</g>`;
}

// ── Wordmark SVG ──────────────────────────────────────────────────────────────
const wordmark = (
  `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="48" viewBox="0 0 260 48">` +
  markAt(0, 0, 48, false, false) +
  `<text x="96" y="34" ${font} font-size="32" font-weight="700" letter-spacing="-1" fill="${brandMark.forest}">${brand.wordmark}</text>` +
  `</svg>`
);
await save("public/brand/ramupod-wordmark.svg", wordmark + "\n");

// ── Social preview (1200×630 JPEG) ───────────────────────────────────────────
const [socialLead, socialTail] = brand.description.split(", and ");
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0A2726"/>
<rect x="915" y="256" width="380" height="380" rx="114" fill="${brandMark.forest}" transform="rotate(-12 1105 446)"/>
${markAt(82, 72, 76, true, false)}
<text x="230" y="125" ${font} font-size="44" font-weight="700" letter-spacing="-1.5" fill="${brandMark.cream}">${brand.wordmark}</text>
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

// ── Brand proof sheet (1200×580 PNG) ─────────────────────────────────────────
const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="580" viewBox="0 0 1200 580">
<rect width="600" height="580" fill="#F7F8FA"/><rect x="600" width="600" height="580" fill="#0E191D"/>
<text x="48" y="50" ${font} font-size="12" letter-spacing="2" fill="#747B80">STANDALONE / LIGHT</text>
<text x="648" y="50" ${font} font-size="12" letter-spacing="2" fill="#AFBEC0">STANDALONE / DARK</text>
${markAt(48, 88, 80, false, false)}${markAt(648, 88, 80, true, false)}
<text x="210" y="145" ${font} font-size="48" font-weight="700" letter-spacing="-2" fill="${brandMark.forest}">${brand.wordmark}</text>
<text x="810" y="145" ${font} font-size="48" font-weight="700" letter-spacing="-2" fill="${brandMark.cream}">${brand.wordmark}</text>
<text x="48" y="215" ${font} font-size="20" fill="${brandMark.forest}">${brand.tagline}</text>
<text x="648" y="215" ${font} font-size="20" fill="${brandMark.cream}">${brand.tagline}</text>
${markAt(48, 260, 80, false, true)}${markAt(648, 260, 80, false, true)}
<text x="152" y="295" ${font} font-size="12" fill="#747B80">APP ICON / FAVICON TILE</text>
<text x="752" y="295" ${font} font-size="12" fill="#AFBEC0">APP ICON / FAVICON TILE</text>
${[16, 24, 32, 48].map((size, i) => markAt(152 + i * 56, 315, size, false, true) + markAt(752 + i * 56, 315, size, false, true)).join("")}
<text x="48" y="430" ${font} font-size="12" letter-spacing="2" fill="#747B80">MONOCHROME (CURRENTCOLOR)</text>
<text x="648" y="430" ${font} font-size="12" letter-spacing="2" fill="#AFBEC0">MONOCHROME (CURRENTCOLOR)</text>
<g color="${brandMark.forest}">${markAt(48, 450, 60, false, false)}</g>
<g color="${brandMark.cream}">${markAt(648, 450, 60, true, false)}</g>
</svg>`;
await save(
  "public/brand/ramupod-preview.png",
  await sharp(Buffer.from(preview)).png().toBuffer()
);

// ── Verify raster formats ─────────────────────────────────────────────────────
for (const [path, format, width, height] of [
  ["public/apple-icon.png", "png", 180, 180],
  ["public/favicon-96x96.png", "png", 96, 96],
  ["public/brand/ramupod-logo-512.png", "png", 512, 512],
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
