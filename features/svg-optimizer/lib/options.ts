export const svgLimits = {
  inputBytes: 512 * 1024,
  nodes: 10000,
  depth: 64,
  outputBytes: 8 * 1024 * 1024,
  timeoutMs: 5000,
};
export interface SvgOptions {
  instructions: boolean;
  metadata: boolean;
  empty: boolean;
  groups: boolean;
  numbers: boolean;
  precision: number;
  responsive: boolean;
  currentColor: boolean;
}
export const defaultOptions: SvgOptions = {
  instructions: true,
  metadata: true,
  empty: true,
  groups: true,
  numbers: true,
  precision: 3,
  responsive: true,
  currentColor: false,
};
export const optionLabels: {
  key: Exclude<keyof SvgOptions, "precision">;
  label: string;
}[] = [
  { key: "instructions", label: "Remove XML instructions & doctype" },
  { key: "metadata", label: "Remove comments & editor metadata" },
  { key: "empty", label: "Remove empty attributes & containers" },
  { key: "groups", label: "Collapse unnecessary groups" },
  { key: "numbers", label: "Minify numbers & path data" },
  { key: "responsive", label: "Responsive SVG (preserve viewBox)" },
  { key: "currentColor", label: "Convert fill / stroke to currentColor" },
];
export type ExportFormat = "svg" | "jsx" | "tsx" | "vue" | "uri" | "base64";
export const exportFormats: {
  value: ExportFormat;
  label: string;
  extension: string;
  mime: string;
}[] = [
  { value: "svg", label: "SVG", extension: "svg", mime: "image/svg+xml" },
  { value: "jsx", label: "React JSX", extension: "jsx", mime: "text/javascript" },
  { value: "tsx", label: "React TSX", extension: "tsx", mime: "text/typescript" },
  { value: "vue", label: "Vue", extension: "vue", mime: "text/plain" },
  { value: "uri", label: "Data URI · UTF-8", extension: "txt", mime: "text/plain" },
  { value: "base64", label: "Data URI · Base64", extension: "txt", mime: "text/plain" },
];
export type SvgDimensions = { viewBox: string; width: string; height: string };
export interface SvgResult {
  original: string;
  optimized: string;
  originalDimensions: SvgDimensions;
  optimizedDimensions: SvgDimensions;
  originalBytes: number;
  optimizedBytes: number;
  exports: Record<ExportFormat, string>;
  warnings: string[];
}
export type SvgRequest = { source: string; options: SvgOptions; componentName: string };
export type SvgResponse = { result: SvgResult } | { error: string };
export const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" fill="none">
  <!-- Exported from a vector editor. Try changing the optimization settings. -->
  <title>Folded layers</title>
  <metadata>Sample illustration - local SVG optimization demo</metadata>
  <g>
    <g>
      <rect x="20.0000" y="20.0000" width="200.0000" height="200.0000" rx="48.0000" fill="#E1FFC1" />
      <path d="M 64.123456 99.987654 L 120.000000 68.000000 L 175.876543 99.987654 L 120.000000 132.000000 Z" fill="#0E363C" />
      <path d="M 64.123456 120.000000 L 120.000000 152.000000 L 175.876543 120.000000" stroke="#0E363C" stroke-width="10.000000" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 64.123456 144.000000 L 120.000000 176.000000 L 175.876543 144.000000" stroke="#0E363C" stroke-width="10.000000" stroke-linecap="round" stroke-linejoin="round" />
      <g></g>
    </g>
  </g>
</svg>`;

export function isComponentName(value: string): boolean {
  return (
    /^[A-Z][A-Za-z0-9]*$/.test(value) &&
    value.length <= 60 &&
    !["React", "SVGProps"].includes(value)
  );
}
