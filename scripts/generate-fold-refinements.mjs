import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../public/brand/concepts/ramu-fold/refinements/", import.meta.url);
await mkdir(root, { recursive: true });
const forest = "#103E3B",
  lime = "#CBF58C",
  cream = "#F5F9EF";
const original =
  "M18 12H49C67.225 12 82 26.775 82 45V51H64V45C64 36.716 57.284 30 49 30H36V48H18V12Z";
const sculpted =
  "M18 12H49C67.225 12 82 26.775 82 45V49L64 53V45C64 36.716 57.284 30 49 30H36V41L18 45V12Z";
const compact =
  "M16 12H50C68.778 12 84 27.222 84 46V48H62V46C62 39.373 56.627 34 50 34H38V45H16V12Z";
const variants = [
  {
    id: "fold-sculpted",
    name: "01 / FOLD",
    sub: "Lebih terarah",
    path: sculpted,
    description: "Potongan diagonal memperjelas dua pita yang berpadu.",
  },
  {
    id: "fold-flow",
    name: "02 / FLOW",
    sub: "Lebih mengalir",
    path: sculpted,
    angle: -45,
    scale: 0.85,
    description: "Rotasi membuka siluet dan memberi arah gerak.",
  },
  {
    id: "fold-core",
    name: "03 / CORE",
    sub: "Lebih padat",
    path: compact,
    description: "Pita lebih tebal, ruang tengah lebih ringkas.",
  },
];
function glyph(v, ink = forest, accent = lime) {
  const pair = `<path d="${v.path}" fill="${ink}"/><path d="${v.path}" transform="rotate(180 50 50)" fill="${accent}"/>`;
  return `<g transform="translate(50 50) rotate(${v.angle ?? 0}) scale(${v.scale ?? 1}) translate(-50 -50)">${pair}</g>`;
}
function mark(v, x, y, size, ink = forest, accent = lime) {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${glyph(v, ink, accent)}</g>`;
}
for (const v of variants) {
  for (const [suffix, ink, accent] of [
    ["", forest, lime],
    ["-mono", forest, forest],
    ["-dark", cream, lime],
  ]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${glyph(v, ink, accent)}</svg>`;
    await writeFile(new URL(`${v.id}${suffix}.svg`, root), svg + "\n");
  }
}
const font = 'font-family="Manrope, Helvetica, Arial, sans-serif"';
let contents = `<rect width="1440" height="1090" fill="#F7F8FA"/>
<text x="48" y="55" ${font} font-size="12" letter-spacing="2" fill="#747B80">RAMUPOD / FOLD REFINEMENTS</text>
<text x="48" y="107" ${font} font-size="37" font-weight="700" letter-spacing="-1.3" fill="${forest}">Satu gagasan. Tiga karakter.</text>
<text x="48" y="143" ${font} font-size="15" fill="#747B80">Mempertajam bentuk dua pita yang saling melengkapi.</text>`;
variants.forEach((v, i) => {
  const x = 24 + i * 472;
  contents += `<rect x="${x}" y="181" width="448" height="396" rx="24" fill="${forest}"/>
 <text x="${x + 28}" y="222" ${font} font-size="12" font-weight="600" letter-spacing="1.8" fill="#B5C8BE">${v.name}</text>
 ${mark(v, x + 81, 235, 286, cream, lime)}
 <text x="${x + 224}" y="549" text-anchor="middle" ${font} font-size="15" fill="${cream}">${v.sub}</text>
 ${mark(v, x + 42, 604, 66)}<text x="${x + 122}" y="648" ${font} font-size="32" font-weight="700" letter-spacing="-1.2" fill="${forest}">ramupod</text>
 <text x="${x + 28}" y="708" ${font} font-size="12.5" fill="#747B80">${v.description}</text>
 <rect x="${x}" y="747" width="448" height="204" rx="20" fill="#EEF3F2"/>
 <text x="${x + 26}" y="784" ${font} font-size="11" letter-spacing="1.4" fill="#747B80">ONE COLOR / SMALL SIZE</text>
 ${mark(v, x + 24, 800, 124, forest, forest)}
 ${mark(v, x + 202, 841, 44, forest, forest)}${mark(v, x + 292, 854, 24, forest, forest)}
 <text x="${x + 224}" y="927" text-anchor="middle" ${font} font-size="11" fill="#747B80">32 px</text><text x="${x + 304}" y="927" text-anchor="middle" ${font} font-size="11" fill="#747B80">16 px</text>`;
});
contents += `<path d="M48 988H1392" stroke="#DDE5E2"/>
${mark({ path: original }, 42, 1002, 64, forest, forest)}
<text x="120" y="1034" ${font} font-size="13" font-weight="600" fill="${forest}">Ramu Fold sebelumnya</text>
<text x="120" y="1057" ${font} font-size="12" fill="#747B80">Arah dasarnya dipertahankan; proporsi, potongan, dan ritmenya disempurnakan.</text>
<text x="1392" y="1057" text-anchor="end" ${font} font-size="11" fill="#747B80">Eksplorasi · belum diterapkan ke situs</text>`;
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1090" viewBox="0 0 1440 1090">${contents}</svg>`;
await writeFile(new URL("fold-refinements.svg", root), board + "\n");
await writeFile(
  new URL("fold-refinements.png", root),
  await sharp(Buffer.from(board)).png().toBuffer()
);
console.log(
  "Created three refinements of Ramu Fold, editable SVGs, and comparison board."
);
