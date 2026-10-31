import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../public/brand/concepts/ramu-fold/", import.meta.url);
await mkdir(root, { recursive: true });
const forest = "#103E3B",
  lime = "#CBF58C",
  cream = "#F5F9EF",
  dark = "#0E191D";
// Two folded, capsule-ended ribbons, joined visually by an open central channel.
const ribbon =
  "M18 12H49C67.225 12 82 26.775 82 45V51H64V45C64 36.716 57.284 30 49 30H36V48H18V12Z";
function glyph(ink = forest, accent = lime) {
  return `<path d="${ribbon}" fill="${ink}"/><path d="${ribbon}" transform="rotate(180 50 50)" fill="${accent}"/>`;
}
function mark(x, y, size, ink = forest, accent = lime, angle = 0) {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})"><g transform="rotate(${angle} 50 50)">${glyph(ink, accent)}</g></g>`;
}
const font = 'font-family="Manrope, Helvetica, Arial, sans-serif"';
for (const [name, ink, accent] of [
  ["ramu-fold", forest, lime],
  ["ramu-fold-mono", forest, forest],
  ["ramu-fold-dark", cream, lime],
]) {
  await writeFile(
    new URL(`${name}.svg`, root),
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="8 8 84 84">${glyph(ink, accent)}</svg>\n`
  );
}
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1060" viewBox="0 0 1440 1060">
<rect width="1440" height="1060" fill="#F7F8FA"/>
<text x="56" y="56" ${font} font-size="12" letter-spacing="2" fill="#747B80">RAMUPOD / IDENTITY STUDY 02</text>
<text x="56" y="112" ${font} font-size="38" font-weight="700" letter-spacing="-1.5" fill="${forest}">Ramu Fold</text>
<text x="56" y="146" ${font} font-size="16" fill="#747B80">Dua bagian. Satu tempat untuk meramu.</text>
<rect x="32" y="190" width="674" height="410" rx="28" fill="${forest}"/>
${mark(216, 207, 334, cream, lime)}
<text x="369" y="562" text-anchor="middle" ${font} font-size="12" letter-spacing="1.5" fill="#B5C8BE">THE SYMBOL</text>
<text x="768" y="286" ${font} font-size="72" font-weight="700" letter-spacing="-3" fill="${forest}">ramupod</text>
<text x="772" y="339" ${font} font-size="24" fill="${forest}">Useful tools. Less effort.</text>
<path d="M772 384H1374" stroke="#DDE5E2"/>
<text x="772" y="430" ${font} font-size="17" font-weight="600" fill="${forest}">Dua pita melipat dan saling melengkapi.</text>
<text x="772" y="463" ${font} font-size="15" fill="#747B80">Ujung membulat mengambil karakter kapsul.</text>
<text x="772" y="490" ${font} font-size="15" fill="#747B80">Celah tengah menyatukan dua bagian dalam satu siluet.</text>
<text x="772" y="540" ${font} font-size="12" letter-spacing="1.3" fill="#747B80">COMBINE / SIMPLIFY / MAKE ROOM</text>
<rect x="32" y="626" width="436" height="250" rx="22" fill="#EEF3F2"/>
<text x="60" y="665" ${font} font-size="11" letter-spacing="1.6" fill="#747B80">ONE COLOR</text>
${mark(149, 674, 174, forest, forest)}
<rect x="490" y="626" width="436" height="250" rx="22" fill="${dark}"/>
<text x="518" y="665" ${font} font-size="11" letter-spacing="1.6" fill="#AFBEC0">APP ICON</text>
<rect x="647" y="690" width="122" height="122" rx="32" fill="${forest}"/>
${mark(655, 698, 106, cream, lime)}
<rect x="948" y="626" width="460" height="250" rx="22" fill="#EEF3F2"/>
<text x="976" y="665" ${font} font-size="11" letter-spacing="1.6" fill="#747B80">AT EVERYDAY SIZES</text>
${mark(1004, 714, 68)}${mark(1110, 732, 42)}${mark(1190, 742, 26)}
<text x="1038" y="816" text-anchor="middle" ${font} font-size="12" fill="#747B80">48</text><text x="1131" y="816" text-anchor="middle" ${font} font-size="12" fill="#747B80">32</text><text x="1203" y="816" text-anchor="middle" ${font} font-size="12" fill="#747B80">16</text>
<rect x="32" y="902" width="1376" height="114" rx="22" fill="white" stroke="#E5E8E9"/>
${mark(56, 919, 76)}<text x="142" y="968" ${font} font-size="28" font-weight="700" letter-spacing="-1" fill="${forest}">ramupod</text>
<text x="600" y="966" ${font} font-size="14" fill="#747B80">Home</text><text x="682" y="966" ${font} font-size="14" fill="#747B80">Tools</text><text x="762" y="966" ${font} font-size="14" fill="#747B80">Our approach</text>
<rect x="1168" y="933" width="208" height="50" rx="25" fill="${forest}"/><text x="1272" y="964" text-anchor="middle" ${font} font-size="13" fill="${cream}" font-weight="600">Open workspace ↗</text>
<text x="56" y="1044" ${font} font-size="11" fill="#747B80">Eksplorasi konsep · belum diterapkan ke situs</text>
</svg>`;
await writeFile(new URL("ramu-fold-board.svg", root), board + "\n");
await writeFile(
  new URL("ramu-fold-board.png", root),
  await sharp(Buffer.from(board)).png().toBuffer()
);
console.log("Generated Ramu Fold identity study and editable vector marks.");
