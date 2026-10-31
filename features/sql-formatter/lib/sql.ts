/**
 * High-Performance Client-Side SQL Formatter & Minifier Engine
 * Supports Standard SQL, PostgreSQL, MySQL, and SQLite dialects.
 * Preserves strings, comments, and handles subqueries, CTEs, and multi-query batches.
 */

export type SqlDialect = "standard" | "postgresql" | "mysql" | "sqlite";
export type KeywordCase = "upper" | "lower" | "preserve";
export type IndentSize = 2 | 4 | "tab";

export interface SqlFormatOptions {
  dialect?: SqlDialect;
  keywordCase?: KeywordCase;
  indent?: IndentSize;
  linesBetweenQueries?: number;
}

export interface SqlResult {
  success: boolean;
  code: string;
  queryCount: number;
  error?: string;
  executionTimeMs: number;
}

// Major SQL Top-Level Clauses that start on a new line at base indent
const MAJOR_CLAUSES = [
  "WITH",
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "HAVING",
  "ORDER BY",
  "LIMIT",
  "OFFSET",
  "FETCH FIRST",
  "FETCH NEXT",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "DELETE",
  "CREATE TABLE",
  "CREATE VIEW",
  "CREATE INDEX",
  "ALTER TABLE",
  "DROP TABLE",
  "DROP VIEW",
  "DROP INDEX",
  "TRUNCATE TABLE",
  "UNION ALL",
  "UNION",
  "EXCEPT",
  "INTERSECT",
  "RETURNING",
];

// Sub-clauses that align under joins or conditions
const JOIN_CLAUSES = [
  "LEFT OUTER JOIN",
  "RIGHT OUTER JOIN",
  "FULL OUTER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "INNER JOIN",
  "CROSS JOIN",
  "NATURAL JOIN",
  "STRAIGHT_JOIN",
  "JOIN",
];

const CONDITION_KEYWORDS = ["AND", "OR"];

// Master list of SQL reserved keywords for capitalization
const SQL_KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP",
  "BY",
  "HAVING",
  "ORDER",
  "LIMIT",
  "OFFSET",
  "WITH",
  "RECURSIVE",
  "AS",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "TABLE",
  "VIEW",
  "INDEX",
  "DATABASE",
  "SCHEMA",
  "JOIN",
  "INNER",
  "LEFT",
  "RIGHT",
  "FULL",
  "OUTER",
  "CROSS",
  "NATURAL",
  "ON",
  "AND",
  "OR",
  "NOT",
  "IN",
  "EXISTS",
  "BETWEEN",
  "LIKE",
  "ILIKE",
  "IS",
  "NULL",
  "TRUE",
  "FALSE",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "UNION",
  "ALL",
  "EXCEPT",
  "INTERSECT",
  "DISTINCT",
  "ALL",
  "ASC",
  "DESC",
  "NULLS",
  "FIRST",
  "LAST",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "CONSTRAINT",
  "CHECK",
  "UNIQUE",
  "DEFAULT",
  "CASCADE",
  "RESTRICT",
  "RETURNING",
  "OVER",
  "PARTITION",
  "ROW_NUMBER",
  "INT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "TINYINT",
  "VARCHAR",
  "CHAR",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "NUMERIC",
  "DECIMAL",
  "FLOAT",
  "DOUBLE",
  "PRECISION",
  "SERIAL",
  "BIGSERIAL",
  "UUID",
  "JSON",
  "JSONB",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "TRANSACTION",
  "GRANT",
  "REVOKE",
  "COALESCE",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
]);

