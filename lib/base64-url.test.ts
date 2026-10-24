import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeBase64,
  decodeBase64Url,
  decodeHex,
  decodeUrl,
  encodeBase64,
  encodeBase64Url,
  encodeHex,
  encodeUrl,
  processEncoding,
} from "./base64-url.ts";

test("encodes and decodes standard Base64 with UTF-8 & emojis", () => {
  const text = "Hello World! 🚀 程序员 Selamat Pagi";
  const encoded = encodeBase64(text);
  const decoded = decodeBase64(encoded);
  assert.equal(decoded, text);
});

test("handles base64 padding option", () => {
  const text = "test string";
  const withPad = encodeBase64(text, false);
  const withoutPad = encodeBase64(text, true);
  assert.match(withPad, /=+$/);
  assert.doesNotMatch(withoutPad, /=+$/);
  // decoding works even without padding
  assert.equal(decodeBase64(withoutPad), text);
});

test("encodes and decodes Base64URL (RFC 4648 §5)", () => {
  const text = "subjects?direction=left&sort=desc";
  const b64url = encodeBase64Url(text);
  assert.ok(!b64url.includes("+"));
  assert.ok(!b64url.includes("/"));
  assert.equal(decodeBase64Url(b64url), text);
});

test("encodes and decodes URL Percent-Encoding", () => {
  const raw = "hello world & key=value+100% / test";
  const encoded = encodeUrl(raw, true);
  assert.equal(encoded, "hello%20world%20%26%20key%3Dvalue%2B100%25%20%2F%20test");
  assert.equal(decodeUrl(encoded), raw);
});

test("encodes and decodes Hexadecimal", () => {
  const text = "Developer 2026";
  const hex = encodeHex(text);
  assert.match(hex, /^[0-9a-f]+$/);
  assert.equal(decodeHex(hex), text);
});

test("processEncoding handles line-by-line mode correctly", () => {
  const lines = "line one\nline two\nline three";
  const res = processEncoding(lines, "base64", "encode", { lineByLine: true });
  assert.ok(res.success);
  const decoded = processEncoding(res.output, "base64", "decode", { lineByLine: true });
  assert.equal(decoded.output, lines);
});

test("reports meaningful errors on malformed input", () => {
  const invalidB64 = "###invalid@@@base64";
  const res = processEncoding(invalidB64, "base64", "decode");
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("Invalid Base64"));

  const invalidHex = "123"; // odd length
  const hexRes = processEncoding(invalidHex, "hex", "decode");
  assert.equal(hexRes.success, false);
  assert.ok(hexRes.error?.includes("Invalid Hex sequence"));
});
