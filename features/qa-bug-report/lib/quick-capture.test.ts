import test from "node:test";
import assert from "node:assert/strict";
import { CaptureController } from "../../../extensions/qa-capture/src/capture.ts";
import { NetworkCapture } from "../../../extensions/qa-capture/src/network.ts";
import {
  validRecipient,
  viewerOrigin,
} from "../../../extensions/qa-capture/src/handoff.ts";
import { validatePackage } from "./validate.ts";
const meta = {
  url: "http://localhost:3891",
  userAgent: "test",
  platform: "test",
  tabId: 1,
  environment: "",
  build: "",
};
function started(network: NetworkCapture, id = "a", extra: Record<string, unknown> = {}) {
  network.event("Network.requestWillBeSent", {
    requestId: id,
    timestamp: 100,
    wallTime: Date.now() / 1000,
    request: {
      url: "http://localhost:3891/test?tag=one&tag=two",
      method: "POST",
      headers: {
        Authorization: "Bearer DUMMY_SECRET",
        "Content-Type": "application/json",
      },
      postData: '{"password":"DUMMY_SECRET","name":"Ada"}',
      hasPostData: true,
    },
    ...extra,
  });
}
test("quick CDP capture retains query/payload/response/IDs and redacts before export", async () => {
  const controller = new CaptureController();
  controller.start(meta, "extension-debugger");
  const network = new NetworkCapture(controller, async () => ({
    body: '{"requestId":"server-1","token":"DUMMY_SECRET"}',
    base64Encoded: false,
  }));
  started(network);
  network.event("Network.responseReceived", {
    requestId: "a",
    response: {
      status: 400,
      statusText: "Bad",
      headers: { "x-request-id": "server-1" },
      mimeType: "application/json",
    },
  });
  network.event("Network.loadingFinished", { requestId: "a", timestamp: 100.25 });
  await new Promise((r) => setTimeout(r, 0));
  controller.stop();
  const output = controller.export();
  validatePackage(output);
  assert.equal(output.session.capture, "extension-debugger");
  assert.equal(output.session.requests[0].durationMs, 250);
  assert.equal(output.session.requests[0].query.length, 2);
  assert.equal(output.session.requests[0].response.status, 400);
  assert.ok(output.session.requests[0].response.body.text.includes("server-1"));
  assert.ok(!JSON.stringify(output).includes("DUMMY_SECRET"));
});
test("quick capture stops late bodies, failed requests and redirects never fetch target URLs", async () => {
  const controller = new CaptureController();
  controller.start(meta, "extension-debugger");
  let resolve: (v: Record<string, unknown>) => void = () => {};
  const network = new NetworkCapture(
    controller,
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  started(network);
  network.event("Network.responseReceived", {
    requestId: "a",
    response: { status: 200, mimeType: "application/json" },
  });
  network.event("Network.loadingFinished", { requestId: "a", timestamp: 101 });
  controller.stop();
  resolve({ body: '{"late":true}' });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(controller.snapshot()!.requests[0].response.body.status, "Unavailable");
  controller.start(meta, "extension-debugger");
  network.clear();
  started(network, "b");
  network.event("Network.loadingFailed", {
    requestId: "b",
    timestamp: 102,
    errorText: "net::ERR_FAILED",
  });
  assert.equal(controller.snapshot()!.requests[0].response.status, 0);
  started(network, "c");
  started(network, "c", {
    redirectResponse: {
      status: 302,
      mimeType: "text/html",
      headers: { location: "/next" },
    },
  });
  assert.equal(controller.snapshot()!.requests[1].response.status, 302);
  controller.stop();
  network.clear();
});
test("quick in-flight resource cap and explicit origin handoff restrictions", () => {
  const c = new CaptureController();
  c.start(meta, "extension-debugger");
  const n = new NetworkCapture(c, async () => ({}));
  for (let i = 0; i < 251; i++) started(n, String(i));
  assert.equal(c.snapshot()!.state, "limit-reached");
  c.clear();
  n.clear();
  assert.throws(() => viewerOrigin("https://evil.example"));
  assert.throws(() => viewerOrigin("https://dotools.com.evil.example"));
  assert.throws(() => viewerOrigin("https://dotools.com/"));
  const handoff = {
    tabId: 4,
    origin: "http://localhost:3000",
    nonce: "secret",
    expires: Date.now() + 10000,
  };
  const sender = {
    id: "ext",
    frameId: 0,
    tab: { id: 4, url: "http://localhost:3000/tools/qa-bug-report#qa-capture=secret" },
  };
  assert.ok(validRecipient(sender, "ext", handoff, "secret"));
  assert.ok(!validRecipient(sender, "ext", handoff, "wrong"));
  assert.ok(!validRecipient({ ...sender, frameId: 1 }, "ext", handoff, "secret"));
  assert.ok(
    !validRecipient(
      { ...sender, tab: { ...sender.tab, id: 5 } },
      "ext",
      handoff,
      "secret"
    )
  );
  assert.ok(!validRecipient(sender, "ext", { ...handoff, expires: 0 }, "secret"));
});

test("quick capture omits large response before body retrieval and honors metadata budget", () => {
  const c = new CaptureController();
  c.start(meta, "extension-debugger");
  let calls = 0;
  const n = new NetworkCapture(c, async () => {
    calls++;
    return { body: "unexpected" };
  });
  started(n);
  n.event("Network.responseReceived", {
    requestId: "a",
    response: { status: 200, mimeType: "application/json" },
  });
  n.event("Network.dataReceived", { requestId: "a", dataLength: 100000 });
  n.event("Network.loadingFinished", { requestId: "a", timestamp: 101 });
  assert.equal(c.snapshot()!.requests[0].response.body.status, "Truncated");
  assert.equal(calls, 0);
  c.stop();
});

test("response headers cannot grow concurrent in-flight metadata beyond the budget", () => {
  const c = new CaptureController();
  c.start(meta, "extension-debugger");
  const n = new NetworkCapture(c, async () => ({}));
  started(n, "one");
  started(n, "two");
  const headers = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [`x-fixture-${i}`, "x".repeat(16000)])
  );
  for (const id of ["one", "two"])
    n.event("Network.responseReceived", {
      requestId: id,
      response: { status: 200, mimeType: "text/plain", headers },
    });
  assert.equal(c.snapshot()!.state, "limit-reached");
  c.clear();
  n.clear();
});

