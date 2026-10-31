import test from "node:test";
import assert from "node:assert/strict";
import { hashBuffer, compareChecksum } from "./hash.ts";
test("SHA-256 matches the known abc vector and handles an empty input", async () => {
  assert.equal(
    await hashBuffer(new TextEncoder().encode("abc").buffer, "SHA-256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
  assert.equal(
    await hashBuffer(new ArrayBuffer(0), "SHA-256"),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});
test("SHA-384 and SHA-512 match known empty input vectors", async () => {
  assert.equal(
    await hashBuffer(new ArrayBuffer(0), "SHA-384"),
    "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b"
  );
  assert.equal(
    await hashBuffer(new ArrayBuffer(0), "SHA-512"),
    "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
  );
});
test("checksum comparison normalizes case, distinguishes errors and mismatches", () => {
  assert.equal(compareChecksum("abcd", " ABCD "), "match");
  assert.equal(compareChecksum("abcd", "abce"), "different");
  assert.equal(compareChecksum("abcd", "abcz"), "invalid");
  assert.equal(compareChecksum("abcd", "abc"), "invalid");
  assert.equal(compareChecksum("abcd", " "), "empty");
});
