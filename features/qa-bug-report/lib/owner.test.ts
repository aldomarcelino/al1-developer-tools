import test from "node:test";
import assert from "node:assert/strict";
import type { PanelApi } from "../../../extensions/qa-capture/src/api.ts";
import { samplePackage } from "./sample.ts";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
async function owner(
  savedPromise: Promise<Record<string, unknown>> = Promise.resolve({})
) {
  const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome"),
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const panel = new EventTarget() as EventTarget & { qaCapture?: PanelApi };
  const callbacks: ((value: unknown) => void)[] = [];
  const stored: Record<string, unknown> = {};
  let failSet = false;
  let delayRemove = false,
    releaseRemove: (() => void) | undefined;
  const stub = {
    devtools: {
      inspectedWindow: {
        tabId: 10,
        eval: (_expression: string, callback: (value: unknown) => void) =>
          callbacks.push(callback),
      },
      network: {
        onRequestFinished: { addListener: () => {} },
        onNavigated: { addListener: () => {} },
      },
      panels: {
        create: (
          _name: string,
          _icon: string,
          _url: string,
          created: (p: {
            onShown: { addListener: (fn: (w: unknown) => void) => void };
          }) => void
        ) => created({ onShown: { addListener: (fn) => fn(panel) } }),
      },
    },
    storage: {
      local: {
        get: () => savedPromise,
        set: async (value: Record<string, unknown>) => {
          if (failSet) throw new Error("fixture quota reached");
          Object.assign(stored, structuredClone(value));
        },
        remove: async (key: string) => {
          if (delayRemove)
            await new Promise<void>((resolve) => {
              releaseRemove = resolve;
            });
          delete stored[key];
        },
        clear: async () => {
          Object.keys(stored).forEach((key) => delete stored[key]);
        },
      },
    },
  };
  Object.defineProperty(globalThis, "chrome", { value: stub, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: new EventTarget(),
    configurable: true,
  });
  const url = new URL("../../../extensions/qa-capture/src/devtools.ts", import.meta.url);
  url.searchParams.set("test", crypto.randomUUID());
  await import(url.href);
  const api = panel.qaCapture!;
  return {
    api,
    callbacks,
    stored,
    failWrites: () => {
      failSet = true;
    },
    delayRemove: () => {
      delayRemove = true;
    },
    releaseRemove: () => {
      delayRemove = false;
      releaseRemove?.();
    },
    cleanup: async () => {
      api.stop();
      delayRemove = false;
      releaseRemove?.();
      await api.clear();
      if (originalChrome) Object.defineProperty(globalThis, "chrome", originalChrome);
      else Reflect.deleteProperty(globalThis, "chrome");
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
    },
  };
}
const meta = {
  url: "http://127.0.0.1:3891/",
  userAgent: "Synthetic owner test",
  platform: "test",
};
test("phase 5: Clear cancels a pending Start and its storage deletion cannot erase a later session", async () => {
  const o = await owner();
  try {
    const pending = o.api.start("local", "v1");
    await tick();
    assert.equal(o.callbacks.length, 1);
    await o.api.clear();
    o.callbacks.shift()!(meta);
    await assert.rejects(pending, /cancelled/);
    assert.equal(o.api.snapshot(), null);
    o.delayRemove();
    const clearing = o.api.clear();
    await tick();
    const next = o.api.start("new-local", "v2");
    await tick();
    o.callbacks.shift()!(meta);
    await next;
    assert.equal(o.api.snapshot()?.state, "recording");
    assert.equal(Object.keys(o.stored).length, 0);
    o.releaseRemove();
    await clearing;
    await tick();
    const saved = o.stored["ramupod-qa-tab-10"] as ReturnType<typeof samplePackage>;
    assert.equal(saved.session.id, o.api.snapshot()?.id);
    assert.equal(saved.session.environment.value, "new-local");
  } finally {
    await o.cleanup();
  }
});
test("phase 5: Clear during recovery does not resurrect a saved session", async () => {
  let release: (value: Record<string, unknown>) => void = () => {};
  const saved = new Promise<Record<string, unknown>>((resolve) => {
    release = resolve;
  });
  const o = await owner(saved);
  try {
    await o.api.clearAll();
    release({ "ramupod-qa-tab-10": samplePackage() });
    await tick();
    assert.equal(o.api.snapshot(), null);
  } finally {
    await o.cleanup();
  }
});

test("phase 5: storage quota failures are surfaced to the live panel while export remains available", async () => {
  const o = await owner();
  let latest: string[] = [];
  const unsubscribe = o.api.subscribe((s) => {
    latest = s?.notices ?? [];
  });
  try {
    o.failWrites();
    const pending = o.api.start("local", "v1");
    await tick();
    o.callbacks.shift()!(meta);
    await pending;
    await tick();
    assert.ok(latest.some((n) => n.includes("recovery storage failed")));
    assert.equal(o.api.export().session.state, "recording");
  } finally {
    unsubscribe();
    await o.cleanup();
  }
});
