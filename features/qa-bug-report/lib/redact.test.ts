import test from "node:test";
import assert from "node:assert/strict";
import { samplePackage } from "./sample.ts";
import { body, packageSession } from "./model.ts";
import { sanitizeSession } from "./redact.ts";
import { exportEvidence } from "./report.ts";
import { validatePackage } from "./validate.ts";
test("phase 5: nested JSON, echoed JSON strings, query, cookie, headers and raw body secrets are redacted without changing source", () => {
  const source = samplePackage().session;
  const secret = "DUMMY_CAPTURE_SECRET";
  const r = source.requests[1];
  r.url = `https://fixture.test/?tag=one&token=${secret}&tag=two`;
  r.query = [{ name: "token", value: secret }];
  r.headers.push({ name: "Cookie", value: `session=${secret}` });
  r.response.headers.push({ name: "Set-Cookie", value: `token=${secret}` });
  r.body = body(
    JSON.stringify({
      customer: { password: secret, email: "qa@example.test" },
      items: [{ apiKey: secret }],
      public: "safe",
      encoded: JSON.stringify({ token: secret }),
    }),
    "application/json"
  );
  r.response.body = body(`password=${secret}&note=safe`, "text/plain");
  const original = JSON.stringify(source);
  const safe = sanitizeSession(source);
  assert.equal(JSON.stringify(source), original);
  assert.ok(!JSON.stringify(safe).includes(secret));
  assert.ok(safe.redactions.some((a) => a.location.includes("embedded")));
  const payload = JSON.parse(safe.requests[1].body.text);
  assert.equal(payload.public, "safe");
  assert.equal(payload.customer.password, "[REDACTED]");
  assert.equal(safe.requests[1].response.body.status, "Redacted");
  assert.ok(exportEvidence(safe).package.manifest.redacted);
});
test("phase 5: custom literal keys, safe source structure and immutable redacted export", () => {
  const source = samplePackage().session;
  source.requests[1].body = body(
    '{"account_number":"private123","ok":true}',
    "application/json"
  );
  const safe = sanitizeSession(source, { extraKeys: ["account_number"] });
  assert.ok(!safe.requests[1].body.text.includes("private123"));
  const again = sanitizeSession(safe, { extraKeys: ["account_number"] });
  assert.equal(again.redactions.length, safe.redactions.length);
  const extra = packageSession(source);
  Object.assign(extra.session, { hiddenRawSecret: "must not export" });
  assert.throws(() => validatePackage(extra), /unknown field/);
});
test("phase 5: screenshots reject active formats/path names and require independent review", () => {
  const source = samplePackage().session;
  const image = {
    id: "screenshot-1",
    sessionId: source.id,
    name: "capture.png",
    mimeType: "image/png" as const,
    base64: btoa("\x89PNG\r\n\x1a\n"),
    reviewed: false,
  };
  source.attachments = [image];
  validatePackage(packageSession(source));
  assert.equal(exportEvidence(source).package.session.attachments.length, 0);
  assert.throws(() => exportEvidence(source, undefined, true), /Review every screenshot/);
  source.attachments[0].reviewed = true;
  assert.equal(
    exportEvidence(source, undefined, true).package.session.attachments.length,
    1
  );
  source.attachments[0].name = "../outside.png";
  assert.throws(() => validatePackage(packageSession(source)), /paths/);
  source.attachments[0].name = "capture.png";
  source.attachments[0].base64 = btoa('<svg onload="alert(1)"/>');
  assert.throws(() => validatePackage(packageSession(source)), /signature/);
});

test("phase 5: echoed query tuples and named values cannot leak a secret", () => {
  const s = samplePackage().session;
  s.requests[1].response.body = body(
    JSON.stringify({
      query: [
        ["tag", "one"],
        ["token", "DUMMY_CAPTURE_SECRET"],
      ],
      form: [{ name: "password", value: "DUMMY_CAPTURE_SECRET" }],
    }),
    "application/json"
  );
  const safe = sanitizeSession(s);
  assert.ok(!JSON.stringify(safe).includes("DUMMY_CAPTURE_SECRET"));
  assert.equal(JSON.parse(safe.requests[1].response.body.text).query[0][1], "one");
});

test("phase 5: encoded package bodies are omitted rather than bypassing text redaction", () => {
  const source = samplePackage().session;
  source.requests[1].body = body(
    btoa('{"password":"DUMMY_CAPTURE_SECRET"}'),
    "application/octet-stream",
    "Captured",
    null,
    "base64"
  );
  const encoded = source.requests[1].body.text;
  const safe = sanitizeSession(source);
  assert.equal(safe.requests[1].body.status, "Unsupported");
  assert.equal(safe.requests[1].body.text, "");
  assert.equal(source.requests[1].body.text, encoded);
  assert.ok(!exportEvidence(safe).json.includes(encoded));
});

test("screenshot-only report exports only after explicit reviewed-image inclusion", () => {
  const s = samplePackage().session;
  s.requests = [];
  s.report.requestIds = [];
  s.attachments = [
    {
      id: "image-only",
      sessionId: s.id,
      name: "layout.png",
      mimeType: "image/png",
      base64: btoa("\x89PNG\r\n\x1a\n"),
      reviewed: true,
    },
  ];
  assert.throws(() => exportEvidence(s), /relevant request or include/);
  const output = exportEvidence(s, undefined, true).package;
  assert.equal(output.session.requests.length, 0);
  assert.equal(output.session.attachments.length, 1);
  validatePackage(output);
});
