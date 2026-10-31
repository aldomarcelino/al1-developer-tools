import test from "node:test";
import assert from "node:assert/strict";
import { samplePackage } from "./sample.ts";
import { importEvidence } from "./import.ts";
import { validatePackage } from "./validate.ts";
import { importHar, parseHarEntry } from "./har.ts";
import { body, limits } from "./model.ts";
export function entry(overrides: Record<string, unknown> = {}) {
  return {
    startedDateTime: "2026-10-30T09:00:01Z",
    time: 12,
    request: { method: "GET", url: "https://fixture.test/api?tag=a&tag=b", headers: [] },
    response: {
      status: 200,
      statusText: "OK",
      headers: [],
      content: { mimeType: "application/json", text: '{"ok":true}', size: 11 },
    },
    timings: { wait: 10 },
    ...overrides,
  };
}
test("phase 1: package and HAR import preserve repeated query and explicit body completeness", () => {
  const source = samplePackage();
  assert.equal(validatePackage(source), source);
  const imported = importEvidence(JSON.stringify(source));
  assert.equal(imported.session.requests.length, 3);
  const har = importHar({ log: { version: "1.2", entries: [entry()] } });
  validatePackage(har);
  assert.deepEqual(har.session.requests[0].query, [
    { name: "tag", value: "a" },
    { name: "tag", value: "b" },
  ]);
  const missing = parseHarEntry(
    entry({
      response: {
        status: 200,
        headers: [],
        content: { mimeType: "application/json", size: 12 },
      },
    }),
    "s",
    "r"
  );
  assert.equal(missing.response.body.status, "Unavailable");
  const empty = parseHarEntry(
    entry({ response: { status: 204, headers: [], content: {} } }),
    "s",
    "r"
  );
  assert.equal(empty.response.body.status, "Empty");
  const html = parseHarEntry(
    entry({
      response: {
        status: 500,
        headers: [],
        content: { mimeType: "text/html", text: '<script>alert("x")</script>' },
      },
    }),
    "s",
    "r"
  );
  assert.equal(html.response.body.text, '<script>alert("x")</script>');
  assert.equal(body("x".repeat(limits.bodyBytes + 1)).status, "Truncated");
});
test("phase 1: reject corrupt files, unknown versions, mixed sessions and broken references", () => {
  assert.throws(() => importEvidence("nope"), /Invalid JSON/);
  assert.throws(() => importEvidence(" ".repeat(limits.importBytes + 1)), /12 MiB/);
  assert.throws(() => validatePackage({ ...samplePackage(), version: 99 }), /version/);
  for (const mutate of [
    (p: ReturnType<typeof samplePackage>) => {
      p.session.requests[0].sessionId = "other";
    },
    (p: ReturnType<typeof samplePackage>) => {
      p.session.report.requestIds = ["missing"];
    },
    (p: ReturnType<typeof samplePackage>) => {
      p.session.requests[1].id = p.session.requests[0].id;
    },
    (p: ReturnType<typeof samplePackage>) => {
      p.manifest.requestCount = 99;
    },
  ]) {
    const p = samplePackage();
    mutate(p);
    assert.throws(() => validatePackage(p));
  }
  assert.throws(
    () =>
      importHar({
        log: {
          version: "1.2",
          entries: [
            entry({
              request: { method: "GET", url: "javascript:alert(1)", headers: [] },
            }),
          ],
        },
      }),
    /HTTP/
  );
  assert.throws(() => importHar({ log: { version: "1.1", entries: [] } }), /1.2/);
});

test("phase 1: HAR textual encodings/forms are explicit and binary/multipart/streaming are unsupported", () => {
  const encoded = parseHarEntry(
    entry({
      response: {
        status: 200,
        headers: [],
        content: {
          mimeType: "application/json",
          encoding: "base64",
          text: btoa('{"ok":true}'),
        },
      },
    }),
    "s",
    "r"
  );
  assert.equal(encoded.response.body.text, '{"ok":true}');
  const form = parseHarEntry(
    entry({
      request: {
        method: "POST",
        url: "https://fixture.test/",
        headers: [],
        postData: {
          mimeType: "application/x-www-form-urlencoded",
          params: [
            { name: "tag", value: "one" },
            { name: "tag", value: "two" },
          ],
        },
      },
    }),
    "s",
    "r"
  );
  assert.equal(form.body.text, "tag=one&tag=two");
  const multipart = parseHarEntry(
    entry({
      request: {
        method: "POST",
        url: "https://fixture.test/",
        headers: [],
        postData: { mimeType: "multipart/form-data", text: "opaque" },
      },
    }),
    "s",
    "r"
  );
  assert.equal(multipart.body.status, "Unsupported");
  for (const mimeType of ["application/octet-stream", "text/event-stream"]) {
    const r = parseHarEntry(
      entry({ response: { status: 200, headers: [], content: { mimeType } } }),
      "s",
      "r"
    );
    assert.equal(r.response.body.status, "Unsupported");
  }
  const invalid = parseHarEntry(
    entry({
      response: {
        status: 200,
        headers: [],
        content: {
          mimeType: "application/json",
          encoding: "base64",
          text: "not-base64!",
        },
      },
    }),
    "s",
    "r"
  );
  assert.equal(invalid.response.body.status, "Unavailable");
  const headers = parseHarEntry(
    entry({
      request: {
        method: "GET",
        url: "https://fixture.test/",
        headers: [{ name: "x-test", value: "safe", comment: "ignored HAR metadata" }],
      },
    }),
    "s",
    "r"
  );
  assert.deepEqual(headers.headers, [{ name: "x-test", value: "safe" }]);
});
