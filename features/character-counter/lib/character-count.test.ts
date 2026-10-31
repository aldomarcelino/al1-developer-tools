import test from "node:test";
import assert from "node:assert/strict";
import { countText } from "./character-count.ts";

test("empty text has no characters, words, lines, or bytes", () => {
  assert.deepEqual(countText(""), {
    characters: 0,
    withoutWhitespace: 0,
    words: 0,
    lines: 0,
    bytes: 0,
    codePoints: 0,
    codeUnits: 0,
  });
});
test("counts text and trailing blank lines", () => {
  const result = countText("Hello world!\n");
  assert.equal(result.characters, 13);
  assert.equal(result.withoutWhitespace, 11);
  assert.equal(result.words, 2);
  assert.equal(result.lines, 2);
  assert.equal(result.bytes, 13);
});
test("combined emoji and accents differ from bytes and JavaScript length", () => {
  assert.deepEqual(countText("👨‍👩‍👧‍👦e\u0301"), {
    characters: 2,
    withoutWhitespace: 2,
    words: 1,
    lines: 1,
    bytes: 28,
    codePoints: 9,
    codeUnits: 13,
  });
});
test("counts mixed newline conventions and Unicode whitespace", () => {
  const result = countText("a\r\nb\rc\n\t\u00a0\u3000");
  assert.equal(result.lines, 4);
  assert.equal(result.withoutWhitespace, 3);
  assert.equal(result.words, 3);
});
test("recognizes words in non-Latin scripts", () => {
  const result = countText("こんにちは 世界");
  assert.equal(result.characters, 8);
  assert.equal(result.withoutWhitespace, 7);
  assert.equal(result.words, 2);
});
