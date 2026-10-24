import test from "node:test";
import assert from "node:assert/strict";
import { transformJson, jsonError, parseJsonError } from "./json.ts";
test("formats nested JSON with chosen indentation", () => {
  assert.equal(
    transformJson('{"a":[1,true,null]}', 2),
    '{\n  "a": [\n    1,\n    true,\n    null\n  ]\n}'
  );
  assert.equal(transformJson('{"a":1}', "\t"), '{\n\t"a": 1\n}');
});
test("minifies and preserves escaped strings", () => {
  assert.equal(
    transformJson(' { "text": "hello\\nworld" } ', 0),
    '{"text":"hello\\nworld"}'
  );
});
test("accepts valid scalar JSON", () => {
  for (const value of ["null", "true", "42", '"hello"', "[]"])
    assert.equal(transformJson(value, 0), value);
});
test("rejects malformed and empty input", () => {
  for (const value of ["", '{"x":}', '{"x":1,}', "undefined"])
    assert.throws(() => transformJson(value));
});
test("reports line and column for parser positions", () =>
  assert.match(
    jsonError('{\n"a":}', new Error("Invalid at position 6")),
    /Line 2, column 5/
  ));
test("parseJsonError extracts line, column, and snippet", () => {
  const err = parseJsonError(
    '{\n  "a": 1,\n  "b": \n}',
    new Error("Unexpected token '}' at position 21")
  );
  assert.equal(err.line, 4);
  assert.ok(err.column !== null);
  assert.equal(err.snippet, "}");
});
