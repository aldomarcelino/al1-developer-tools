import test from "node:test";
import assert from "node:assert/strict";
import { convertTabular } from "./csv-json.ts";

test("CSV supports BOM, quoted commas, escaped quotes, multiline values and string IDs", () => {
  const result = convertTabular(
    '\uFEFFid,note\r\n00123,"Hello, ""Ramu""\nworld"\r\n9007199254740993,false\r\n',
    "csv-to-json",
    ","
  );
  assert.deepEqual(JSON.parse(result.output), [
    { id: "00123", note: 'Hello, "Ramu"\nworld' },
    { id: "9007199254740993", note: "false" },
  ]);
  assert.equal(result.rows, 2);
  assert.equal(result.columns, 2);
});
test("CSV handles semicolons, tabs, blank lines, empty values, and headers-only input", () => {
  assert.deepEqual(JSON.parse(convertTabular("a;b\n\n1;\n", "csv-to-json", ";").output), [
    { a: "1", b: "" },
  ]);
  assert.deepEqual(
    JSON.parse(convertTabular('a\tb\n""\t"x\ty"', "csv-to-json", "\t").output),
    [{ a: "", b: "x\ty" }]
  );
  assert.deepEqual(JSON.parse(convertTabular("a,b\r\n", "csv-to-json", ",").output), []);
  assert.deepEqual(JSON.parse(convertTabular('a\n""\n', "csv-to-json", ",").output), [
    { a: "" },
  ]);
});
test("JSON gathers keys across rows and handles missing, null, booleans, nested objects and arrays", () => {
  const result = convertTabular(
    '[{"a":0,"b":false,"nested":{"x":1}},{"a":null,"other":[1,2]}]',
    "json-to-csv",
    ","
  );
  assert.equal(result.output, 'a,b,nested,other\r\n0,false,"{""x"":1}",\r\n,,,"[1,2]"');
  assert.equal(result.rows, 2);
  assert.equal(result.columns, 4);
  assert.equal(convertTabular("[]", "json-to-csv", ",").output, "");
});
test("CSV export round-trips quoted strings, line breaks and headers with delimiters", () => {
  const data = [{ "full,name": 'Ramu "One"', note: "first\r\nsecond" }];
  for (const delimiter of [",", ";", "\t"] as const) {
    const csv = convertTabular(JSON.stringify(data), "json-to-csv", delimiter);
    assert.deepEqual(
      JSON.parse(convertTabular(csv.output, "csv-to-json", delimiter).output),
      data
    );
  }
});
test("rejects duplicate/blank headers, wrong row widths and malformed quoting", () => {
  for (const csv of [
    "a,a\n1,2",
    "a, \n1,2",
    "a,b\n1",
    "a,b\n1,2,3",
    'a\n"unclosed',
    'a\n"quoted"oops',
    'a\nabc"def',
  ]) {
    assert.throws(() => convertTabular(csv, "csv-to-json", ","), csv);
  }
});
test("rejects invalid JSON shapes and bounds input dimensions", () => {
  for (const json of ["{}", "[1]", "[null]", "[[1]]", "[{}]", '[{"":1}]'])
    assert.throws(() => convertTabular(json, "json-to-csv", ","), json);
  assert.throws(() => convertTabular("a\n" + "x\n".repeat(10001), "csv-to-json", ","));
  assert.throws(() =>
    convertTabular("a".repeat(2 * 1024 * 1024 + 1), "csv-to-json", ",")
  );
  assert.throws(() =>
    convertTabular(
      Array.from({ length: 201 }, (_, i) => `key${i}`).join(","),
      "csv-to-json",
      ","
    )
  );
});
test("special property names remain data and formula protection is opt-in", () => {
  const result = JSON.parse(
    convertTabular("__proto__,constructor\nhello,world", "csv-to-json", ",").output
  )[0];
  assert.equal(result.__proto__, "hello");
  assert.equal(result.constructor, "world");
  const json = '[{"a":"=SUM(A1:A2)","b":-20,"c":" @text"}]';
  assert.equal(
    convertTabular(json, "json-to-csv", ",").output,
    "a,b,c\r\n=SUM(A1:A2),-20, @text"
  );
  assert.equal(
    convertTabular(json, "json-to-csv", ",", true).output,
    "a,b,c\r\n'=SUM(A1:A2),-20,' @text"
  );
});
