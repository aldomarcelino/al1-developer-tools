import test from "node:test";
import assert from "node:assert/strict";
import {
  transformJson,
  jsonError,
  parseJsonError,
  formatTolerantJson,
  repairJson,
  canRepairJson,
  unwrapStringifiedJson,
} from "./json.ts";

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

test("rejects malformed and empty input in strict mode", () => {
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

test("formatTolerantJson formats malformed JSON with trailing commas", () => {
  const formatted = formatTolerantJson('{"a": 1, "b": 2,}', 2);
  assert.equal(formatted, '{\n  "a": 1,\n  "b": 2,\n}');
});

test("formatTolerantJson formats malformed JSON with single quotes and unquoted keys", () => {
  const formatted = formatTolerantJson("{name: 'John', age: 30}", 2);
  assert.equal(formatted, "{\n  name: 'John',\n  age: 30\n}");
});

test("formatTolerantJson formats malformed JSON with unclosed braces", () => {
  const formatted = formatTolerantJson('{"a": 1, "b": {"c": 2', 2);
  assert.equal(formatted, '{\n  "a": 1,\n  "b": {\n    "c": 2');
});

test("formatTolerantJson minifies dirty JSON", () => {
  const minified = formatTolerantJson("{ 'a': 1,  b: [ 2, 3, ] }", 0);
  assert.equal(minified, "{'a':1,b:[2,3,]}");
});

test("transformJson with tolerant option formats invalid JSON instead of throwing", () => {
  const formatted = transformJson('{"a": 1,}', 2, { tolerant: true });
  assert.equal(formatted, '{\n  "a": 1,\n}');
});

test("repairJson and canRepairJson fix common JSON errors to valid JSON", () => {
  const dirty = "{ name: 'Aldo', is_active: True, items: [1, 2, 3,], }";
  assert.equal(canRepairJson(dirty), true);
  const repaired = repairJson(dirty);
  const parsed = JSON.parse(repaired);
  assert.deepEqual(parsed, {
    name: "Aldo",
    is_active: true,
    items: [1, 2, 3],
  });
});

test("unwrapStringifiedJson unescapes stringified JSON strings", () => {
  const userSample =
    '"{\\n  \\"project\\": \\"Ramupod\\",\\n  \\"version\\": \\"0.1.0\\",\\n  \\"free\\\": true,\\n  \\"tools\\\": [\\n    \\"JSON Formatter\\",\\n    \\"Markdown Editor\\",\\n    \\"Diff Viewer\\"\\n  ],\\n  \\"settings\\\": {\\n    \\"theme\\\": \\"light\\\",\\n    \\"privacy\\\": \\"local\\\",\\n    \\"indent\\\": 2\\n  }\\n}"';

  const unwrapped = unwrapStringifiedJson(userSample);
  assert.ok(unwrapped !== null);
  const parsed = JSON.parse(unwrapped!);
  assert.equal(parsed.project, "Ramupod");
  assert.equal(parsed.free, true);
  assert.equal(parsed.tools.length, 3);
});

test("transformJson directly formats stringified JSON into beautified object", () => {
  const stringified = '"{\\"name\\":\\"Ramupod\\",\\"count\\":10}"';
  const formatted = transformJson(stringified, 2);
  assert.equal(formatted, '{\n  "name": "Ramupod",\n  "count": 10\n}');
});

test("unwrapStringifiedJson handles unquoted escaped JSON strings", () => {
  const unquotedEscaped = '{\\"title\\": \\"Developer Tools\\"}';
  const unwrapped = unwrapStringifiedJson(unquotedEscaped);
  assert.equal(unwrapped, '{"title": "Developer Tools"}');
  assert.equal(transformJson(unquotedEscaped, 2), '{\n  "title": "Developer Tools"\n}');
});
