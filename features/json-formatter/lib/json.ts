export function unwrapStringifiedJson(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  const looksLikeJsonStructure = (s: string) => {
    const t = s.trim();
    return (
      (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))
    );
  };

  // Case 1: Wrapped in quotes (double quotes, single quotes, or backticks)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    try {
      let current = trimmed;
      if (current.startsWith("'") || current.startsWith("`")) {
        current = `"${current.slice(1, -1).replace(/"/g, '\\"')}"`;
      }
      let parsed = JSON.parse(current);
      while (typeof parsed === "string") {
        if (looksLikeJsonStructure(parsed)) {
          return parsed.trim();
        }
        try {
          parsed = JSON.parse(parsed.trim());
        } catch {
          break;
        }
      }
    } catch {
      const inner = trimmed.slice(1, -1);
      if (
        looksLikeJsonStructure(inner) ||
        inner.includes('\\"') ||
        inner.includes("\\n")
      ) {
        const unescaped = inner
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\\/g, "\\");
        if (looksLikeJsonStructure(unescaped)) {
          return unescaped.trim();
        }
      }
    }
  }

  // Case 2: Escaped JSON without outer quotes (e.g. {\"a\": 1} or [{\"a\": 1}])
  if (looksLikeJsonStructure(trimmed) && trimmed.includes('\\"')) {
    const unescaped = trimmed
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
    return unescaped.trim();
  }

  return null;
}

export function transformJson(
  input: string,
  indent: string | number = 2,
  options?: { tolerant?: boolean }
): string {
  if (!input.trim()) throw new Error("Add some JSON to get started.");
  const effective = unwrapStringifiedJson(input) ?? input;
  if (options?.tolerant) {
    try {
      return JSON.stringify(JSON.parse(effective), null, indent);
    } catch {
      return formatTolerantJson(effective, indent);
    }
  }
  return JSON.stringify(JSON.parse(effective), null, indent);
}

export type TolerantTokenType =
  | "brace_open"
  | "brace_close"
  | "bracket_open"
  | "bracket_close"
  | "colon"
  | "comma"
  | "semicolon"
  | "string"
  | "comment"
  | "atom";

export interface TolerantToken {
  type: TolerantTokenType;
  value: string;
  hasNewlineBefore: boolean;
}

