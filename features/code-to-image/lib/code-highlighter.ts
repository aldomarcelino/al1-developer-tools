import type { SupportedLanguage, CodeTheme } from "./code-to-image-types.ts";

export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "boolean"
  | "function"
  | "type"
  | "variable"
  | "operator"
  | "punctuation"
  | "tag"
  | "attribute"
  | "text";

export interface Token {
  type: TokenType;
  value: string;
}

const JS_KEYWORDS = new Set([
  "async",
  "await",
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
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "as",
]);

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const RUST_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "const",
  "continue",
  "crate",
  "dyn",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "return",
  "self",
  "Self",
  "static",
  "struct",
  "super",
  "trait",
  "true",
  "type",
  "unsafe",
  "use",
  "where",
  "while",
]);

const GO_KEYWORDS = new Set([
  "break",
  "case",
  "chan",
  "const",
  "continue",
  "default",
  "defer",
  "else",
  "fallthrough",
  "for",
  "func",
  "go",
  "goto",
  "if",
  "import",
  "interface",
  "map",
  "package",
  "range",
  "return",
  "select",
  "struct",
  "switch",
  "type",
  "var",
]);

const SQL_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "INSERT",
  "INTO",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "TABLE",
  "INDEX",
  "VIEW",
  "ALTER",
  "ADD",
  "GROUP",
  "BY",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "ON",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "LIKE",
  "AS",
  "DISTINCT",
  "UNION",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "VALUES",
  "SET",
  "ROUND",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "DATE_TRUNC",
]);

const COMMON_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "any",
  "void",
  "null",
  "undefined",
  "never",
  "unknown",
  "object",
  "Promise",
  "Array",
  "Record",
  "int",
  "float",
  "double",
  "bool",
  "char",
  "str",
  "dict",
  "list",
  "set",
  "tuple",
  "i8",
  "i16",
  "i32",
  "i64",
  "u8",
  "u16",
  "u32",
  "u64",
  "usize",
  "isize",
  "f32",
  "f64",
  "Option",
  "Result",
  "Vec",
  "String",
]);

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function autoDetectLanguage(code: string): SupportedLanguage {
  const trimmed = code.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || (trimmed.startsWith("<") && trimmed.includes("</"))) {
    return "html";
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // not strict json
    }
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // not strict json
    }
  }
  if (/^SELECT\b|FROM\b|INSERT\s+INTO\b|CREATE\s+TABLE\b/i.test(trimmed)) {
    return "sql";
  }
  if (trimmed.startsWith("#!/bin/bash") || trimmed.startsWith("#!/bin/sh") || /^(npm|pnpm|yarn|git|docker|curl|echo|chmod|mkdir|cd)\s/m.test(trimmed)) {
    return "bash";
  }
  if (/^def\s+[a-zA-Z_]|^import\s+[a-zA-Z_]|from\s+[a-zA-Z_]+\s+import|:\s*$/m.test(trimmed)) {
    return "python";
  }
  if (/^pub\s+fn\b|fn\s+main\b|impl\b|let\s+mut\b/m.test(trimmed)) {
    return "rust";
  }
  if (/^package\s+[a-zA-Z_]|func\s+[a-zA-Z_]|\bchan\s+/m.test(trimmed)) {
    return "go";
  }
  if (/\b(interface|type|enum|export\s+default|const|let)\b/.test(trimmed)) {
    return "typescript";
  }
  return "typescript";
}

