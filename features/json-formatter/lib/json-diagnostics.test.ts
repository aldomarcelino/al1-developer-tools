import test from "node:test";
import assert from "node:assert/strict";
import { collectJsonErrors } from "./json-diagnostics.ts";

test("collects independent errors in one pass with editor line and column positions", () => {
  const source = [
    "{",
    '  "a": 1',
    '  "b": 2,',
    '  "c" 3,',
    '  "d": [1, 2,],',
    '  "e": true,',
    "}",
  ].join("\n");
  const errors = collectJsonErrors(source);
  assert.deepEqual(
    errors.map(({ line, column }) => [line, column]),
    [
      [3, 3],
      [4, 7],
      [5, 14],
      [7, 1],
    ]
  );
  assert.match(errors[0].message, /','/);
  assert.match(errors[1].message, /':'/);
  assert.match(errors[2].message, /trailing comma/);
});

test("valid JSON including scalar values and escapes has no diagnostics", () => {
  for (const source of [
    '{"a":[true,false,null,1e2,"a\\nb"]}',
    "[]",
    "{}",
    "null",
    "42",
    '"hello"',
  ]) {
    assert.deepEqual(collectJsonErrors(source), []);
  }
});

test("comments and trailing commas remain invalid in strict JSON", () => {
  const errors = collectJsonErrors('{\n // note\n "a": [1,],\n}');
  assert.ok(errors.some((error) => error.line === 2 && /Comments/.test(error.message)));
  assert.ok(errors.some((error) => error.line === 3));
  assert.ok(errors.some((error) => error.line === 4));
});

test("reports multiple errors on the same line without losing their columns", () => {
  const errors = collectJsonErrors('{"a" 1, "b" 2}');
  assert.deepEqual(
    errors.map(({ line, column }) => [line, column]),
    [
      [1, 6],
      [1, 13],
    ]
  );
});

test("uses correct positions with CRLF and UTF-16 editor offsets", () => {
  const source = '{\r\n  "emoji": "😀", "a" 1,\r\n  "b" 2\r\n}';
  const errors = collectJsonErrors(source);
  assert.deepEqual(
    errors.map(({ line, column }) => [line, column]),
    [
      [2, 22],
      [3, 7],
    ]
  );
});

test("incomplete documents report missing closing delimiters at EOF", () => {
  const errors = collectJsonErrors('{"a": [1');
  assert.ok(errors.some((error) => /']'/.test(error.message)));
  assert.ok(errors.some((error) => /'}'/.test(error.message)));
  for (const error of errors) assert.equal(error.column, 9);
});

test("invalid string escapes and incomplete strings are diagnosed", () => {
  assert.match(collectJsonErrors('{"a": "\\q"}')[0].message, /escape/);
  assert.match(collectJsonErrors('{"a": "hello')[0].message, /Unterminated string/);
});

test("empty input has an actionable message without a fictitious line", () => {
  assert.deepEqual(collectJsonErrors("  "), [
    {
      message: "Add some JSON to get started.",
      line: null,
      column: null,
    },
  ]);
});

test("fixing the input removes diagnostics without carrying over old errors", () => {
  assert.equal(collectJsonErrors('{"a" 1, "b" 2}').length, 2);
  assert.deepEqual(collectJsonErrors('{"a": 1, "b": 2}'), []);
});