export function formatTolerantJson(input: string, indent: string | number = 2): string {
  if (!input.trim()) return "";
  const effective = unwrapStringifiedJson(input) ?? input;
  const indentUnit =
    typeof indent === "number" ? (indent === 0 ? "" : " ".repeat(indent)) : indent;
  const isMinify = indent === 0 || indentUnit === "";

  const tokens: TolerantToken[] = [];
  let i = 0;
  const len = effective.length;
  let hasNewline = false;

  while (i < len) {
    const ch = effective[i];

    if (/\s/.test(ch)) {
      if (ch === "\n") hasNewline = true;
      i++;
      continue;
    }

    // Line comments //
    if (ch === "/" && i + 1 < len && effective[i + 1] === "/") {
      const start = i;
      i += 2;
      while (i < len && effective[i] !== "\n") i++;
      tokens.push({
        type: "comment",
        value: effective.slice(start, i),
        hasNewlineBefore: hasNewline,
      });
      hasNewline = false;
      continue;
    }

    // Block comments /* */
    if (ch === "/" && i + 1 < len && effective[i + 1] === "*") {
      const start = i;
      i += 2;
      while (
        i < len &&
        !(effective[i] === "*" && i + 1 < len && effective[i + 1] === "/")
      ) {
        i++;
      }
      if (i < len) i += 2;
      tokens.push({
        type: "comment",
        value: effective.slice(start, i),
        hasNewlineBefore: hasNewline,
      });
      hasNewline = false;
      continue;
    }

    if (ch === "{") {
      tokens.push({ type: "brace_open", value: "{", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === "}") {
      tokens.push({ type: "brace_close", value: "}", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === "[") {
      tokens.push({ type: "bracket_open", value: "[", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === "]") {
      tokens.push({ type: "bracket_close", value: "]", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === ":") {
      tokens.push({ type: "colon", value: ":", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ",", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }
    if (ch === ";") {
      tokens.push({ type: "semicolon", value: ";", hasNewlineBefore: hasNewline });
      hasNewline = false;
      i++;
      continue;
    }

    // Strings (double quote, single quote, backtick)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const start = i;
      i++;
      while (i < len) {
        if (effective[i] === "\\") {
          i += 2;
          continue;
        }
        if (effective[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      tokens.push({
        type: "string",
        value: effective.slice(start, i),
        hasNewlineBefore: hasNewline,
      });
      hasNewline = false;
      continue;
    }

    // Atoms (numbers, identifiers, operators, symbols)
    const start = i;
    while (i < len) {
      const c = effective[i];
      if (
        /\s/.test(c) ||
        c === "{" ||
        c === "}" ||
        c === "[" ||
        c === "]" ||
        c === ":" ||
        c === "," ||
        c === ";" ||
        c === '"' ||
        c === "'" ||
        c === "`" ||
        (c === "/" &&
          i + 1 < len &&
          (effective[i + 1] === "/" || effective[i + 1] === "*"))
      ) {
        break;
      }
      i++;
    }
    if (i > start) {
      tokens.push({
        type: "atom",
        value: effective.slice(start, i),
        hasNewlineBefore: hasNewline,
      });
    } else {
      tokens.push({
        type: "atom",
        value: effective[i],
        hasNewlineBefore: hasNewline,
      });
      i++;
    }
    hasNewline = false;
  }

  if (isMinify) {
    let out = "";
    let prev: TolerantToken | null = null;
    for (const t of tokens) {
      if (t.type === "comment") continue;
      if (prev && prev.type === "atom" && t.type === "atom") out += " ";
      out += t.value;
      prev = t;
    }
    return out.trim();
  }

  let out = "";
  let depth = 0;
  const getIndent = (d: number) => indentUnit.repeat(Math.max(0, d));

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    if (t.type === "brace_open" || t.type === "bracket_open") {
      const matchCloseType = t.type === "brace_open" ? "brace_close" : "bracket_close";
      if (next && next.type === matchCloseType) {
        out += t.value + next.value;
        idx++;
        continue;
      }
      out += t.value;
      depth++;
      out += "\n" + getIndent(depth);
      continue;
    }

    if (t.type === "brace_close" || t.type === "bracket_close") {
      depth = Math.max(0, depth - 1);
      out = out.replace(/[ \t]+$/, "");
      if (!out.endsWith("\n")) out += "\n";
      out += getIndent(depth) + t.value;
      continue;
    }

    if (t.type === "comma" || t.type === "semicolon") {
      out += t.value;
      out += "\n" + getIndent(depth);
      continue;
    }

    if (t.type === "colon") {
      out += ": ";
      continue;
    }

    if (t.type === "comment") {
      if (t.value.startsWith("//")) {
        if (!out.endsWith("\n") && !out.endsWith(" ")) out += " ";
        out += t.value + "\n" + getIndent(depth);
      } else {
        if (!out.endsWith("\n") && !out.endsWith(" ")) out += " ";
        out += t.value + " ";
      }
      continue;
    }

    const isValOrClose =
      prev &&
      (prev.type === "string" ||
        prev.type === "atom" ||
        prev.type === "brace_close" ||
        prev.type === "bracket_close");
    if (isValOrClose && prev.type !== "colon") {
      out = out.replace(/[ \t]+$/, "");
      if (!out.endsWith("\n")) out += "\n";
      out += getIndent(depth);
    }

    out += t.value;
  }

  return out.trim();
}

export function repairJson(input: string): string {
  if (!input.trim()) return input;
  const effective = unwrapStringifiedJson(input) ?? input;

  // 1. Remove comments
  let s = effective.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Python & JS constants
  s = s
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bundefined\b/g, "null");

  // 3. Convert single-quoted strings to double-quoted strings
  s = s.replace(/'((?:\\.|[^'\\])*)'/g, (_, inner: string) => {
    return `"${inner.replace(/"/g, '\\"').replace(/\\'/g, "'")}"`;
  });

  // 4. Quote unquoted object keys
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // 5. Replace semicolons between properties/items
  s = s.replace(/;(\s*["}\]])/g, ",$1");

  // 6. Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 7. Auto-close brackets/braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === "{") openBraces++;
      else if (ch === "}") openBraces = Math.max(0, openBraces - 1);
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  while (openBrackets > 0 || openBraces > 0) {
    if (openBrackets > 0) {
      s += "]";
      openBrackets--;
    } else if (openBraces > 0) {
      s += "}";
      openBraces--;
    }
  }

  return s;
}

export function canRepairJson(input: string): boolean {
  if (!input.trim()) return false;
  const effective = unwrapStringifiedJson(input) ?? input;
  try {
    JSON.parse(effective);
    return false; // Already valid
  } catch {
    try {
      const repaired = repairJson(effective);
      JSON.parse(repaired);
      return true;
    } catch {
      return false;
    }
  }
}

export interface JsonErrorInfo {
  message: string;
  line: number | null;
  column: number | null;
  snippet?: string;
  suggestion?: string;
}

export function parseJsonError(input: string, error: unknown): JsonErrorInfo {
  if (!input.trim()) {
    return {
      message: "Add some JSON to get started.",
      line: null,
      column: null,
      suggestion: "Paste your JSON data into the editor above.",
    };
  }

  const effective = unwrapStringifiedJson(input) ?? input;
  const raw = error instanceof Error ? error.message : "Invalid JSON";

  let line: number | null = null;
  let column: number | null = null;

  const lineColMatch = raw.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
  }

  const posMatch = raw.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const before = effective.slice(0, pos);
    const lines = before.split("\n");
    line = lines.length;
    column = before.length - before.lastIndexOf("\n");
  }

  let message = raw
    .replace(/\s*\(line \d+ column \d+\)/i, "")
    .replace(/in JSON at position \d+/i, "")
    .replace(/at position \d+/i, "")
    .trim();
  message = message.charAt(0).toUpperCase() + message.slice(1);

  let suggestion = "";
  if (
    /trailing comma/i.test(raw) ||
    (raw.includes("Unexpected token") && (raw.includes("}") || raw.includes("]")))
  ) {
    suggestion = "Check for a trailing comma before a closing bracket '}' or ']'.";
  } else if (/expected double-quoted/i.test(raw) || /single quote/i.test(raw)) {
    suggestion =
      "Keys and strings in JSON must use double quotes (\"), not single quotes (').";
  } else if (/unexpected end/i.test(raw) || /end of input/i.test(raw)) {
    suggestion = "The JSON ended unexpectedly. Check for missing closing '}' or ']'.";
  } else if (/unexpected number/i.test(raw)) {
    suggestion = "Check for missing comma between array elements or object properties.";
  }

  let snippet = "";
  if (line !== null && line > 0) {
    const lines = effective.split("\n");
    if (line <= lines.length) {
      snippet = lines[line - 1];
    }
  }

  return {
    message,
    line,
    column,
    snippet,
    suggestion,
  };
}

export function jsonError(input: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Invalid JSON";
  const position = message.match(/position (\d+)/);
  if (position) {
    const before = input.slice(0, Number(position[1]));
    const line = before.split("\n").length;
    const column = before.length - before.lastIndexOf("\n");
    return `${message} · Line ${line}, column ${column}`;
  }
  return message;
}

export const sampleJson = JSON.stringify(
  {
    project: "Ramupod",
    version: "0.1.0",
    free: true,
    tools: ["JSON Formatter", "Markdown Editor", "Diff Viewer"],
    settings: { theme: "light", privacy: "local", indent: 2 },
  },
  null,
  2
);
