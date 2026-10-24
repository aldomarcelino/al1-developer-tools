import test from "node:test";
import assert from "node:assert/strict";
import {
  generateBase64Key,
  generateCustomKey,
  generateKeySuite,
  generateMemorablePassphrase,
  generateNanoId,
  generateRandomHex,
  generateUuidV4,
  generateUuidV7,
} from "./keygen.ts";

test("generates valid UUID v4 format", () => {
  const uuid = generateUuidV4();
  assert.equal(uuid.length, 36);
  assert.match(
    uuid,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test("generates valid UUID v7 format", () => {
  const uuid = generateUuidV7();
  assert.equal(uuid.length, 36);
  assert.match(
    uuid,
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test("generates NanoID with expected length", () => {
  const id = generateNanoId(21);
  assert.equal(id.length, 21);
  assert.match(id, /^[a-zA-Z0-9_-]+$/);
});

test("generates random hex with exact length", () => {
  const hex = generateRandomHex(16);
  assert.equal(hex.length, 32); // 16 bytes = 32 hex chars
  assert.match(hex, /^[0-9a-f]{32}$/);
});

test("generates base64 key correctly", () => {
  const b64 = generateBase64Key(32);
  assert.equal(typeof b64, "string");
  assert.ok(b64.length >= 44);
});

test("generates memorable passphrases with dictionary words", () => {
  const phrase = generateMemorablePassphrase(4);
  const parts = phrase.split("-");
  assert.equal(parts.length, 4);
});

test("generates full key suite with all categories", () => {
  const suite = generateKeySuite();
  assert.ok(suite.length >= 10);
  const categories = new Set(suite.map((k) => k.category));
  assert.ok(categories.has("tokens"));
  assert.ok(categories.has("keys"));
  assert.ok(categories.has("passwords"));
  assert.ok(categories.has("numeric"));
});

test("generates custom key with selected character sets", () => {
  const numericOnly = generateCustomKey({
    length: 10,
    uppercase: false,
    lowercase: false,
    numbers: true,
    symbols: false,
  });
  assert.equal(numericOnly.length, 10);
  assert.match(numericOnly, /^\d{10}$/);
});
