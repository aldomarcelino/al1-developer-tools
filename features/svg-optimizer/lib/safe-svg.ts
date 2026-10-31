import { generate, parse, walk, lexer, type CssNode } from "css-tree";
import type { CustomPlugin, XastElement, XastParent } from "svgo/browser";
import { svgLimits } from "./options.ts";

const properties = new Set(
  "fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color color-interpolation color-interpolation-filters clip-path clip-rule mask filter stop-color stop-opacity flood-color flood-opacity lighting-color font-family font-size font-style font-weight font-variant text-anchor text-decoration dominant-baseline alignment-baseline letter-spacing word-spacing display visibility paint-order vector-effect transform transform-origin shape-rendering text-rendering image-rendering".split(
    " "
  )
);
const functions = new Set(
  "rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix var calc min max clamp matrix matrix3d translate translatex translatey translatez translate3d scale scalex scaley scalez scale3d rotate rotatex rotatey rotatez rotate3d skew skewx skewy perspective".split(
    " "
  )
);
export function safeCssValue(node: CssNode): boolean {
  let safe = true;
  walk(node, (child) => {
    if (child.type === "Url" && !/^#[a-z_][\w:.-]*$/i.test(child.value)) safe = false;
    if (
      child.type === "Raw" ||
      (child.type === "Function" && !functions.has(child.name.toLowerCase()))
    )
      safe = false;
  });
  return safe;
}
/** Reject CSS constructs that can load resources; do not clean CSS with string replacements. */
export function cleanCss(source: string, inline: boolean, currentColor = false): string {
  const ast = parse(source, {
    context: inline ? "declarationList" : "stylesheet",
    parseCustomProperty: true,
  });
  walk(ast, function (node, item, list) {
    if (node.type === "Atrule" || node.type === "Raw") {
      if (item && list) list.remove(item);
      return;
    }
    if (node.type === "Declaration") {
      if (
        (!properties.has(node.property.toLowerCase()) &&
          !node.property.startsWith("--")) ||
        !safeCssValue(node.value)
      ) {
        if (item && list) list.remove(item);
      } else if (
        currentColor &&
        /^(fill|stroke)$/i.test(node.property) &&
        isSolidPaint(generate(node.value))
      ) {
        const color = parse("currentColor", { context: "value" });
        if (color.type === "Value") node.value = color;
      }
    }
  });
  return generate(ast);
}
export function isSolidPaint(value: string): boolean {
  return (
    !/^(none|inherit|initial|unset|revert|currentcolor|transparent|context-fill|context-stroke)$/i.test(
      value.trim()
    ) && !!lexer.matchProperty("color", value).matched
  );
}
const allowedElements = new Set(
  "svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textpath title desc metadata style lineargradient radialgradient stop pattern clippath mask marker filter feblend fecolormatrix fecomponenttransfer fecomposite feconvolvematrix fediffuselighting fedisplacementmap fedistantlight fedropshadow feflood fefunca fefuncb fefuncg fefuncr fegaussianblur feimage femerge femergenode femorphology feoffset fepointlight fespecularlighting fespotlight fetile feturbulence image switch view".split(
    " "
  )
);
const forbiddenElements = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
  "discard",
  "handler",
  "listener",
]);
const blockedAttributes =
  /^(on|v-|:|@|#)|^(src|srcset|xml:base|dangerouslysetinnerhtml|innerhtml|ref|key|is)$/i;

/** Passive SVG profile shared by original preview, optimization and all exports. */
export function safetyPlugin(
  warnings: Set<string>,
  onRoot?: (node: XastElement) => void
): CustomPlugin {
  let count = 0;
  let rootElement: XastElement | undefined;
  const depths = new WeakMap<object, number>();
  return {
    name: "passiveSvg",
    fn: () => ({
      root: {
        enter(root) {
          const elements = root.children.filter((child) => child.type === "element");
          if (elements.length !== 1 || elements[0].name !== "svg")
            throw new Error("Enter a complete SVG with a single <svg> root.");
        },
      },
      instruction: {
        enter(node, parent) {
          if (node.name.toLowerCase() !== "xml") {
            remove(node, parent);
            warnings.add(
              "Unsupported or active content and external references were removed."
            );
          }
        },
      },
      element: {
        enter(node, parent) {
          count++;
          const depth = (depths.get(parent) ?? 0) + 1;
          depths.set(node, depth);
          if (count > svgLimits.nodes || depth > svgLimits.depth)
            throw new Error("Keep SVGs within 10,000 elements and 64 nested levels.");
          if (parent.type === "root") rootElement = node;
          const local = node.name.split(":").at(-1)!.toLowerCase();
          if (local === "a") node.name = "g";
          if (
            forbiddenElements.has(local) ||
            (local !== "a" && (!allowedElements.has(local) || node.name.includes(":")))
          ) {
            remove(node, parent);
            warnings.add(
              "Unsupported or active content and external references were removed."
            );
            return;
          }
          for (const [name, value] of Object.entries(node.attributes)) {
            if (
              (name.includes(":") &&
                ![
                  "xmlns:xlink",
                  "xlink:href",
                  "xlink:title",
                  "xml:space",
                  "xml:lang",
                ].includes(name)) ||
              blockedAttributes.test(name) ||
              (/^(href|xlink:href)$/i.test(name) && !/^#[a-z_][\w:.-]*$/i.test(value)) ||
              (/^xmlns(?::|$)/.test(name) && name !== "xmlns:xlink")
            ) {
              delete node.attributes[name];
              if (!name.startsWith("xmlns"))
                warnings.add(
                  "Unsupported or active content and external references were removed."
                );
              continue;
            }
            if (name.startsWith("xlink:") && rootElement)
              rootElement.attributes["xmlns:xlink"] = "http://www.w3.org/1999/xlink";
            if (name === "xmlns:xlink")
              node.attributes[name] = "http://www.w3.org/1999/xlink";
            if (name === "style") {
              const clean = cleanCss(value, true);
              if (clean !== value)
                warnings.add(
                  "Styles were normalized; unsupported CSS and external resources were removed."
                );
              node.attributes[name] = clean;
            } else if (/url\s*\(|\\/i.test(value)) {
              try {
                if (!safeCssValue(parse(value, { context: "value" }))) {
                  delete node.attributes[name];
                  warnings.add(
                    "Unsupported or active content and external references were removed."
                  );
                }
              } catch {
                delete node.attributes[name];
                warnings.add(
                  "Unsupported or active content and external references were removed."
                );
              }
            }
          }
          if (local === "style") {
            const source = node.children
              .filter((child) => child.type === "text" || child.type === "cdata")
              .map((child) => child.value)
              .join("");
            const clean = cleanCss(source, false);
            if (source !== clean)
              warnings.add(
                "Styles were normalized; unsupported CSS and external resources were removed."
              );
            node.children = [{ type: "text", value: clean }];
          }
          if (parent.type === "root") {
            node.attributes.xmlns = "http://www.w3.org/2000/svg";
            onRoot?.(node);
          }
        },
      },
    }),
  };
}
function remove(node: XastParent["children"][number], parent: XastParent) {
  parent.children = parent.children.filter((child) => child !== node);
}
