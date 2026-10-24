/**
 * JSON to TypeScript Interface / Type Converter Engine
 * Converts raw JSON objects and arrays into clean, idiomatic TypeScript definitions.
 */

export interface JsonToTsOptions {
  rootName?: string;
  useInterface?: boolean; // interface vs type
  exportTypes?: boolean; // export interface vs interface
  readonlyProps?: boolean; // readonly id: string
  optionalProps?: boolean; // id?: string
  detectOptionalFromArray?: boolean; // if item in array lacks key, make it optional
}

export interface JsonToTsResult {
  success: boolean;
  code: string;
  error?: string;
  typeCount: number;
}

const TS_RESERVED_WORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "any",
  "unknown",
  "never",
  "number",
  "string",
  "boolean",
  "symbol",
  "bigint",
  "undefined",
]);

// Convert string to valid PascalCase identifier safe for TypeScript AST
export function toPascalCase(str: string): string {
  // Treat non-alphanumeric characters as word delimiters
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, " ").trim();
  if (!cleaned) return "Item";

  let pascal = cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  // TypeScript identifiers cannot start with a digit
  if (/^[0-9]/.test(pascal)) {
    pascal = `Type${pascal}`;
  }

  // Guard against TS reserved keywords collision
  if (TS_RESERVED_WORDS.has(pascal.toLowerCase())) {
    pascal = `Type${pascal}`;
  }

  // Safety length limit to prevent UI/AST DoS
  return pascal.slice(0, 48);
}

// Check if property name requires quotes
function formatPropKey(key: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return key;
  }
  return JSON.stringify(key);
}

export function jsonToTypeScript(
  jsonInput: string,
  options: JsonToTsOptions = {}
): JsonToTsResult {
  const trimmed = jsonInput.trim();
  if (!trimmed) {
    return {
      success: true,
      code: "",
      typeCount: 0,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax.";
    return {
      success: false,
      code: "",
      error: `JSON Parse Error: ${message}`,
      typeCount: 0,
    };
  }

  const {
    rootName = "Root",
    useInterface = true,
    exportTypes = true,
    readonlyProps = false,
    optionalProps = false,
  } = options;

  const typeDefinitions: Map<string, string> = new Map();
  const generatedNames = new Set<string>();

  function getUniqueTypeName(baseName: string): string {
    let name = toPascalCase(baseName);
    if (!name || name === "Array" || name === "Object") name = "Entity";
    let candidate = name;
    let counter = 2;
    while (generatedNames.has(candidate)) {
      candidate = `${name}${counter}`;
      counter++;
    }
    generatedNames.add(candidate);
    return candidate;
  }

  function resolveType(val: unknown, propName: string): string {
    if (val === null) return "unknown | null";
    if (val === undefined) return "undefined";

    const typeOf = typeof val;
    if (typeOf === "string") return "string";
    if (typeOf === "number") return "number";
    if (typeOf === "boolean") return "boolean";

    if (Array.isArray(val)) {
      if (val.length === 0) return "unknown[]";

      // Check if array has primitive types or objects
      const elementTypes = new Set<string>();
      const objectItems: Record<string, unknown>[] = [];

      for (const item of val) {
        if (item === null) {
          elementTypes.add("null");
        } else if (typeof item === "object" && !Array.isArray(item)) {
          objectItems.push(item as Record<string, unknown>);
        } else {
          elementTypes.add(typeof item);
        }
      }

      if (objectItems.length > 0) {
        // Merge object schemas
        const mergedObj: Record<string, unknown> = {};
        for (const obj of objectItems) {
          Object.assign(mergedObj, obj);
        }
        const itemTypeName = getUniqueTypeName(
          propName.endsWith("s") ? propName.slice(0, -1) : `${propName}Item`
        );
        createTypeDef(itemTypeName, mergedObj);
        elementTypes.add(itemTypeName);
      }

      const typesArr = Array.from(elementTypes);
      if (typesArr.length === 1) {
        return `${typesArr[0]}[]`;
      }
      return `(${typesArr.join(" | ")})[]`;
    }

    if (typeOf === "object") {
      const typeName = getUniqueTypeName(propName);
      createTypeDef(typeName, val as Record<string, unknown>);
      return typeName;
    }

    return "unknown";
  }

  function createTypeDef(typeName: string, obj: Record<string, unknown>): void {
    const lines: string[] = [];
    const exportPrefix = exportTypes ? "export " : "";

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      if (useInterface) {
        typeDefinitions.set(
          typeName,
          `${exportPrefix}interface ${typeName} {\n  [key: string]: unknown;\n}`
        );
      } else {
        typeDefinitions.set(
          typeName,
          `${exportPrefix}type ${typeName} = Record<string, unknown>;`
        );
      }
      return;
    }

    for (const [key, val] of entries) {
      const fieldKey = formatPropKey(key);
      const isOpt = optionalProps ? "?" : "";
      const isReadonly = readonlyProps ? "readonly " : "";
      const fieldType = resolveType(val, key);
      lines.push(`  ${isReadonly}${fieldKey}${isOpt}: ${fieldType};`);
    }

    if (useInterface) {
      typeDefinitions.set(
        typeName,
        `${exportPrefix}interface ${typeName} {\n${lines.join("\n")}\n}`
      );
    } else {
      typeDefinitions.set(
        typeName,
        `${exportPrefix}type ${typeName} = {\n${lines.join("\n")}\n};`
      );
    }
  }

  // Handle Root
  const rootPascal = toPascalCase(rootName) || "Root";
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
      const merged: Record<string, unknown> = {};
      for (const item of parsed) {
        if (typeof item === "object" && item !== null) {
          Object.assign(merged, item);
        }
      }
      const itemType = `${rootPascal}Item`;
      createTypeDef(itemType, merged);
      const exportPrefix = exportTypes ? "export " : "";
      typeDefinitions.set(
        rootPascal,
        `${exportPrefix}type ${rootPascal} = ${itemType}[];`
      );
    } else {
      const elemType = parsed.length > 0 ? typeof parsed[0] : "unknown";
      const exportPrefix = exportTypes ? "export " : "";
      typeDefinitions.set(
        rootPascal,
        `${exportPrefix}type ${rootPascal} = ${elemType}[];`
      );
    }
  } else if (typeof parsed === "object" && parsed !== null) {
    createTypeDef(rootPascal, parsed as Record<string, unknown>);
  } else {
    const exportPrefix = exportTypes ? "export " : "";
    typeDefinitions.set(
      rootPascal,
      `${exportPrefix}type ${rootPascal} = ${typeof parsed};`
    );
  }

  const generatedCode = Array.from(typeDefinitions.values()).join("\n\n");
  return {
    success: true,
    code: generatedCode,
    typeCount: typeDefinitions.size,
  };
}

export const sampleJsonForTs = `{
  "id": 101,
  "name": "Jane Developer",
  "email": "jane@example.com",
  "isActive": true,
  "roles": ["admin", "developer"],
  "profile": {
    "bio": "Building high-performance client tools.",
    "avatarUrl": "https://example.com/avatar.png",
    "reputation": 4200
  },
  "metadata": {
    "lastLogin": "2026-10-24T14:48:00Z",
    "ipAddress": "192.168.1.1",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}`;