export const sampleSqlQueries = {
  analytics: `-- E-commerce monthly revenue and top customer analytics
WITH monthly_summary AS (
  SELECT
    o.customer_id,
    DATE_TRUNC('month', o.order_date) AS order_month,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent
  FROM orders o
  INNER JOIN customers c ON c.id = o.customer_id
  WHERE o.status = 'completed' AND o.order_date >= '2026-01-01'
  GROUP BY o.customer_id, DATE_TRUNC('month', o.order_date)
  HAVING SUM(o.total_amount) > 500
)
SELECT
  c.id,
  c.full_name,
  c.email,
  m.order_month,
  m.total_orders,
  m.total_spent
FROM monthly_summary m
LEFT JOIN customers c ON c.id = m.customer_id
ORDER BY m.total_spent DESC, m.order_month ASC
LIMIT 50 OFFSET 0;`,

  schema: `-- Relational database schema with constraints
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}'::jsonb
);`,

  crud: `-- Multi-statement operational queries
INSERT INTO products (sku, name, price, stock_quantity)
VALUES ('TECH-001', 'Ergonomic Mechanical Keyboard', 149.99, 45),
       ('TECH-002', 'Ultra-Wide 4K Gaming Monitor', 499.50, 12);

UPDATE products
SET price = price * 0.9, stock_quantity = stock_quantity - 1
WHERE sku = 'TECH-001' AND stock_quantity > 0;

DELETE FROM cart_items
WHERE created_at < NOW() - INTERVAL '30 days';`,
};

function getIndentString(indent: IndentSize): string {
  if (indent === "tab") return "\t";
  return " ".repeat(indent);
}

/**
 * Tokenizes raw SQL input into structural tokens
 */
interface SqlToken {
  type: "word" | "string" | "comment" | "punct" | "newline" | "space";
  value: string;
}

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const char = sql[i];

    // Single-line comment (-- or #)
    if ((char === "-" && sql[i + 1] === "-") || char === "#") {
      let end = sql.indexOf("\n", i);
      if (end === -1) end = len;
      tokens.push({ type: "comment", value: sql.slice(i, end) });
      i = end;
      continue;
    }

    // Multi-line comment (/* ... */)
    if (char === "/" && sql[i + 1] === "*") {
      let end = sql.indexOf("*/", i + 2);
      if (end === -1) end = len;
      else end += 2;
      tokens.push({ type: "comment", value: sql.slice(i, end) });
      i = end;
      continue;
    }

    // String literals ('...' or "..." or `...`)
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      let j = i + 1;
      while (j < len) {
        if (sql[j] === "\\") {
          j += 2;
        } else if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2; // escaped quote ''
          } else {
            j++;
            break;
          }
        } else {
          j++;
        }
      }
      tokens.push({ type: "string", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Newlines
    if (char === "\n" || char === "\r") {
      if (char === "\r" && sql[i + 1] === "\n") i++;
      tokens.push({ type: "newline", value: "\n" });
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(char)) {
      tokens.push({ type: "space", value: " " });
      i++;
      continue;
    }

    // Punctuation & Operators
    if (/[(),;=<>!+\-*/%&|^]/.test(char)) {
      // Check for two-character operators: <=, >=, !=, <>, ::
      const two = sql.slice(i, i + 2);
      if (["<=", ">=", "!=", "<>", "::"].includes(two)) {
        tokens.push({ type: "punct", value: two });
        i += 2;
      } else {
        tokens.push({ type: "punct", value: char });
        i++;
      }
      continue;
    }

    // Words / Identifiers / Numbers
    let j = i;
    while (j < len && !/\s|[(),;=<>!+\-*/%&|^]/.test(sql[j])) {
      if (
        (sql[j] === "-" && sql[j + 1] === "-") ||
        (sql[j] === "/" && sql[j + 1] === "*")
      ) {
        break;
      }
      j++;
    }
    tokens.push({ type: "word", value: sql.slice(i, j) });
    i = j;
  }

  return tokens;
}

/**
 * Validates parentheses balance and unclosed strings
 */
function validateSqlSyntax(tokens: SqlToken[]): { valid: boolean; error?: string } {
  let parenCount = 0;
  for (const t of tokens) {
    if (t.type === "punct") {
      if (t.value === "(") parenCount++;
      if (t.value === ")") {
        parenCount--;
        if (parenCount < 0) {
          return {
            valid: false,
            error:
              "Syntax Error: Unexpected closing parenthesis ')' without matching '('.",
          };
        }
      }
    } else if (t.type === "string") {
      const q = t.value[0];
      if (t.value.length < 2 || t.value[t.value.length - 1] !== q) {
        return {
          valid: false,
          error: `Syntax Error: Unclosed quote literal starting with ${q}.`,
        };
      }
    }
  }

  if (parenCount > 0) {
    return {
      valid: false,
      error: `Syntax Error: Unclosed parenthesis. Missing ${parenCount} closing ')' bracket(s).`,
    };
  }

  return { valid: true };
}