export function tokenizeCode(code: string, language: SupportedLanguage): Token[][] {
  const lines = code.split("\n");
  let inMultiComment = false;

  return lines.map((line) => {
    const tokens: Token[] = [];
    let i = 0;
    const len = line.length;

    while (i < len) {
      // 1. Handle block comments continuation
      if (inMultiComment) {
        const endIdx = line.indexOf("*/", i);
        if (endIdx === -1) {
          tokens.push({ type: "comment", value: line.slice(i) });
          break;
        } else {
          tokens.push({ type: "comment", value: line.slice(i, endIdx + 2) });
          i = endIdx + 2;
          inMultiComment = false;
          continue;
        }
      }

      // 2. Whitespace
      if (/\s/.test(line[i])) {
        let ws = "";
        while (i < len && /\s/.test(line[i])) {
          ws += line[i++];
        }
        tokens.push({ type: "text", value: ws });
        continue;
      }

      // 3. Comments
      // Single-line slash comments //
      if (
        line[i] === "/" &&
        line[i + 1] === "/" &&
        language !== "python" &&
        language !== "bash" &&
        language !== "sql" &&
        language !== "html"
      ) {
        tokens.push({ type: "comment", value: line.slice(i) });
        break;
      }

      // Block comments /* ... */
      if (
        line[i] === "/" &&
        line[i + 1] === "*" &&
        language !== "python" &&
        language !== "bash" &&
        language !== "sql" &&
        language !== "html"
      ) {
        const endIdx = line.indexOf("*/", i + 2);
        if (endIdx === -1) {
          tokens.push({ type: "comment", value: line.slice(i) });
          inMultiComment = true;
          break;
        } else {
          tokens.push({ type: "comment", value: line.slice(i, endIdx + 2) });
          i = endIdx + 2;
          continue;
        }
      }

      // Hash comments # (Python, Bash, YAML)
      if (line[i] === "#" && (language === "python" || language === "bash" || language === "yaml")) {
        tokens.push({ type: "comment", value: line.slice(i) });
        break;
      }

      // SQL comments --
      if (line[i] === "-" && line[i + 1] === "-" && language === "sql") {
        tokens.push({ type: "comment", value: line.slice(i) });
        break;
      }

      // HTML comments <!-- ... -->
      if (line.slice(i, i + 4) === "<!--") {
        const endIdx = line.indexOf("-->", i + 4);
        if (endIdx === -1) {
          tokens.push({ type: "comment", value: line.slice(i) });
          break;
        } else {
          tokens.push({ type: "comment", value: line.slice(i, endIdx + 3) });
          i = endIdx + 3;
          continue;
        }
      }

      // 4. HTML/JSX tags
      if (
        (language === "html" || language === "typescript" || language === "javascript") &&
        line[i] === "<" &&
        (i === 0 || /[\s=(,]/.test(line[i - 1])) &&
        /[a-zA-Z/!-]/.test(line[i + 1] || "")
      ) {
        let tagStr = "<";
        i++;
        while (i < len && /[a-zA-Z0-9_/-]/.test(line[i])) {
          tagStr += line[i++];
        }
        tokens.push({ type: "tag", value: tagStr });
        continue;
      }

      // 5. Strings: "...", '...', `...`
      if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
        const quote = line[i];
        let str = quote;
        i++;
        while (i < len) {
          if (line[i] === "\\") {
            str += line[i++];
            if (i < len) str += line[i++];
          } else if (line[i] === quote) {
            str += line[i++];
            break;
          } else {
            str += line[i++];
          }
        }
        tokens.push({ type: "string", value: str });
        continue;
      }

      // 6. Numbers: hex, float, integer
      if (/\d/.test(line[i])) {
        let num = "";
        if (line[i] === "0" && (line[i + 1] === "x" || line[i + 1] === "X")) {
          num += line.slice(i, i + 2);
          i += 2;
          while (i < len && /[0-9a-fA-F_]/.test(line[i])) {
            num += line[i++];
          }
        } else {
          while (i < len && /[0-9._eE+-]/.test(line[i])) {
            num += line[i++];
          }
        }
        tokens.push({ type: "number", value: num });
        continue;
      }

      // 7. Words / Identifiers
      if (/[a-zA-Z_$]/.test(line[i])) {
        let word = "";
        while (i < len && /[a-zA-Z0-9_$-]/.test(line[i])) {
          word += line[i++];
        }

        // Check language keywords
        const isSql = language === "sql";
        const normalizedWord = isSql ? word.toUpperCase() : word;

        let isKeyword = false;
        if (isSql && SQL_KEYWORDS.has(normalizedWord)) isKeyword = true;
        else if (language === "python" && PYTHON_KEYWORDS.has(word)) isKeyword = true;
        else if (language === "rust" && RUST_KEYWORDS.has(word)) isKeyword = true;
        else if (language === "go" && GO_KEYWORDS.has(word)) isKeyword = true;
        else if (JS_KEYWORDS.has(word)) isKeyword = true;

        if (isKeyword) {
          tokens.push({ type: "keyword", value: word });
          continue;
        }

        // Booleans & Null
        if (/^(true|false|null|undefined|None|True|False|nil)$/i.test(word)) {
          tokens.push({ type: "boolean", value: word });
          continue;
        }

        // Types
        if (COMMON_TYPES.has(word) || /^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
          tokens.push({ type: "type", value: word });
          continue;
        }

        // Functions: next non-space char is '('
        let peek = i;
        while (peek < len && /\s/.test(line[peek])) peek++;
        if (peek < len && line[peek] === "(") {
          tokens.push({ type: "function", value: word });
          continue;
        }

        // Attribute in HTML/JSX (followed by '=')
        if ((language === "html" || language === "typescript" || language === "javascript") && peek < len && line[peek] === "=") {
          tokens.push({ type: "attribute", value: word });
          continue;
        }

        tokens.push({ type: "variable", value: word });
        continue;
      }

      // 8. Operators and punctuation
      const ch = line[i];
      if (/^[=+\-*/%&|^!~<>?:]$/.test(ch)) {
        let op = ch;
        i++;
        while (i < len && /^[=+\-*/%&|^!~<>?:]$/.test(line[i])) {
          op += line[i++];
        }
        tokens.push({ type: "operator", value: op });
        continue;
      }

      if (/^[{}\[\]();,.]/.test(ch)) {
        tokens.push({ type: "punctuation", value: ch });
        i++;
        continue;
      }

      // Fallback
      tokens.push({ type: "text", value: ch });
      i++;
    }

    return tokens;
  });
}

