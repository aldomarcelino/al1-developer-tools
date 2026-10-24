import test from "node:test";
import assert from "node:assert/strict";
import { formatSql, minifySql, sampleSqlQueries } from "./sql.ts";

test("formats basic SELECT query with keyword capitalization", () => {
  const input =
    "select id, name, email from users where active = true order by id desc limit 10;";
  const res = formatSql(input, { keywordCase: "upper", indent: 2 });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("SELECT"));
  assert.ok(res.code.includes("FROM"));
  assert.ok(res.code.includes("WHERE"));
  assert.ok(res.code.includes("ORDER BY"));
  assert.ok(res.code.includes("LIMIT"));
});

test("supports lowercase keyword configuration", () => {
  const input = "SELECT id, name FROM users WHERE id = 1;";
  const res = formatSql(input, { keywordCase: "lower" });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("select"));
  assert.ok(res.code.includes("from"));
  assert.ok(res.code.includes("where"));
});

test("formats complex CTE and JOIN queries cleanly", () => {
  const res = formatSql(sampleSqlQueries.analytics, { keywordCase: "upper" });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("WITH"));
  assert.ok(res.code.includes("INNER JOIN"));
  assert.ok(res.code.includes("LEFT JOIN"));
  assert.ok(res.code.includes("GROUP BY"));
  assert.ok(res.code.includes("HAVING"));
});

test("formats DDL CREATE TABLE statements", () => {
  const res = formatSql(sampleSqlQueries.schema);
  assert.equal(res.success, true);
  assert.ok(res.code.includes("CREATE TABLE"));
  assert.ok(res.code.includes("PRIMARY KEY"));
  assert.ok(res.code.includes("REFERENCES"));
});

test("detects unclosed string literal syntax error", () => {
  const input = "SELECT * FROM users WHERE email = 'test@example.com;";
  const res = formatSql(input);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("Unclosed quote literal"));
});

test("detects unbalanced parenthesis syntax error", () => {
  const input = "SELECT * FROM users WHERE (id = 1 AND active = true;";
  const res = formatSql(input);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("Unclosed parenthesis"));
});

test("minifies SQL query by removing comments and compressing whitespace", () => {
  const input = `
    -- Single line comment
    SELECT
      id,
      /* multi-line comment */
      name
    FROM
      users
    WHERE
      id = 1;
  `;
  const res = minifySql(input);
  assert.equal(res.success, true);
  assert.ok(!res.code.includes("--"));
  assert.ok(!res.code.includes("/*"));
  assert.ok(res.code.startsWith("SELECT"));
});