/**
 * Main Format SQL Function
 */
export function formatSql(sql: string, options: SqlFormatOptions = {}): SqlResult {
  const startTime = performance.now();
  const trimmed = sql.trim();

  if (!trimmed) {
    return {
      success: true,
      code: "",
      queryCount: 0,
      executionTimeMs: 0,
    };
  }

  const { keywordCase = "upper", indent = 2, linesBetweenQueries = 2 } = options;

  const indentStr = getIndentString(indent);
  const rawTokens = tokenizeSql(trimmed);

  // Validate parentheses and quotes
  const validation = validateSqlSyntax(rawTokens);
  if (!validation.valid) {
    return {
      success: false,
      code: "",
      error: validation.error,
      queryCount: 0,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  // Filter out redundant consecutive spaces
  const cleanTokens: SqlToken[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    if (t.type === "space") {
      const prev = cleanTokens[cleanTokens.length - 1];
      if (!prev || prev.type === "space" || prev.type === "newline") continue;
      cleanTokens.push({ type: "space", value: " " });
    } else {
      cleanTokens.push(t);
    }
  }

  // Pre-process multi-word keywords (e.g. "LEFT", "JOIN" -> "LEFT JOIN")
  const mergedTokens: SqlToken[] = [];
  let k = 0;
  while (k < cleanTokens.length) {
    const current = cleanTokens[k];
    const nextSpace = cleanTokens[k + 1];
    const nextWord = cleanTokens[k + 2];
    const nextSpace2 = cleanTokens[k + 3];
    const nextWord2 = cleanTokens[k + 4];

    // Check for 3-word keywords (e.g. LEFT OUTER JOIN)
    if (
      current.type === "word" &&
      nextSpace?.type === "space" &&
      nextWord?.type === "word" &&
      nextSpace2?.type === "space" &&
      nextWord2?.type === "word"
    ) {
      const threeWord =
        `${current.value} ${nextWord.value} ${nextWord2.value}`.toUpperCase();
      if (JOIN_CLAUSES.includes(threeWord)) {
        mergedTokens.push({ type: "word", value: threeWord });
        k += 5;
        continue;
      }
    }

    // Check for 2-word keywords (e.g. ORDER BY, GROUP BY, INSERT INTO, LEFT JOIN, CREATE TABLE)
    if (
      current.type === "word" &&
      nextSpace?.type === "space" &&
      nextWord?.type === "word"
    ) {
      const twoWord = `${current.value} ${nextWord.value}`.toUpperCase();
      if (
        MAJOR_CLAUSES.includes(twoWord) ||
        JOIN_CLAUSES.includes(twoWord) ||
        twoWord === "PRIMARY KEY" ||
        twoWord === "FOREIGN KEY" ||
        twoWord === "NOT NULL" ||
        twoWord === "IS NULL" ||
        twoWord === "IS NOT NULL"
      ) {
        mergedTokens.push({ type: "word", value: twoWord });
        k += 3;
        continue;
      }
    }

    mergedTokens.push(current);
    k++;
  }

  // Build formatted text
  let output = "";
  let indentLevel = 0;
  let inParentheses = 0;

  function applyCasing(word: string): string {
    if (keywordCase === "preserve") return word;
    const upper = word.toUpperCase();
    if (
      SQL_KEYWORDS.has(upper) ||
      MAJOR_CLAUSES.includes(upper) ||
      JOIN_CLAUSES.includes(upper)
    ) {
      return keywordCase === "upper" ? upper : upper.toLowerCase();
    }
    return word;
  }

  function getIndent(): string {
    return indentStr.repeat(Math.max(0, indentLevel));
  }

  function addNewline(): void {
    output = output.trimEnd() + "\n" + getIndent();
  }

  for (let idx = 0; idx < mergedTokens.length; idx++) {
    const token = mergedTokens[idx];
    const next = mergedTokens[idx + 1];

    if (token.type === "comment") {
      output = output.trimEnd() + "\n" + getIndent() + token.value;
      addNewline();
      continue;
    }

    if (token.type === "string") {
      output += token.value;
      continue;
    }

    if (token.type === "space" || token.type === "newline") {
      if (
        output &&
        !output.endsWith(" ") &&
        !output.endsWith("\n") &&
        !output.endsWith("(")
      ) {
        output += " ";
      }
      continue;
    }

    if (token.type === "punct") {
      if (token.value === ";") {
        output = output.trimEnd() + ";";
        const sep = "\n".repeat(Math.max(1, linesBetweenQueries));
        output += sep;
        indentLevel = 0;
        continue;
      }

      if (token.value === "(") {
        inParentheses++;
        output += "(";
        // If followed by SELECT or WITH, indent subquery
        if (
          next &&
          next.type === "word" &&
          ["SELECT", "WITH"].includes(next.value.toUpperCase())
        ) {
          indentLevel++;
          addNewline();
        }
        continue;
      }

      if (token.value === ")") {
        inParentheses = Math.max(0, inParentheses - 1);
        if (output.endsWith(" ") || output.endsWith("\n")) {
          output = output.trimEnd();
        }
        // If we were indented inside subquery or CREATE TABLE
        if (indentLevel > 0) {
          indentLevel--;
          addNewline();
        }
        output += ")";
        continue;
      }

      if (token.value === ",") {
        output = output.trimEnd() + ",";
        // Commas in SELECT list or column list get a newline with indentation
        addNewline();
        continue;
      }

      if (token.value === "::") {
        output = output.trimEnd() + "::";
        continue;
      }

      // Operators (+, -, =, <, >, etc.)
      if (
        output &&
        !output.endsWith(" ") &&
        !output.endsWith("(") &&
        !output.endsWith("\n")
      ) {
        output += " ";
      }
      output += token.value;
      if (next && next.value !== ";") {
        output += " ";
      }
      continue;
    }

    if (token.type === "word") {
      const upperWord = token.value.toUpperCase();

      // Check if it's a Major Top-Level Clause
      if (MAJOR_CLAUSES.includes(upperWord)) {
        if (output.trim()) {
          addNewline();
        }
        output += applyCasing(token.value) + " ";
        continue;
      }

      // Check if it's a JOIN clause
      if (JOIN_CLAUSES.includes(upperWord)) {
        addNewline();
        output += indentStr + applyCasing(token.value) + " ";
        continue;
      }

      // Condition Keywords (AND / OR) in WHERE/HAVING/ON
      if (CONDITION_KEYWORDS.includes(upperWord)) {
        addNewline();
        output += indentStr + applyCasing(token.value) + " ";
        continue;
      }

      // Normal word or column/table identifier
      const cased = applyCasing(token.value);
      if (
        output &&
        !output.endsWith(" ") &&
        !output.endsWith("(") &&
        !output.endsWith("\n") &&
        !output.endsWith("::")
      ) {
        output += " ";
      }
      output += cased;
    }
  }

  // Clean trailing empty queries count if ended with ;
  const trimmedFinal = output.trim();
  const actualQueryCount = trimmedFinal
    ? (trimmedFinal.match(/;/g) || []).length || 1
    : 0;

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    success: true,
    code: trimmedFinal,
    queryCount: actualQueryCount,
    executionTimeMs,
  };
}

/**
 * Minifies SQL query into a single-line compact representation
 */
export function minifySql(sql: string): SqlResult {
  const startTime = performance.now();
  const trimmed = sql.trim();

  if (!trimmed) {
    return {
      success: true,
      code: "",
      queryCount: 0,
      executionTimeMs: 0,
    };
  }

  const rawTokens = tokenizeSql(trimmed);
  let minified = "";

  for (const token of rawTokens) {
    if (token.type === "comment") {
      // Strip comments in minified output
      continue;
    }
    if (token.type === "newline" || token.type === "space") {
      if (
        minified &&
        !minified.endsWith(" ") &&
        !minified.endsWith("(") &&
        !minified.endsWith(";")
      ) {
        minified += " ";
      }
      continue;
    }
    minified += token.value;
  }

  // Clean spacing around symbols
  minified = minified
    .replace(/\s*([,;()])\s*/g, "$1 ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/;\s*$/, ";")
    .trim();

  const queryCount = (minified.match(/;/g) || []).length || 1;
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    success: true,
    code: minified,
    queryCount,
    executionTimeMs,
  };
}
