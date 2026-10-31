import test from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy } from "./csp.ts";

test("production script policy uses nonces and rejects inline event handlers", () => {
  const policy = contentSecurityPolicy("abcDEF0123+/=");
  const script = policy.split(";").find((part) => part.trim().startsWith("script-src "))!;
  assert.match(script, /'nonce-abcDEF0123\+\/='/);
  assert.match(script, /'strict-dynamic'/);
  assert.ok(!script.includes("unsafe-inline") && !script.includes("unsafe-eval"));
  assert.match(policy, /script-src-attr 'none'/);
  assert.match(policy, /worker-src 'self' blob:/);
});

test("static assets do not receive a fixed nonce; eval is development only", () => {
  assert.ok(!contentSecurityPolicy().includes("nonce-"));
  assert.ok(!contentSecurityPolicy().includes("unsafe-eval"));
  assert.ok(contentSecurityPolicy("abc", true).includes("unsafe-eval"));
  assert.throws(() => contentSecurityPolicy("x'; script-src *"), /Invalid/);
});