export function getTokenColor(token: Token, theme: CodeTheme): string {
  switch (token.type) {
    case "keyword":
      return theme.keyword;
    case "string":
      return theme.string;
    case "comment":
      return theme.comment;
    case "number":
    case "boolean":
      return theme.number;
    case "function":
      return theme.function;
    case "type":
      return theme.type;
    case "variable":
      return theme.variable;
    case "operator":
      return theme.operator;
    case "punctuation":
      return theme.punctuation;
    case "tag":
      return theme.tag;
    case "attribute":
      return theme.attribute;
    default:
      return theme.foreground;
  }
}

export function highlightCodeToHtml(
  code: string,
  language: SupportedLanguage,
  theme: CodeTheme,
  showLineNumbers = true,
  startLine = 1
): string {
  const tokenLines = tokenizeCode(code, language);

  return tokenLines
    .map((lineTokens, lineIdx) => {
      const lineNum = startLine + lineIdx;
      const tokensHtml = lineTokens
        .map((token) => {
          const color = getTokenColor(token, theme);
          return `<span style="color: ${color}">${escapeHtml(token.value)}</span>`;
        })
        .join("");

      const lineNumHtml = showLineNumbers
        ? `<span class="code-line-number" style="color: ${theme.lineNumber}; min-width: 2.5em; text-align: right; user-select: none; margin-right: 1.25em; opacity: 0.6;">${lineNum}</span>`
        : "";

      return `<div class="code-line" style="display: flex; line-height: 1.6;">${lineNumHtml}<span class="code-line-content">${tokensHtml || "&nbsp;"}</span></div>`;
    })
    .join("");
}
