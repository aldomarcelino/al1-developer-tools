import { parseDocument, stringify } from "yaml";

export const maxInputBytes = 512 * 1024;
export type YamlDirection = "json-to-yaml" | "yaml-to-json";
export interface Conversion {
  output: string;
  warnings: string[];
}

/** Restrict YAML to values JSON can represent; never silently discard data. */
function jsonCompatible(input: unknown): unknown {
  let nodes = 0;
  const active = new WeakSet<object>();
  function visit(value: unknown, depth: number): unknown {
    if (++nodes > 50_000 || depth > 60)
      throw new Error(
        "Data is too deeply nested or complex (60 levels / 50,000 values maximum)."
      );
    if (value === null || typeof value === "string" || typeof value === "boolean")
      return value;
    if (typeof value === "bigint") {
      if (
        value > BigInt(Number.MAX_SAFE_INTEGER) ||
        value < BigInt(Number.MIN_SAFE_INTEGER)
      )
        throw new Error(
          "An integer exceeds safe JSON number precision. Quote large integer IDs as strings."
        );
      return Number(value);
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value))
        throw new Error("JSON cannot represent NaN or Infinity.");
      if (Number.isInteger(value) && !Number.isSafeInteger(value))
        throw new Error(
          "An integer exceeds safe JSON number precision. Quote large integer IDs as strings."
        );
      return value;
    }
    if (!value || typeof value !== "object")
      throw new Error("This value cannot be represented in JSON.");
    if (active.has(value))
      throw new Error("Circular YAML aliases cannot be converted to JSON.");
    active.add(value);
    let result: unknown;
    if (Array.isArray(value)) result = value.map((item) => visit(item, depth + 1));
    else {
      if (
        !(value instanceof Map) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      ) {
        throw new Error(
          "This YAML type cannot be represented in JSON. Use only core YAML 1.2 types."
        );
      }
      const entries = value instanceof Map ? [...value.entries()] : Object.entries(value);
      result = Object.fromEntries(
        entries.map(([key, item]) => {
          if (typeof key !== "string")
            throw new Error("JSON object keys must be strings. Quote numeric YAML keys.");
          return [key, visit(item, depth + 1)];
        })
      );
    }
    active.delete(value);
    return result;
  }
  return visit(input, 0);
}

export function convertYaml(input: string, direction: YamlDirection): Conversion {
  if (new TextEncoder().encode(input).byteLength > maxInputBytes)
    throw new Error("Keep input within 512 KB of UTF-8 text.");
  if (!input.trim()) throw new Error("Enter JSON or YAML first.");
  if (direction !== "json-to-yaml" && direction !== "yaml-to-json")
    throw new Error("Choose a supported conversion direction.");
  let output: string;
  const warnings: string[] = [];
  if (direction === "json-to-yaml") {
    output = stringify(jsonCompatible(JSON.parse(input)), {
      indent: 2,
      lineWidth: 0,
      aliasDuplicateObjects: false,
    });
  } else {
    const document = parseDocument(input, {
      version: "1.2",
      schema: "core",
      resolveKnownTags: false,
      uniqueKeys: true,
      strict: true,
      intAsBigInt: true,
    });
    if (document.errors.length) throw new Error(document.errors[0].message);
    if (document.warnings.length) throw new Error(document.warnings[0].message);
    output = JSON.stringify(
      jsonCompatible(document.toJS({ mapAsMap: true, maxAliasCount: 50 })),
      null,
      2
    );
    warnings.push(
      "JSON does not retain YAML comments, anchors, or original formatting. YAML 1.2 core types are used; custom tags and merge-key expansion are not supported."
    );
  }
  if (new TextEncoder().encode(output).byteLength > 2 * 1024 * 1024)
    throw new Error("Converted output exceeds 2 MB. Use a smaller document.");
  return { output, warnings };
}
