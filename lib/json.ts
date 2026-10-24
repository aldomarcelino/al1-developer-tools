export function transformJson(input: string, indent: string | number = 2): string {
  if (!input.trim()) throw new Error("Add some JSON to get started.");
  return JSON.stringify(JSON.parse(input), null, indent);
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
    const before = input.slice(0, pos);
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
    (raw.includes("Unexpected token") && raw.includes("}"))
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
    const lines = input.split("\n");
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
    project: "Al1 Developer Tools",
    version: "0.1.0",
    free: true,
    tools: ["JSON Formatter", "Markdown Editor", "Diff Viewer"],
    settings: { theme: "light", privacy: "local", indent: 2 },
  },
  null,
  2
);
