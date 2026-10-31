import test from "node:test";
import assert from "node:assert/strict";
import { packageSession, newSession, type Session } from "./model.ts";
async function owner(
  options: { seed?: Record<string, unknown>; missingTab?: number } = {}
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  let listener: (
    m: unknown,
    s: unknown,
    reply: (v: Record<string, unknown>) => void
  ) => boolean;
  let event: (target: { tabId: number }, method: string, p: unknown) => void = () => {};
  let failDelete = false;
  const stored: Record<string, unknown> = { ...options.seed },
    opened: string[] = [],
    commands: string[] = [];
  const mock = {
    runtime: {
      id: "ext",
      getURL: (p: string) => `chrome-extension://ext/${p}`,
      onMessage: {
        addListener: (fn: typeof listener) => {
          listener = fn;
        },
      },
    },
    storage: {
      session: {
        get: async (k: string) => ({ [k]: stored[k] }),
        set: async (v: Record<string, unknown>) => {
          Object.assign(stored, v);
        },
        remove: async (k: string) => {
          delete stored[k];
        },
      },
      local: {
        get: async (k: string) => ({ [k]: stored[k] }),
        set: async (v: Record<string, unknown>) => {
          Object.assign(stored, v);
        },
        remove: async (k: string) => {
          if (failDelete) throw new Error("fixture deletion denied");
          delete stored[k];
        },
      },
    },
    debugger: {
      attach: async () => {
        commands.push("attach");
      },
      detach: async () => {},
      sendCommand: async (_target: unknown, method: string) => {
        commands.push(method);
        return { body: '{"ok":true}' };
      },
      onEvent: {
        addListener: (fn: typeof event) => {
          event = fn;
        },
      },
      onDetach: { addListener: () => {} },
    },
    tabs: {
      get: async (id: number) => {
        if (id === options.missingTab) throw new Error("Tab no longer exists");
        return {
          id,
          url: "http://localhost:3891",
          active: true,
          windowId: 1,
        };
      },
      captureVisibleTab: async () => "data:image/png;base64,iVBORw0KGgo=",
      update: async (id: number) => ({ id, windowId: 1 }),
      create: async ({ url }: { url: string }) => {
        opened.push(url);
        return { id: 99 };
      },
      sendMessage: async () => {},
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
    },
    windows: { update: async () => {} },
    scripting: { executeScript: async () => {} },
  };
  Object.defineProperty(globalThis, "chrome", { value: mock, configurable: true });
  const moduleUrl = new URL(
    "../../../extensions/qa-capture/src/worker.ts",
    import.meta.url
  );
  moduleUrl.searchParams.set("test", crypto.randomUUID());
  await import(moduleUrl.href);
  const popup = { id: "ext", url: "chrome-extension://ext/popup.html" };
  const send = (
    action: string,
    extra: Record<string, unknown> = {},
    sender: unknown = popup
  ) =>
    new Promise<Record<string, unknown>>((resolve) => {
      listener({ qa: "quick", action, tabId: 1, ...extra }, sender, resolve);
    });
  return {
    send,
    event,
    stored,
    opened,
    commands,
    failDelete: () => {
      failDelete = true;
    },
    cleanup: async () => {
      failDelete = false;
      await send("clear");
      await new Promise((r) => setTimeout(r, 200));
      if (original) Object.defineProperty(globalThis, "chrome", original);
      else Reflect.deleteProperty(globalThis, "chrome");
    },
  };
}
test("quick owner isolates tabs, stops capture, binds/consumes handoff and clears locally", async () => {
  const o = await owner();
  try {
    assert.equal((await o.send("start", { origin: "http://localhost:3000" })).ok, true);
    const s = (await o.send("status")).session as Session;
    assert.equal(s.state, "recording");
    assert.match(
      String(
        (await o.send("start", { tabId: 2, origin: "http://localhost:3000" })).error
      ),
      /Capture in progress/
    );
    const other = { id: "ext", frameId: 0, tab: { id: 2, url: "http://localhost:3891" } };
    assert.match(
      String((await o.send("mark", { description: "wrong tab" }, other)).error),
      /no quick capture/
    );
    assert.equal((await o.send("finish")).ok, true);
    const url = new URL(o.opened[0]),
      nonce = new URLSearchParams(url.hash.slice(1)).get("qa-capture");
    const recipient = { id: "ext", frameId: 0, tab: { id: 99, url: url.href } };
    assert.ok((await o.send("handoff", { nonce }, recipient)).package);
    assert.ok((await o.send("handoff", { nonce }, { ...recipient, frameId: 1 })).error);
    assert.equal((await o.send("ack", { nonce }, recipient)).ok, true);
    assert.ok((await o.send("handoff", { nonce }, recipient)).error);
    assert.equal(((await o.send("status")).session as Session).state, "stopped");
    assert.equal((await o.send("clear", { tabId: 77 })).ok, true);
    assert.equal(o.stored["ramupod-quick-capture"], undefined);
  } finally {
    await o.cleanup();
  }
});
test("starting a new quick session invalidates prior handoff and failed deletion is visible", async () => {
  const o = await owner();
  try {
    await o.send("start", { origin: "http://localhost:3000" });
    await o.send("finish");
    const url = new URL(o.opened[0]);
    const nonce = new URLSearchParams(url.hash.slice(1)).get("qa-capture");
    await o.send("start", { origin: "http://localhost:3000" });
    assert.ok(
      (
        await o.send(
          "handoff",
          { nonce },
          { id: "ext", frameId: 0, tab: { id: 99, url: url.href } }
        )
      ).error
    );
    o.failDelete();
    assert.match(String((await o.send("clear")).error), /deletion denied/);
    assert.ok((await o.send("export")).package);
  } finally {
    await o.cleanup();
  }
});

