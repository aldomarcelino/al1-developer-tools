import { test } from "node:test";
import assert from "node:assert/strict";
import { base64UrlDecode, parseJwt, sampleTokens } from "./jwt.ts";

test("decodes base64url strings correctly", () => {
  assert.equal(base64UrlDecode("eyJhbGciOiJIUzI1NiJ9"), '{"alg":"HS256"}');
  assert.equal(base64UrlDecode("eyJzdWIiOiIxMjM0NTY3ODkwIn0"), '{"sub":"1234567890"}');
});

test("parses a valid JWT token with header, payload, and expiry", () => {
  const result = parseJwt(sampleTokens.valid);

  assert.equal(result.isValidFormat, true);
  assert.equal(result.algorithm, "HS256");
  assert.equal(result.tokenType, "JWT");
  assert.equal(result.payload.name, "Aldo Marcelino");
  assert.equal(result.payload.role, "admin");
  assert.equal(result.isExpired, false); // expires in 2032
  assert.ok(result.expiresFormatted);
  assert.ok(result.claims.length >= 5);
});

test("detects expired tokens correctly", () => {
  const result = parseJwt(sampleTokens.expired);

  assert.equal(result.isValidFormat, true);
  assert.equal(result.isExpired, true);
  assert.ok(result.expiresRelative?.includes("ago"));
});

test("rejects malformed tokens with fewer than 3 parts", () => {
  const result = parseJwt("invalid.token");
  assert.equal(result.isValidFormat, false);
  assert.ok(result.error?.includes("Expected 3 parts"));
});

test("rejects empty token input", () => {
  const result = parseJwt("");
  assert.equal(result.isValidFormat, false);
  assert.ok(result.error?.includes("Please enter or paste a JWT token"));
});

test("handles Bearer prefix gracefully", () => {
  const result = parseJwt(`Bearer ${sampleTokens.valid}`);
  assert.equal(result.isValidFormat, true);
  assert.equal(result.payload.role, "admin");
});
