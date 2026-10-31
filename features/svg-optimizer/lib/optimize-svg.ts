import { optimize, type CustomPlugin, type Config, type XastElement } from "svgo/browser";
import { svgExports } from "./exports.ts";
import { safetyPlugin, cleanCss, isSolidPaint } from "./safe-svg.ts";
import {
  svgLimits,
  type SvgDimensions,
  type SvgRequest,
  type SvgResult,
} from "./options.ts";
const size = (value: string) => new TextEncoder().encode(value).length;
const dimensions = (node: XastElement): SvgDimensions => ({
  viewBox: node.attributes.viewBox ?? "",
  width: node.attributes.width ?? "",
  height: node.attributes.height ?? "",
});
function validateDimensions(node: XastElement) {
  if (!node.attributes.viewBox) return;
  const values = node.attributes.viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value) || Math.abs(value) > 1e7) ||
    values[2] <= 0 ||
    values[3] <= 0
  )
    throw new Error(
      "Use a valid viewBox with positive width and height (coordinates within ±10,000,000)."
    );
}
export function optimizeSvg({ source, options, componentName }: SvgRequest): SvgResult {
  if (!source.trim()) throw new Error("Paste SVG code or choose a .svg file.");
  if (size(source) > svgLimits.inputBytes)
    throw new Error("Keep SVG input within 512 KB.");
  if (/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(source))
    throw new Error(
      "SVGs with entity declarations or internal DTD subsets are not supported."
    );
  if (
    !Number.isInteger(options.precision) ||
    options.precision < 1 ||
    options.precision > 5
  )
    throw new Error("Choose decimal precision from 1 to 5.");
  const warnings = new Set<string>();
  let originalDimensions: SvgDimensions = { viewBox: "", width: "", height: "" };
  const original = optimize(source, {
    plugins: [
      safetyPlugin(warnings, (node) => {
        validateDimensions(node);
        originalDimensions = dimensions(node);
      }),
    ],
  }).data;
  const plugins: NonNullable<Config["plugins"]> = [];
  if (options.instructions) plugins.push("removeDoctype", "removeXMLProcInst");
  if (options.metadata)
    plugins.push(
      { name: "removeComments", params: { preservePatterns: false } },
      "removeMetadata",
      "removeEditorsNSData"
    );
  if (options.empty)
    plugins.push("removeEmptyAttrs", "removeEmptyContainers", "removeEmptyText");
  if (options.groups) plugins.push("collapseGroups");
  if (options.numbers)
    plugins.push(
      { name: "cleanupNumericValues", params: { floatPrecision: options.precision } },
      { name: "convertPathData", params: { floatPrecision: options.precision } },
      {
        name: "convertTransform",
        params: {
          floatPrecision: options.precision,
          transformPrecision: options.precision,
        },
      }
    );
  if (options.responsive) {
    const responsive: CustomPlugin = {
      name: "responsiveSvg",
      fn: () => ({
        element: {
          enter(node, parent) {
            if (parent.type !== "root") return;
            if (!node.attributes.viewBox) {
              const length = (value = "") =>
                /^\d*\.?\d+(?:e[+-]?\d+)?(?:px)?$/i.test(value.trim())
                  ? Number(value.trim().replace(/px$/i, ""))
                  : NaN;
              const width = length(node.attributes.width),
                height = length(node.attributes.height);
              if (
                Number.isFinite(width) &&
                Number.isFinite(height) &&
                width > 0 &&
                height > 0 &&
                width <= 1e7 &&
                height <= 1e7
              )
                node.attributes.viewBox = `0 0 ${width} ${height}`;
            }
            if (node.attributes.viewBox) {
              delete node.attributes.width;
              delete node.attributes.height;
            } else
              warnings.add(
                "Responsive conversion needs a viewBox or positive numeric / px dimensions; original dimensions were retained."
              );
          },
        },
      }),
    };
    plugins.push(responsive);
  }
  if (options.currentColor) {
    const colors: CustomPlugin = {
      name: "iconColors",
      fn: () => ({
        element: {
          enter(node) {
            for (const key of ["fill", "stroke"])
              if (node.attributes[key] && isSolidPaint(node.attributes[key]))
                node.attributes[key] = "currentColor";
            if (node.attributes.style)
              node.attributes.style = cleanCss(node.attributes.style, true, true);
            if (node.name === "style")
              for (const child of node.children)
                if (child.type === "text")
                  child.value = cleanCss(child.value, false, true);
          },
        },
      }),
    };
    plugins.push(colors);
    warnings.add(
      "currentColor makes solid fill / stroke colors monochrome. none, transparent, gradients and CSS variables are preserved."
    );
  }
  let optimizedDimensions: SvgDimensions = originalDimensions;
  plugins.push(
    safetyPlugin(warnings, (node) => {
      optimizedDimensions = dimensions(node);
    })
  );
  const optimized = optimize(original, { plugins, js2svg: { pretty: false } }).data;
  const exports = svgExports(optimized, componentName);
  if (
    Object.values(exports).reduce((sum, text) => sum + size(text), 0) >
    svgLimits.outputBytes
  )
    throw new Error("Combined exports exceed 8 MB. Simplify the SVG.");
  return {
    original,
    optimized,
    originalDimensions,
    optimizedDimensions,
    originalBytes: size(source),
    optimizedBytes: size(optimized),
    exports,
    warnings: [...warnings],
  };
}