test("paused testing retains the cross-tab lock and resumes with the same session", async () => {
  const o = await owner();
  try {
    await o.send("start", { origin: "http://localhost:3000" });
    const id = ((await o.send("status")).session as Session).id;
    await o.send("pause");
    assert.equal(((await o.send("status")).session as Session).state, "paused");
    assert.ok(
      (await o.send("start", { tabId: 2, origin: "http://localhost:3000" })).error
    );
    assert.ok((await o.send("shot-start", { tabId: 2 })).error);
    await o.send("resume");
    const resumed = (await o.send("status")).session as Session;
    assert.equal(resumed.id, id);
    assert.equal(resumed.state, "recording");
    assert.ok(o.commands.includes("Network.disable"));
    await o.send("stop");
    assert.ok(
      (await o.send("start", { tabId: 2, origin: "http://localhost:3000" })).error
    );
    await o.send("finish");
    assert.equal((await o.send("shot-start", { tabId: 2 })).ok, true);
    await o.send("shot-exit");
  } finally {
    await o.cleanup();
  }
});
test("standalone screenshots do not attach debugger and tokens/tabs isolate their lifecycle", async () => {
  const o = await owner();
  try {
    assert.equal((await o.send("shot-start")).ok, true);
    const status = await o.send("status"),
      activity = status.activity as { mode: string; token: string; tabId: number };
    assert.equal(activity.mode, "screenshot");
    assert.equal(activity.tabId, 1);
    assert.ok(!o.commands.includes("attach"));
    const other = await o.send("status", { tabId: 2 });
    assert.equal((other.activity as { token?: string }).token, undefined);
    assert.ok((await o.send("shot-start", { tabId: 2 })).error);
    assert.ok((await o.send("start", { origin: "http://localhost:3000" })).error);
    assert.ok((await o.send("shot-image", { token: "wrong" })).error);
    const ownerSender = {
      id: "ext",
      frameId: 0,
      tab: { id: 1, url: "http://localhost:3891" },
    };
    assert.ok((await o.send("shot-exit", { token: "stale" }, ownerSender)).error);
    assert.ok((await o.send("shot-image", { token: activity.token }, ownerSender)).image);
    await o.send("shot-exit", { token: activity.token }, ownerSender);
    assert.equal((await o.send("status")).activity, null);
  } finally {
    await o.cleanup();
  }
});

test("restoring a closed tab retains stopped evidence but releases its activity lock", async () => {
  const s = newSession("http://localhost:3891", "extension-debugger");
  s.tabId = 7;
  s.state = "recording";
  const o = await owner({
    seed: {
      "ramupod-quick-capture": packageSession(s, true),
      "qa-test-open": true,
      "qa-viewer": "http://localhost:3000",
    },
    missingTab: 7,
  });
  try {
    assert.equal((await o.send("status")).activity, null);
    assert.ok((await o.send("export")).package);
    assert.equal((await o.send("shot-start")).ok, true);
    await o.send("shot-exit");
  } finally {
    await o.cleanup();
  }
});
