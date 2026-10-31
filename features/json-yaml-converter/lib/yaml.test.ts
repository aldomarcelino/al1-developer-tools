import test from "node:test";
import assert from "node:assert/strict";
import { convertYaml } from "./yaml.ts";

test("JSON/YAML roundtrip preserves nested values, Unicode and string IDs", () => {
  const input = {
    name: "Ramu ☕",
    items: [1, true, null, { id: "00123", date: "2026-10-29", yes: "yes" }],
  };
  const yaml = convertYaml(JSON.stringify(input), "json-to-yaml").output;
  assert.deepEqual(JSON.parse(convertYaml(yaml, "yaml-to-json").output), input);
});
test("aliases are supported but cycles and excessive expansion are rejected", () => {
  assert.deepEqual(
    JSON.parse(convertYaml("a: &a [1, 2]\nb: *a", "yaml-to-json").output),
    { a: [1, 2], b: [1, 2] }
  );
  assert.throws(() => convertYaml("a: &a [*a]", "yaml-to-json"), /[Cc]ircular|[Aa]lias/);
  const bomb =
    "a: &a [1,1,1,1,1,1,1,1,1,1]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]";
  assert.throws(() => convertYaml(bomb, "yaml-to-json"), /[Aa]lias|complex/);
});
test("rejects invalid input and YAML values JSON cannot preserve", () => {
  for (const input of [
    "a: 1\na: 2",
    "a: [",
    "a: .inf",
    "a: .nan",
    "a: !custom value",
    "!!set {a: null, b: null}",
    "!!timestamp 2026-10-29",
    "!!binary SGVsbG8=",
    "!!omap [a: 1, b: 2]",
    "a: 9007199254740993",
    "1: a",
    "---\na: 1\n---\nb: 2",
  ])
    assert.throws(() => convertYaml(input, "yaml-to-json"), input);
  assert.throws(() => convertYaml('{"a":9007199254740993}', "json-to-yaml"), /precision/);
  assert.throws(() => convertYaml(" ", "json-to-yaml"));
  assert.throws(() => convertYaml("x".repeat(524289), "yaml-to-json"), /512 KB/);
});
test("prototype-like keys remain data and scalar documents stay valid", () => {
  const result = JSON.parse(
    convertYaml('"__proto__": {polluted: true}\nconstructor: text', "yaml-to-json").output
  );
  assert.ok(Object.hasOwn(result, "__proto__"));
  assert.equal(result.__proto__.polluted, true);
  assert.equal(Object.hasOwn({}, "polluted"), false);
  assert.equal(convertYaml("null", "yaml-to-json").output, "null");
  assert.equal(convertYaml("yes", "yaml-to-json").output, '"yes"');
});
