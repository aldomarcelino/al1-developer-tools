import test from "node:test";
import assert from "node:assert/strict";
import { CaptureController } from "../../../extensions/qa-capture/src/capture.ts";
import { limits } from "./model.ts";
import { validatePackage } from "./validate.ts";
function event(at = new Date().toISOString()) {
  return {
    startedDateTime: at,
    time: 5,
    request: {
      method: "POST",
      url: "http://127.0.0.1:3891/api/post",
      headers: [{ name: "Authorization", value: "Bearer DUMMY_CAPTURE_SECRET" }],
      postData: {
        mimeType: "application/json",
        text: '{"password":"DUMMY_CAPTURE_SECRET","ok":true}',
      },
    },
    response: {
      status: 200,
      headers: [{ name: "x-request-id", value: "fixture-post" }],
      content: { mimeType: "application/json", size: 100 },
    },
  };
}
const meta = {
  url: "http://127.0.0.1:3891/",
  userAgent: "Fixture",
  platform: "test",
  tabId: 1,
  environment: "local",
  build: "fixture-1",
};
test("phase 2: immediate body acquisition, start/stop boundaries, redacted storage and round trip", () => {
  const c = new CaptureController();
  c.start(meta);
  let reads = 0;
  c.accept(event(), (done) => {
    reads++;
    done('{"ok":false,"token":"DUMMY_CAPTURE_SECRET","requestId":"server-1"}', "");
  });
  assert.equal(reads, 1);
  assert.equal(c.snapshot()?.requests[0].response.body.status, "Redacted");
  assert.ok(!JSON.stringify(c.snapshot()).includes("DUMMY_CAPTURE_SECRET"));
  c.accept(event("2020-01-01T00:00:00Z"), () => {
    throw new Error("must skip before start");
  });
  assert.equal(c.snapshot()?.requests.length, 1);
  c.mark("Button failed");
  c.stop();
  const count = c.snapshot()?.requests.length;
  c.accept(event(), () => {
    throw new Error("must skip stopped");
  });
  assert.equal(c.snapshot()?.requests.length, count);
  validatePackage(c.export());
  assert.equal(c.export().session.markers[0].sessionId, c.export().session.id);
  c.clear();
  assert.equal(c.snapshot(), null);
});
test("phase 2: delayed content cannot cross stop, session, or tab boundaries", () => {
  const a = new CaptureController(),
    b = new CaptureController();
  a.start(meta);
  b.start({ ...meta, tabId: 2 });
  let finish: ((text: string, encoding: string) => void) | undefined;
  a.accept(event(), (done) => {
    finish = done;
  });
  a.stop();
  finish?.("old-body", "");
  assert.equal(a.snapshot()?.requests[0].response.body.status, "Unavailable");
  assert.equal(b.snapshot()?.requests.length, 0);
  const old = a.snapshot()!.id;
  a.start(meta);
  assert.notEqual(a.snapshot()?.id, old);
  finish?.("old-body", "");
  assert.equal(a.snapshot()?.requests.length, 0);
  a.clear();
  b.clear();
});
test("phase 2: body, request, navigation and duration limits are explicit", () => {
  const c = new CaptureController();
  c.start(meta);
  const large = event();
  large.response.content.size = limits.bodyBytes + 1;
  c.accept(large, () => {
    throw new Error("large body must not be requested");
  });
  assert.equal(c.snapshot()?.requests[0].response.body.status, "Truncated");
  c.navigate("http://127.0.0.1:3891/second");
  assert.equal(c.snapshot()?.markers[0].source, "navigation");
  for (let i = 1; i < limits.requests + 1; i++)
    c.accept(event(), (done) => done("{}", ""));
  assert.equal(c.snapshot()?.state, "limit-reached");
  assert.equal(c.snapshot()?.requests.length, limits.requests);
  c.start(meta);
  c.navigate("chrome://settings");
  assert.equal(c.snapshot()?.state, "error");
  c.clear();
});

test("phase 2: duration timeout and response retrieval timeout do not silently keep capturing", (t) => {
  t.mock.timers.enable({
    apis: ["Date", "setTimeout"],
    now: new Date("2026-10-31T00:00:00Z"),
  });
  const c = new CaptureController();
  c.start(meta);
  c.accept(event(), () => {});
  t.mock.timers.tick(3001);
  assert.equal(c.snapshot()?.requests[0].response.body.status, "Unavailable");
  assert.match(c.snapshot()?.requests[0].response.body.reason ?? "", /timed out/);
  t.mock.timers.tick(limits.durationMs);
  assert.equal(c.snapshot()?.state, "limit-reached");
  c.clear();
});

test("phase 2: encoded text is decoded, valid empty is distinct from missing or failed content", () => {
  const c = new CaptureController();
  c.start(meta);
  c.accept(event(), (done) => done(btoa('{"ok":true}'), "base64"));
  assert.equal(c.snapshot()?.requests[0].response.body.text, '{"ok":true}');
  c.accept(event(), (done) => done("", ""));
  assert.equal(c.snapshot()?.requests[1].response.body.status, "Unavailable");
  const empty = event();
  empty.response.content.size = 0;
  c.accept(empty, (done) => done("", ""));
  assert.equal(c.snapshot()?.requests[2].response.body.status, "Empty");
  c.accept(event(), () => {
    throw new Error("provider unavailable");
  });
  assert.match(c.snapshot()?.requests[3].response.body.reason ?? "", /could not/);
  c.clear();
});

test("phase 2: aggregate capture body budget stops recording and omits the over-budget body", () => {
  const c = new CaptureController();
  c.start(meta);
  const text = JSON.stringify({ padding: "x".repeat(62000) });
  for (let i = 0; i < 100 && c.snapshot()?.state === "recording"; i++)
    c.accept(event(), (done) => done(text, ""));
  const s = c.snapshot()!;
  assert.equal(s.state, "limit-reached");
  assert.ok(s.requests.length < limits.requests);
  assert.equal(s.requests.at(-1)?.response.body.status, "Truncated");
  assert.match(s.notices.at(-1) ?? "", /4 MiB/);
  c.clear();
});