test("pause cancels pending bodies, ignores paused requests and resume preserves session links", async () => {
  const c = new CaptureController();
  c.start(meta, "extension-debugger");
  let late: (v: Record<string, unknown>) => void = () => {};
  const n = new NetworkCapture(
    c,
    () =>
      new Promise((resolve) => {
        late = resolve;
      })
  );
  started(n, "pending");
  n.event("Network.responseReceived", {
    requestId: "pending",
    response: { status: 200, mimeType: "application/json" },
  });
  n.event("Network.loadingFinished", { requestId: "pending", timestamp: 101 });
  const id = c.snapshot()!.id;
  c.pause();
  n.clear();
  late({ body: '{"late":true}' });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(c.snapshot()!.requests[0].response.body.status, "Unavailable");
  started(n, "paused");
  n.event("Network.loadingFinished", { requestId: "paused", timestamp: 102 });
  assert.equal(c.snapshot()!.requests.length, 1);
  c.mark("UI bug while paused");
  c.resume();
  assert.equal(c.snapshot()!.id, id);
  assert.equal(c.snapshot()!.state, "recording");
  c.stop();
  validatePackage(c.export());
});

test("request evidence selection toggles persistently and rejects unknown IDs", () => {
  const c = new CaptureController();
  c.start(meta, "extension-debugger");
  const n = new NetworkCapture(c, async () => ({}));
  started(n, "selected");
  n.event("Network.loadingFailed", {
    requestId: "selected",
    timestamp: 101,
    errorText: "fixture failure",
  });
  const id = c.snapshot()!.requests[0].id;
  assert.equal(c.toggleRequest(id), true);
  assert.deepEqual(c.export().session.report.requestIds, [id]);
  c.pause();
  assert.equal(c.toggleRequest(id), false);
  assert.deepEqual(c.export().session.report.requestIds, []);
  assert.throws(() => c.toggleRequest("missing"), /not found/);
  c.stop();
});
