import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const root = new URL("../public/brand/concepts/", import.meta.url);
await mkdir(root, { recursive: true });
const forest = "#103E3B",
  lime = "#CBF58C",
  cream = "#F5F9EF";
const concepts = [
  {
    id: "capsule-cutout",
    label: "01 / CAPSULE CUTOUT",
    title: "Kapsul dengan r di dalam",
    description: "Siluet kapsul utuh, r sebagai ruang negatif.",
    draw(ink, accent, paper) {
      return `<path d="M34 22H66A28 28 0 0 1 66 78H34A28 28 0 0 1 34 22Z" fill="${ink}"/>
      <path d="M67 22A28 28 0 0 1 66 78H57L67 22Z" fill="${accent}"/>
      <path d="M62 22H66L56 78H52L62 22Z" fill="${paper}"/>
      <path d="M29 66V35H38V41C42 36 46 34 53 35V45C44 43 39 47 39 55V66H29Z" fill="${paper}"/>`;
    },
  },
  {
    id: "capsule-r",
    label: "02 / CAPSULE R",
    title: "Huruf R dibentuk dari kapsul",
    description: "Lengkung kapsul menjadi bagian hurufnya.",
    draw(ink, accent) {
      return `<path d="M22 81V20" fill="none" stroke="${ink}" stroke-width="16" stroke-linecap="round"/>
      <path d="M22 20H57C69 20 77 27 77 37C77 47 69 54 57 54H22" fill="none" stroke="${ink}" stroke-width="16" stroke-linejoin="round"/>
      <path d="M53 55L76 81" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>`;
    },
  },
  {
    id: "diagonal-pod",
    label: "03 / DIAGONAL POD",
    title: "Kapsul miring + monogram",
    description: "R kapital sebagai potongan di tengah kapsul.",
    draw(ink, accent, paper) {
      return `<g transform="rotate(36 50 50)"><rect x="23" y="7" width="54" height="86" rx="27" fill="${ink}"/>
      <path d="M23 66H77A27 27 0 0 1 23 66Z" fill="${accent}"/></g>
      <path d="M36 69V30H51C61 30 66 35 66 43C66 49 63 53 58 55L68 69H56L46 55H46V69H36ZM46 39V46H51C54 46 56 45 56 42.5C56 40 54 39 51 39H46Z" fill="${paper}" fill-rule="evenodd"/>`;
    },
  },
];
function icon(concept, x, y, size, dark = false, mono = false) {
  const ink = dark ? cream : forest;
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${concept.draw(ink, mono ? ink : lime, dark ? "#0E191D" : "#F7F8FA")}</g>`;
}
for (const concept of concepts) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${concept.draw(forest, lime, cream)}</svg>`;
  await writeFile(new URL(`${concept.id}.svg`, root), svg + "\n");
  await writeFile(
    new URL(`${concept.id}-dark.svg`, root),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${concept.draw(cream, lime, "#0E191D")}</svg>\n`
  );
}
const font = 'font-family="Manrope, Helvetica, Arial, sans-serif"';
let content = `<rect width="1440" height="1040" fill="#F7F8FA"/>
<text x="56" y="62" ${font} font-size="13" fill="#747B80" letter-spacing="2">RAMUPOD / CAPSULE EXPLORATIONS</text>
<text x="56" y="112" ${font} font-size="32" font-weight="700" fill="${forest}" letter-spacing="-1">Kapsul × huruf r</text>
<text x="56" y="148" ${font} font-size="15" fill="#747B80">Tiga cara menyatukan bentuk kapsul dan identitas Ramupod.</text>
<path d="M480 192V1000M960 192V1000" stroke="#DDE5E2"/>`;
concepts.forEach((c, i) => {
  const x = i * 480;
  content += `<text x="${x + 40}" y="218" ${font} font-size="12" font-weight="600" fill="#526B67" letter-spacing="1.4">${c.label}</text>
 ${icon(c, x + 118, 245, 244)}
 <text x="${x + 240}" y="536" text-anchor="middle" ${font} font-size="30" font-weight="700" fill="${forest}" letter-spacing="-1">ramupod</text>
 <text x="${x + 240}" y="586" text-anchor="middle" ${font} font-size="18" font-weight="600" fill="${forest}">${c.title}</text>
 <text x="${x + 240}" y="616" text-anchor="middle" ${font} font-size="13" fill="#747B80">${c.description}</text>
 <rect x="${x + 24}" y="658" width="432" height="158" rx="18" fill="#0E191D"/>
 ${icon(c, x + 64, 690, 92, true)}
 <text x="${x + 172}" y="746" ${font} font-size="29" font-weight="700" letter-spacing="-1" fill="${cream}">ramupod</text>
 <text x="${x + 40}" y="866" ${font} font-size="11" fill="#747B80" letter-spacing="1.2">MONOCHROME / SMALL SIZE</text>
 ${icon(c, x + 40, 888, 70, false, true)}${icon(c, x + 160, 908, 32)}${icon(c, x + 220, 912, 24)}
 <text x="${x + 40}" y="999" ${font} font-size="12" fill="#747B80">Konsep eksplorasi · belum mengganti logo situs</text>`;
});
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1040" viewBox="0 0 1440 1040">${content}</svg>`;
await writeFile(new URL("capsule-directions.svg", root), board + "\n");
await writeFile(
  new URL("capsule-directions.png", root),
  await sharp(Buffer.from(board)).png().toBuffer()
);
console.log("Saved 3 editable SVG concepts and the capsule comparison board.");
