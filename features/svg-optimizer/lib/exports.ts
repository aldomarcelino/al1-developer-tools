import { generate, parse, type Declaration } from "css-tree";
import {
  optimize,
  type CustomPlugin,
  type XastChild,
  type XastElement,
} from "svgo/browser";
import { isComponentName, type ExportFormat } from "./options.ts";
const quoted = (value: string) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
function reactAttribute(name: string): string | null {
  const special: Record<string, string> = {
    class: "className",
    for: "htmlFor",
    tabindex: "tabIndex",
    "xlink:href": "xlinkHref",
    "xmlns:xlink": "xmlnsXlink",
    "xml:space": "xmlSpace",
    "xml:lang": "xmlLang",
  };
  if (special[name]) return special[name];
  if (name.includes(":")) return null;
  if (/^(aria|data)-/.test(name)) return name;
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
function styleObject(source: string): string {
  const declarations = parse(source, { context: "declarationList" });
  if (declarations.type !== "DeclarationList") return "{}";
  const entries = new Map<string, { value: string; important: boolean }>();
  declarations.children.forEach((node) => {
    if (node.type !== "Declaration") return;
    const declaration = node as Declaration;
    let name = declaration.property.startsWith("--")
      ? declaration.property
      : declaration.property.replace(/-([a-z])/g, (_, letter: string) =>
          letter.toUpperCase()
        );
    if (name.startsWith("Ms")) name = `m${name.slice(1)}`;
    if (!entries.get(name)?.important || declaration.important)
      entries.set(name, {
        value: generate(declaration.value),
        important: !!declaration.important,
      });
  });
  return `{ ${[...entries].map(([name, entry]) => `${quoted(name)}: ${quoted(entry.value)}`).join(", ")} }`;
}
function toJsx(node: XastChild, root = false, level = 2, typedStyles = false): string {
  if (node.type === "text" || node.type === "cdata")
    return node.value ? `{${quoted(node.value)}}` : "";
  if (node.type !== "element" || node.name.includes(":")) return "";
  const attributes = Object.entries(node.attributes)
    .flatMap(([name, value]) => {
      const property = reactAttribute(name);
      if (!property) return [];
      return [
        ` ${property}={${name === "style" ? `${styleObject(value)}${typedStyles ? ' as import("react").CSSProperties' : ""}` : quoted(value)}}`,
      ];
    })
    .join("");
  const opening = `<${node.name}${attributes}${root ? " {...props}" : ""}`;
  const inline =
    ["text", "tspan", "textPath", "title", "desc", "style", "metadata"].includes(
      node.name
    ) ||
    node.children.some(
      (child) => (child.type === "text" || child.type === "cdata") && child.value.trim()
    );
  const children = node.children
    .filter((child) => inline || child.type !== "text" || child.value.trim())
    .map((child) => toJsx(child, false, level + 1, typedStyles))
    .filter(Boolean);
  if (!children.length) return `${opening} />`;
  return inline
    ? `${opening}>${children.join("")}</${node.name}>`
    : `${opening}>\n${children.map((child) => `${"  ".repeat(level + 1)}${child}`).join("\n")}\n${"  ".repeat(level)}</${node.name}>`;
}
export function svgExports(
  svg: string,
  componentName: string
): Record<ExportFormat, string> {
  if (!isComponentName(componentName))
    throw new Error(
      "Use a component name starting with an uppercase letter, followed by letters or digits (up to 60). Avoid React and SVGProps."
    );
  let root: XastElement | undefined;
  const capture: CustomPlugin = {
    name: "captureExport",
    fn: () => ({
      element: {
        enter(node, parent) {
          if (parent.type === "root") root = node;
        },
      },
    }),
  };
  optimize(svg, { plugins: [capture] });
  if (!root) throw new Error("No SVG to export.");
  const jsx = toJsx(root, true);
  const tsx = toJsx(root, true, 2, true);
  let binary = "";
  for (const byte of new TextEncoder().encode(svg)) binary += String.fromCharCode(byte);
  const encoded = encodeURIComponent(svg).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
  // v-pre keeps SVG text (including {{ ... }}) literal in a Vue template.
  const vue = optimize(svg, {
    plugins: [
      "removeXMLProcInst",
      "removeDoctype",
      {
        name: "literalVue",
        fn: () => ({
          element: {
            enter(node, parent) {
              if (parent.type === "root") node.attributes["v-pre"] = "";
            },
          },
        }),
      },
    ],
  }).data;
  return {
    svg,
    jsx: `export default function ${componentName}(props) {\n  return (\n    ${jsx}\n  );\n}\n`,
    tsx: `import type { SVGProps } from "react";\n\nexport default function ${componentName}(props: SVGProps<SVGSVGElement>) {\n  return (\n    ${tsx}\n  );\n}\n`,
    vue: `<template>\n  ${vue}\n</template>\n`,
    uri: `data:image/svg+xml;charset=utf-8,${encoded}`,
    base64: `data:image/svg+xml;base64,${btoa(binary)}`,
  };
}
