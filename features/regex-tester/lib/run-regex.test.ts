import test from "node:test";
import assert from "node:assert/strict";
import { Worker as NodeWorker } from "node:worker_threads";
import { defaultFlags } from "./regex.ts";
import { runRegex } from "./run-regex.ts";

// Use a real isolated thread, including the browser worker's production handler.
async function createWorker() {
  const entry = new URL("./regex-worker.ts", import.meta.url).href;
  const native = new NodeWorker(
    `
    const { parentPort } = require("node:worker_threads");
    globalThis.self = { postMessage: (data) => parentPort.postMessage(data) };
    import(${JSON.stringify(entry)}).then(() => {
      parentPort.on("message", (data) => self.onmessage({ data }));
      parentPort.postMessage("ready");
    });
  `,
    { eval: true }
  );
  await new Promise<void>((resolve, reject) => {
    native.once("message", () => resolve());
    native.once("error", reject);
  });
  const adapter = {
    onmessage: null as Worker["onmessage"],
    onerror: null as Worker["onerror"],
    postMessage: (data: unknown) => native.postMessage(data),
    terminate: () => {
      void native.terminate();
    },
  };
  native.on("message", (data) =>
    adapter.onmessage?.call(adapter as unknown as Worker, { data } as MessageEvent)
  );
  native.on("error", () =>
    adapter.onerror?.call(adapter as unknown as Worker, {} as ErrorEvent)
  );
  return adapter;
}

test("worker returns matches and replacement", async () => {
  const worker = await createWorker();
  const result = await runRegex(
    worker,
    { pattern: "a+", flags: defaultFlags, testString: "aa bb a", replacement: "x" },
    new AbortController().signal
  );
  assert.equal(result.valid, true);
  assert.equal(result.matchCount, 2);
  assert.equal(result.replacementOutput, "x bb x");
});

test("deadline terminates catastrophic backtracking, including non-global patterns", async () => {
  const worker = await createWorker();
  const start = performance.now();
  const result = await runRegex(
    worker,
    {
      pattern: "(a+)+$",
      flags: { ...defaultFlags, global: false },
      testString: "a".repeat(100) + "!",
      replacement: "x",
    },
    new AbortController().signal,
    100
  );
  assert.equal(result.valid, false);
  assert.match(result.error!, /time limit/);
  assert.ok(performance.now() - start < 2000);
});

test("abort terminates outstanding work", async () => {
  const worker = await createWorker();
  const controller = new AbortController();
  const pending = runRegex(
    worker,
    {
      pattern: "(a+)+$",
      flags: defaultFlags,
      testString: "a".repeat(100) + "!",
      replacement: "",
    },
    controller.signal
  );
  controller.abort();
  assert.match((await pending).error!, /cancelled/);
});
