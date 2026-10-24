import test from "node:test";
import assert from "node:assert/strict";
import { defaultFlags, flagsToString, parseFlags, testRegex } from "./regex.ts";

test("flags conversion to and from string", () => {
  const flags = { ...defaultFlags, ignoreCase: true, dotAll: true };
  const str = flagsToString(flags);
  assert.ok(str.includes("g"));
  assert.ok(str.includes("i"));
  assert.ok(str.includes("m"));
  assert.ok(str.includes("s"));
  assert.ok(str.includes("u"));

  const parsed = parseFlags(str);
  assert.equal(parsed.ignoreCase, true);
  assert.equal(parsed.dotAll, true);
  assert.equal(parsed.global, true);
});

test("matches multiple occurrences with global flag", () => {
  const pattern = "\\b[a-z]+\\b";
  const text = "one two three 123";
  const res = testRegex(pattern, defaultFlags, text);
  assert.equal(res.valid, true);
  assert.equal(res.matchCount, 3);
  assert.equal(res.matches[0].text, "one");
  assert.equal(res.matches[1].text, "two");
  assert.equal(res.matches[2].text, "three");
});

test("extracts positional and named capture groups", () => {
  const pattern = "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})";
  const text = "Date: 2026-10-24";
  const res = testRegex(pattern, defaultFlags, text);
  assert.equal(res.valid, true);
  assert.equal(res.matchCount, 1);
  const groups = res.matches[0].groups;
  assert.equal(groups.length, 3);
  assert.equal(groups[0].value, "2026");
  assert.equal(groups[0].name, "year");
  assert.equal(groups[1].value, "10");
  assert.equal(groups[1].name, "month");
  assert.equal(groups[2].value, "24");
  assert.equal(groups[2].name, "day");
});

test("supports string replacement testing with capture groups", () => {
  const pattern = "(\\w+)\\s(\\w+)";
  const text = "John Doe";
  const res = testRegex(pattern, defaultFlags, text, "$2, $1");
  assert.equal(res.valid, true);
  assert.equal(res.replacementOutput, "Doe, John");
});

test("safely reports invalid regex syntax errors without crashing", () => {
  const invalidPattern = "(unclosed-parenthesis";
  const res = testRegex(invalidPattern, defaultFlags, "test string");
  assert.equal(res.valid, false);
  assert.ok(res.error?.length && res.error.length > 0);
  assert.equal(res.matchCount, 0);
});

test("handles empty pattern gracefully", () => {
  const res = testRegex("", defaultFlags, "some text");
  assert.equal(res.valid, true);
  assert.equal(res.matchCount, 0);
  assert.equal(res.replacementOutput, "some text");
});
