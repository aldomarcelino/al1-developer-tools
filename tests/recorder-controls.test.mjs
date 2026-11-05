import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { deviceError } from "../extensions/qa-capture/src/device-errors.ts";

function source(name) {
  return ts.transpileModule(
    readFileSync(
      new URL(`../extensions/qa-capture/src/${name}.ts`, import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }
  ).outputText;
}

function worker({
  session = {},
  recorder = offscreen(),
  createTab,
  countdown = true,
  overlayFailure = false,
  cameraReady = true,
} = {}) {
  let listener, onUpdated, onRemoved;
  const messages = [],
    injections = [];
  const ignore = { addListener() {} };
  let connected = false;
  const sequence = [],
    cameraMessages = [],
    offscreenMessages = [];
  const chrome = {
    runtime: {
      id: "test-extension",
      getURL: (path) => `chrome-extension://test-extension/${path}`,
      onMessage: {
        addListener: (fn) => {
          listener = fn;
        },
      },
      sendMessage: (message) => {
        if (message.qa === "rec-camera-start" || message.qa === "rec-camera-stop") {
          cameraMessages.push(message);
          return Promise.resolve({
            ok: cameraReady,
            error: cameraReady ? undefined : "No live camera frame",
          });
        }
        offscreenMessages.push(message);
        return recorder.send(message);
      },
    },
    storage: {
      session: {
        get: async () => structuredClone(session),
        set: async (values) => {
          for (const [key, value] of Object.entries(values))
            session[key] = structuredClone(value);
        },
        remove: async (keys) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) delete session[key];
        },
      },
      local: { get: async () => ({}) },
    },
    tabs: {
      get: async (id) => ({ id, url: "https://example.com", windowId: 1 }),
      update: async () => ({}),
      create: createTab ?? (async ({ url }) => ({ id: 88, url, windowId: 1 })),
      sendMessage: async (id, message) => {
        messages.push({ id, message });
        if (message.qa === "rec-overlay-ping") {
          if (!connected) throw new Error("Receiving end does not exist");
          return { ok: true };
        }
        if (message.qa === "rec-countdown") {
          sequence.push("countdown");
          return { ok: countdown, cancelled: !countdown };
        }
      },
      onRemoved: {
        addListener: (fn) => {
          onRemoved = fn;
        },
      },
      onUpdated: {
        addListener: (fn) => {
          onUpdated = fn;
        },
      },
    },
    scripting: {
      executeScript: async (options) => {
        if (overlayFailure) throw new Error("Protected page");
        connected = true;
        injections.push(options);
      },
    },
    windows: { update: async () => ({}) },
    tabCapture: {
      getMediaStreamId: async () => {
        sequence.push("capture-id");
        return "test-stream";
      },
    },
    offscreen: {
      hasDocument: async () => recorder.open,
      createDocument: async () => {
        recorder.open = true;
      },
      closeDocument: async () => {
        recorder.open = false;
      },
    },
    debugger: { onEvent: ignore, onDetach: ignore },
  };
  runInNewContext(source("worker"), {
    chrome,
    crypto: webcrypto,
    setTimeout,
    clearTimeout,
    URL,
    Error,
    exports: {},
    require: () => ({
      object: (v) => (v && typeof v === "object" ? v : {}),
      viewerOrigin: (v) => v,
    }),
  });
  const sender = { id: chrome.runtime.id, url: chrome.runtime.getURL("popup.html") };
  return {
    messages,
    injections,
    cameraMessages,
    offscreenMessages,
    raw: (message, sender) =>
      new Promise((resolve) => listener(message, sender, resolve)),
    recorder,
    sequence,
    restart: () =>
      worker({ session, recorder, createTab, countdown, overlayFailure, cameraReady }),
    navigate: () => onUpdated(7, { status: "complete" }),
    closeTab: () => onRemoved(7),
    send: (action, extra = {}, caller = sender) =>
      new Promise((resolve) => {
        listener({ qa: "quick", action, tabId: 7, ...extra }, caller, resolve);
      }),
  };
}

test("recording starts with controls hidden and preserves the choice across pause and navigation", async () => {
  const app = worker();
  assert.equal((await app.send("rec-start")).ok, true);
  assert.equal((await app.send("rec-status")).controlsVisible, false);
  assert.equal(app.messages.at(-1).message.controlsVisible, false);
  assert.equal(
    (await app.send("rec-set-controls", { visible: true })).controlsVisible,
    true
  );
  assert.equal(app.messages.at(-1).message.qa, "rec-overlay-visibility");
  assert.equal(app.messages.at(-1).message.visible, true);
  await app.send("rec-toggle-pause");
  assert.equal((await app.send("rec-status")).controlsVisible, true);
  app.navigate();
  assert.equal(
    app.injections.filter((entry) => entry.files).length,
    2,
    "navigation restores the shortcut listener"
  );
  assert.equal(
    (await app.send("rec-set-controls", { visible: false })).controlsVisible,
    false
  );
});

test("visibility changes require the recording owner or extension popup", async () => {
  const app = worker();
  await app.send("rec-start");
  const result = await app.send(
    "rec-set-controls",
    { visible: true },
    {
      id: "test-extension",
      tab: { id: 99 },
      frameId: 0,
    }
  );
  assert.match(result.error, /not authorized/);
  assert.equal((await app.send("rec-status")).controlsVisible, false);
  assert.match((await app.send("rec-set-controls", { visible: "yes" })).error, /whether/);
});

// Small DOM adapter runs the actual overlay script, including its message/keyboard listeners.
function overlay({ recording = true, controlsVisible = false, bodyStyle = {} } = {}) {
  const nodes = [],
    listeners = new Map();
  let messageListener;
  const sent = [];
  const draws = [];
  const timers = new Map();
  let timerId = 0;
  class Element {
    style = { transform: "", transformOrigin: "", transition: "" };
    dataset = {};
    children = [];
    attributes = {};
    isConnected = true;
    classList = { add() {}, remove() {}, toggle() {} };
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      nodes.push(this);
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    attachShadow() {
      this.shadow = new Element("shadow-root");
      return this.shadow;
    }
    setAttribute(key, value) {
      this.attributes[key] = value;
    }
    addEventListener() {}
    removeEventListener() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1280, height: 720 };
    }
    contains(node) {
      return this === node || this.children.some((child) => child.contains(node));
    }
    getContext() {
      return { drawImage: (...args) => draws.push(args) };
    }
    querySelector() {
      return null;
    }
    remove() {
      this.isConnected = false;
    }
    click() {
      if (!this.disabled) this.onclick?.();
    }
  }
  const document = {
    documentElement: new Element("html"),
    body: new Element("body"),
    createElement: (tag) => new Element(tag),
    getElementById: (id) => nodes.find((n) => n.id === id && n.isConnected) ?? null,
  };
  const window = {
    ramupodUI: {
      icon: (name) => name,
      dismiss() {},
      button(parent, name, icon, action) {
        const b = new Element("button");
        b.setAttribute("aria-label", name);
        b.onclick = action;
        parent.appendChild(b);
        return b;
      },
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener() {},
  };
  Object.assign(document.body.style, bodyStyle);
  const chrome = {
    runtime: {
      onMessage: {
        addListener: (fn) => {
          messageListener = fn;
        },
        removeListener() {},
      },
      async sendMessage(message) {
        sent.push(message);
        if (message.action === "rec-status") return { recording, controlsVisible };
        if (message.action === "rec-set-controls") {
          messageListener({ qa: "rec-overlay-visibility", visible: message.visible });
          return { controlsVisible: message.visible };
        }
        return {
          session: {
            state: "recording",
            startedAt: new Date().toISOString(),
            requests: [],
            attachments: [],
          },
        };
      },
    },
  };
  const overlayContext = {
    window,
    document,
    chrome,
    Element,
    setInterval: (fn, delay) => {
      const id = ++timerId;
      timers.set(id, { fn, delay, interval: true });
      return id;
    },
    clearInterval: (id) => timers.delete(id),
    setTimeout: (fn, delay) => {
      const id = ++timerId;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    getComputedStyle: (element) => ({ transform: element.style.transform || "none" }),
    navigator: {
      mediaDevices: {
        getUserMedia: () => {
          throw new Error("Content scripts must not request camera permission");
        },
      },
    },
    Blob,
    Uint8Array,
    atob,
    createImageBitmap: async () => ({ close() {} }),
    requestAnimationFrame: (fn) => {
      fn();
      return 1;
    },
  };
  runInNewContext(source("overlay"), overlayContext);
  return {
    document,
    sent,
    draws,
    reinject: (stale = false) => {
      if (stale) window.ramupodOverlayReady = false;
      runInNewContext(source("overlay"), overlayContext);
    },
    message: (m) => messageListener(m),
    request: (m) => new Promise((resolve) => messageListener(m, {}, resolve)),
    countdownTick: () => {
      for (const timer of [...timers.values()])
        if (timer.interval && timer.delay === 1000) timer.fn();
    },
    clickPage: (clientX, clientY) =>
      listeners.get("click")({
        target: document.body,
        clientX,
        clientY,
        preventDefault() {},
        stopPropagation() {},
      }),
    finishZoomReturn: () => {
      for (const [id, timer] of [...timers])
        if (timer.delay >= 380 && timer.delay < 1000) {
          timers.delete(id);
          timer.fn();
        }
    },
    key: (code) =>
      listeners.get("keydown")({
        code,
        key: code === "Escape" ? "Escape" : code.slice(-1).toLowerCase(),
        altKey: true,
        shiftKey: true,
        target: new Element("input"),
        preventDefault() {},
      }),
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("overlay never paints at startup; hide/restore shortcuts work even with an input focused", async () => {
  const app = overlay();
  const host = app.document.getElementById("ramupod-qa-controls");
  assert.match(
    host.style.cssText,
    /visibility:hidden/,
    "hidden before the first async response"
  );
  await settle();
  assert.equal(host.style.visibility, "hidden");
  app.key("KeyH");
  await settle();
  assert.equal(host.style.visibility, "visible");
  app.key("KeyH");
  await settle();
  assert.equal(
    host.style.visibility,
    "hidden",
    "one press fully hides instead of minimizing"
  );
  app.key("KeyS");
  await settle();
  assert.ok(
    app.sent.some((m) => m.action === "rec-stop"),
    "Finish remains reachable while hidden"
  );
});

test("QA testing controls still appear after initialization", async () => {
  const app = overlay({ recording: false });
  await settle();
  assert.equal(
    app.document.getElementById("ramupod-qa-controls").style.visibility,
    "visible"
  );
});

function offscreen({
  deviceFailure,
  interruptCameraOnCapture = false,
  useProcessor = false,
  holdDelivery = false,
} = {}) {
  let listener;
  const instances = [],
    frames = [],
    intervals = new Map();
  let intervalId = 0;
  const deviceStreams = [],
    cameraVideos = [];
  const processors = [],
    decodedFrames = [];
  let clock = Date.now();
  class Processor {
    constructor({ track }) {
      this.track = track;
      processors.push(this);
      this.readable = {
        getReader: () => ({
          read: () =>
            new Promise((resolve) => {
              this.pending = resolve;
            }),
          cancel: async () => {
            this.pending?.({ done: true });
            this.cancelled = true;
          },
          releaseLock() {},
        }),
      };
    }
    frame() {
      const frame = {
        displayWidth: 640,
        displayHeight: 480,
        closed: false,
        close() {
          this.closed = true;
        },
      };
      decodedFrames.push(frame);
      this.pending?.({ value: frame, done: false });
    }
  }
  class Track {
    readyState = "live";
    listeners = new Map();
    constructor(kind = "video") {
      this.kind = kind;
    }
    stop() {
      this.readyState = "ended";
    }
    addEventListener(name, fn) {
      this.listeners.set(name, fn);
    }
    end() {
      this.readyState = "ended";
      this.listeners.get("ended")?.();
    }
  }
  class Stream {
    constructor(tracks = [new Track()]) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
    getVideoTracks() {
      return this.tracks.filter((t) => t.kind === "video");
    }
    getAudioTracks() {
      return this.tracks.filter((t) => t.kind === "audio");
    }
  }
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    mimeType = "video/webm";
    constructor(stream) {
      this.stream = stream;
      instances.push(this);
    }
    start() {
      this.state = "recording";
    }
    pause() {
      this.state = "paused";
    }
    resume() {
      this.state = "recording";
    }
    stop() {
      if (this.state === "inactive") throw new Error("Already stopped");
      this.state = "inactive";
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(["last-frame"]) });
        this.onstop?.();
      });
    }
  }
  const backend = {
    open: true,
    instances,
    frames,
    deviceStreams,
    cameraVideos,
    processors,
    decodedFrames,
    advance: (ms) => {
      clock += ms;
    },
    frame: () => processors.at(-1).frame(),
    cameraTick: () => {
      for (const fn of intervals.values()) fn();
    },
    send: (message) => new Promise((resolve) => listener(message, {}, resolve)),
  };
  runInNewContext(source("offscreen"), {
    chrome: {
      runtime: {
        sendMessage: async (message) => {
          frames.push(message);
          if (holdDelivery) return new Promise(() => {});
          return { ok: true };
        },
        onMessage: {
          addListener: (fn) => {
            listener = fn;
          },
        },
      },
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          const device =
            !!constraints.audio?.echoCancellation || !!constraints.video?.width;
          if (device && deviceFailure) throw deviceFailure;
          if (!device && interruptCameraOnCapture)
            deviceStreams[0]?.getVideoTracks().forEach((track) => track.end());
          const stream = new Stream([
            ...(constraints.video ? [new Track("video")] : []),
            ...(constraints.audio ? [new Track("audio")] : []),
          ]);
          if (device) deviceStreams.push(stream);
          return stream;
        },
      },
    },
    document: {
      body: {
        appendChild(video) {
          cameraVideos.push(video);
        },
      },
      createElement: (tag) =>
        tag === "video"
          ? {
              style: {},
              videoWidth: 640,
              videoHeight: 480,
              play: async () => {},
              remove() {},
            }
          : {
              getContext: () => ({ setTransform() {}, drawImage() {} }),
              toDataURL: () => "data:image/jpeg;base64,AA==",
            },
    },
    AudioContext: class {
      createMediaStreamDestination() {
        return { stream: new Stream([new Track("audio")]) };
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      async resume() {}
      async close() {}
    },
    setInterval: (fn) => {
      const id = ++intervalId;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    MediaRecorder: Recorder,
    MediaStream: Stream,
    ...(useProcessor ? { MediaStreamTrackProcessor: Processor } : {}),
    Date: class extends Date {
      static now() {
        return clock;
      }
    },
    Blob,
    Uint8Array,
    setTimeout,
    clearTimeout,
    require: () => ({ deviceError }),
    exports: {},
  });
  return backend;
}

test("service worker restart during drawing/zoom does not lose the offscreen recording or delivery", async () => {
  let app = worker();
  await app.send("rec-start");
  app.recorder.instances[0].ondataavailable({
    data: new Blob(["drawing-and-zoom-frames"]),
  });
  await app.send("rec-set-controls", { visible: true });
  app = app.restart(); // Discard every global in the service worker, keeping only Chrome session storage and offscreen media.
  const status = await app.send("rec-status");
  assert.equal(status.recording, true);
  assert.equal(status.controlsVisible, true);
  await app.send("rec-toggle-pause");
  app = app.restart();
  assert.equal((await app.send("rec-status")).state, "paused");
  await app.send("rec-toggle-pause");
  const finished = await app.send("rec-stop");
  assert.equal(finished.ok, true);
  assert.equal(
    app.recorder.open,
    true,
    "offscreen bytes stay available until the viewer accepts them"
  );
  app = app.restart();
  const recipient = {
    id: "test-extension",
    frameId: 0,
    tab: {
      id: 88,
      url: `https://ramupod.com/tools/screen-recorder#companion-recording=${finished.nonce}`,
    },
  };
  const metadata = await app.send("rec-handoff", { nonce: finished.nonce }, recipient);
  assert.ok(metadata.byteLength > 0);
  assert.match(
    (
      await app.send(
        "rec-read",
        { nonce: finished.nonce, offset: 0 },
        {
          ...recipient,
          tab: { ...recipient.tab, id: 99 },
        }
      )
    ).error,
    /expired or not found/
  );
  const result = await app.send(
    "rec-read",
    { nonce: finished.nonce, offset: 0 },
    recipient
  );
  assert.equal(
    new TextDecoder().decode(new Uint8Array(result.buffer)),
    "drawing-and-zoom-frameslast-frame"
  );
  assert.equal(
    (await app.send("rec-ack", { nonce: finished.nonce }, recipient)).ok,
    true
  );
  assert.equal(app.recorder.open, false);
  assert.equal((await app.send("rec-status")).recording, false);
});

test("failed viewer opening keeps the finalized video available for Finish retry", async () => {
  let fail = true;
  const app = worker({
    createTab: async ({ url }) => {
      if (fail) throw new Error("Could not open viewer");
      return { id: 88, url, windowId: 1 };
    },
  });
  await app.send("rec-start");
  assert.match((await app.send("rec-stop")).error, /Could not open viewer/);
  assert.equal((await app.send("rec-status")).state, "stopped");
  fail = false;
  assert.equal((await app.send("rec-stop")).ok, true);
});

test("closing the captured tab retains its finalized video instead of discarding it", async () => {
  const app = worker();
  await app.send("rec-start");
  app.closeTab();
  await settle();
  assert.equal((await app.send("rec-status")).state, "stopped");
  assert.equal(app.recorder.open, true);
  assert.equal((await app.restart().send("rec-stop")).ok, true);
});

test("offscreen finalization recovers an already stopped recorder, retains final chunks, and is retryable", async () => {
  const app = offscreen();
  await app.send({
    type: "REC_OFFSCREEN_START",
    streamId: "stream",
    sessionId: "session",
  });
  app.instances[0].ondataavailable({ data: new Blob(["first-"]) });
  app.instances[0].stop(); // Browser interruption rather than the extension Finish button.
  await settle();
  const metadata = await app.send({ type: "REC_OFFSCREEN_STOP", includeBuffer: false });
  assert.equal(metadata.ok, true);
  assert.equal(metadata.buffer, undefined);
  await app.send({ type: "REC_OFFSCREEN_STOP" });
  const first = await app.send({ type: "REC_OFFSCREEN_READ", offset: 0 });
  const retry = await app.send({ type: "REC_OFFSCREEN_READ", offset: 0 });
  assert.equal(
    new TextDecoder().decode(new Uint8Array(first.buffer)),
    "first-last-frame"
  );
  assert.deepEqual(first.buffer, retry.buffer);
  assert.equal((await app.send({ type: "REC_OFFSCREEN_STATUS" })).hasRecording, true);
  await app.send({ type: "REC_OFFSCREEN_CANCEL" });
  assert.equal((await app.send({ type: "REC_OFFSCREEN_STATUS" })).hasRecording, false);
});

test("repeated Start retries cannot erase an existing offscreen session", async () => {
  const app = offscreen();
  await app.send({
    type: "REC_OFFSCREEN_START",
    streamId: "stream",
    sessionId: "session",
  });
  app.instances[0].ondataavailable({ data: new Blob(["keep-"]) });
  assert.equal(
    (
      await app.send({
        type: "REC_OFFSCREEN_START",
        streamId: "stream",
        sessionId: "session",
      })
    ).ok,
    true
  );
  assert.equal(
    (
      await app.send({
        type: "REC_OFFSCREEN_START",
        streamId: "other",
        sessionId: "other",
      })
    ).ok,
    false
  );
  await app.send({ type: "REC_OFFSCREEN_STOP" });
  const result = await app.send({ type: "REC_OFFSCREEN_READ", offset: 0 });
  assert.equal(
    new TextDecoder().decode(new Uint8Array(result.buffer)),
    "keep-last-frame"
  );
});

test("large videos are read in bounded chunks instead of one Chrome runtime message", async () => {
  const app = offscreen();
  await app.send({
    type: "REC_OFFSCREEN_START",
    streamId: "stream",
    sessionId: "session",
  });
  const frames = new Uint8Array(600000).fill(42);
  app.instances[0].ondataavailable({ data: new Blob([frames]) });
  const metadata = await app.send({ type: "REC_OFFSCREEN_STOP" });
  assert.equal(metadata.buffer, undefined);
  assert.ok(metadata.byteLength > frames.length);
  let received = 0,
    calls = 0;
  while (received < metadata.byteLength) {
    const chunk = await app.send({ type: "REC_OFFSCREEN_READ", offset: received });
    assert.equal(chunk.offset, received);
    assert.ok(chunk.buffer.length <= 256 * 1024);
    received += chunk.buffer.length;
    calls++;
  }
  assert.equal(received, metadata.byteLength);
  assert.equal(calls, 3);
  assert.equal((await app.send({ type: "REC_OFFSCREEN_READ", offset: -1 })).ok, false);
});

test("content bridge assembles chunks exactly and only acknowledges after viewer acceptance", async () => {
  const bytes = Uint8Array.from({ length: 600000 }, (_, i) => i % 251);
  const messages = [],
    calls = [];
  let listener;
  const nonce = "11111111-1111-4111-8111-111111111111";
  const window = {
    addEventListener: (_, fn) => {
      listener = fn;
    },
    removeEventListener() {},
    postMessage: (message) => messages.push(message),
  };
  const location = {
    origin: "https://ramupod.com",
    pathname: "/tools/screen-recorder",
    hash: `#companion-recording=${nonce}`,
  };
  runInNewContext(source("bridge"), {
    window,
    location,
    URLSearchParams,
    Uint8Array,
    exports: {},
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 1,
    chrome: {
      runtime: {
        async sendMessage(message) {
          calls.push(message);
          if (message.action === "rec-handoff")
            return {
              byteLength: bytes.length,
              mimeType: "video/webm",
              extension: "webm",
              duration: 83000,
            };
          if (message.action === "rec-read")
            return {
              offset: message.offset,
              buffer: Array.from(
                bytes.subarray(message.offset, message.offset + 256 * 1024)
              ),
            };
          return { ok: true };
        },
      },
    },
  });
  listener({
    source: window,
    origin: location.origin,
    data: { type: "ramupod-recorder-ready", nonce },
  });
  await settle();
  const video = messages.find((m) => m.type === "ramupod-recorder-package");
  assert.deepEqual(video.blobData, bytes);
  assert.equal(calls.filter((m) => m.action === "rec-read").length, 3);
  assert.ok(!calls.some((m) => m.action === "rec-ack"));
  listener({
    source: window,
    origin: location.origin,
    data: { type: "ramupod-recorder-accepted", nonce },
  });
  assert.ok(calls.some((m) => m.action === "rec-ack"));
});

test("zoom-out retains its focus point until the return animation ends and restores page styles", async () => {
  const original = {
    transform: "",
    transformOrigin: "25% 40%",
    transition: "opacity 1s linear",
  };
  const app = overlay({ bodyStyle: original });
  await settle();
  app.key("KeyZ");
  app.clickPage(150, 220);
  const body = app.document.body;
  assert.equal(body.style.transformOrigin, "150px 220px");
  app.key("KeyZ");
  assert.equal(
    body.style.transformOrigin,
    "150px 220px",
    "resetting origin before scale reaches one causes the reported jump"
  );
  assert.equal(body.style.transform, "scale(1)");
  assert.match(body.style.transition, /380ms cubic-bezier/);
  app.finishZoomReturn();
  assert.equal(body.style.transformOrigin, original.transformOrigin);
  assert.equal(body.style.transform, original.transform);
  assert.equal(body.style.transition, original.transition);
});

test("rapid zoom reentry waits for zoom-out without changing its origin; teardown cancels pending cleanup", async () => {
  const app = overlay();
  await settle();
  app.key("KeyZ");
  app.clickPage(150, 220);
  app.key("KeyZ"); // Return to normal size.
  app.key("KeyZ");
  app.clickPage(400, 300); // Queue a new focus during that return.
  assert.equal(app.document.body.style.transformOrigin, "150px 220px");
  app.finishZoomReturn();
  assert.equal(app.document.body.style.transformOrigin, "400px 300px");
  assert.match(app.document.body.style.transform, /scale\(1.75\)/);
  app.message({ qa: "rec-overlay-remove" });
  assert.equal(app.document.body.style.transform, "");
  assert.equal(app.document.body.style.transformOrigin, "");
  app.finishZoomReturn();
  assert.equal(
    app.document.body.style.transform,
    "",
    "a late cleanup must not reactivate zoom after Finish"
  );
});

test("capture starts only after countdown, and cancellation never starts a media recorder", async () => {
  const app = worker();
  assert.equal((await app.send("rec-start")).ok, true);
  assert.deepEqual(app.sequence, ["countdown", "capture-id"]);
  const cancelled = worker({ countdown: false });
  assert.match((await cancelled.send("rec-start")).error, /cancelled before/);
  assert.equal(cancelled.recorder.instances.length, 0);
  assert.equal((await cancelled.send("rec-status")).recording, false);
  const protectedPage = worker({ overlayFailure: true });
  assert.match(
    (await protectedPage.send("rec-start")).error,
    /attach recording controls/
  );
  assert.equal(protectedPage.recorder.instances.length, 0);
});

test("selected microphone/camera denial blocks recording instead of silently ignoring the selection", async () => {
  const denied = Object.assign(new Error("Permission denied"), {
    name: "NotAllowedError",
  });
  const recorder = offscreen({ deviceFailure: denied });
  const app = worker({ recorder });
  const result = await app.send("rec-start", { withMic: true, withCamera: false });
  assert.match(result.error, /access is blocked/);
  assert.equal(recorder.instances.length, 0);
  assert.equal((await app.send("rec-status")).recording, false);
});

test("camera setup retains ownership while offscreen captures only the tab and microphone", async () => {
  let setupUrl;
  let app = worker({
    createTab: async ({ url }) => {
      setupUrl = url;
      return { id: 88, url };
    },
  });
  await app.send("rec-open-setup", { withCamera: true, withMic: true });
  const nonce = new URLSearchParams(new URL(setupUrl).hash.slice(1)).get("request");
  const cameraSender = {
    id: "test-extension",
    tab: { id: 88 },
    url: setupUrl,
    frameId: 0,
  };
  assert.equal((await app.send("rec-setup-start", { nonce }, cameraSender)).ok, true);
  const cameraStart = app.cameraMessages.find((m) => m.qa === "rec-camera-start");
  assert.ok(cameraStart.sessionId);
  const media = app.offscreenMessages.filter((m) => /PREPARE_DEVICES|START/.test(m.type));
  assert.ok(media.length >= 2);
  assert.ok(
    media.every((m) => m.withCamera === false),
    "tab capture never opens or reopens a camera"
  );
  assert.ok(media.every((m) => m.withMic === true));
  const frame = {
    type: "REC_CAMERA_FRAME",
    nonce,
    sessionId: cameraStart.sessionId,
    image: "data:image/jpeg;base64,AA==",
  };
  assert.equal((await app.raw(frame, cameraSender)).ok, true);
  assert.equal((await app.raw(frame, { ...cameraSender, tab: { id: 99 } })).ok, false);
  assert.equal((await app.raw({ ...frame, nonce: "wrong" }, cameraSender)).ok, false);
  app = app.restart();
  assert.equal(
    (await app.raw(frame, cameraSender)).ok,
    true,
    "worker restart keeps the same camera owner"
  );
  app.recorder.instances[0].stop();
  await settle();
  await app.raw(
    { type: "REC_CAPTURE_STOPPED", sessionId: frame.sessionId },
    {
      id: "test-extension",
      url: "chrome-extension://test-extension/offscreen.html",
    }
  );
  assert.equal((await app.send("rec-status")).state, "stopped");
  assert.ok(
    app.cameraMessages.some((m) => m.qa === "rec-camera-stop"),
    "native capture stop releases the camera owner"
  );
  await app.send("rec-stop");
  assert.ok(
    app.cameraMessages.some(
      (m) => m.qa === "rec-camera-stop" && m.sessionId === frame.sessionId
    )
  );
  assert.equal(
    (await app.raw(frame, cameraSender)).ok,
    false,
    "finished sessions no longer accept frames"
  );
});

test("a camera that cannot deliver its first frame blocks capture before countdown", async () => {
  let setupUrl;
  const app = worker({
    cameraReady: false,
    createTab: async ({ url }) => {
      setupUrl = url;
      return { id: 88, url };
    },
  });
  await app.send("rec-open-setup", { withCamera: true });
  const nonce = new URLSearchParams(new URL(setupUrl).hash.slice(1)).get("request");
  const result = await app.send(
    "rec-setup-start",
    { nonce },
    { id: "test-extension", tab: { id: 88 }, url: setupUrl }
  );
  assert.match(result.error, /No live camera frame/);
  assert.equal(app.recorder.instances.length, 0);
  assert.equal(app.sequence.length, 0);
  assert.equal(
    app.cameraMessages.at(-1).close,
    false,
    "keep setup visible so the error can be corrected"
  );
});

test("extension-owned devices feed microphone audio and camera frames through preparation and recording", async () => {
  const app = offscreen();
  const prepared = await app.send({
    type: "REC_OFFSCREEN_PREPARE_DEVICES",
    sessionId: "devices",
    withMic: true,
    withCamera: true,
  });
  assert.equal(prepared.ok, true);
  app.cameraTick();
  await settle();
  assert.equal(app.frames[0].type, "REC_CAMERA_FRAME");
  assert.equal(app.frames[0].sessionId, "devices");
  assert.match(app.frames[0].image, /^data:image\/jpeg;base64,/);
  assert.equal(
    (
      await app.send({
        type: "REC_OFFSCREEN_START",
        streamId: "tab",
        sessionId: "devices",
        withMic: true,
        withCamera: true,
      })
    ).ok,
    true
  );
  assert.equal(app.instances[0].stream.getAudioTracks().length, 1);
  await app.send({ type: "REC_OFFSCREEN_CANCEL" });
  const before = app.frames.length;
  app.cameraTick();
  await settle();
  assert.equal(app.frames.length, before, "camera is released when recording ends");
});

test("camera interruption when tab capture starts recovers video without stopping narration or recording", async () => {
  const app = offscreen({ interruptCameraOnCapture: true });
  const options = { sessionId: "camera-recovery", withMic: true, withCamera: true };
  await app.send({ type: "REC_OFFSCREEN_PREPARE_DEVICES", ...options });
  const microphone = app.deviceStreams[0].getAudioTracks()[0];
  assert.equal(
    (await app.send({ type: "REC_OFFSCREEN_START", streamId: "tab", ...options })).ok,
    true
  );
  assert.equal(app.deviceStreams.length, 2, "only the interrupted camera is reopened");
  assert.equal(app.deviceStreams[1].getAudioTracks().length, 0);
  assert.equal(microphone.readyState, "live", "camera recovery preserves narration");
  assert.equal(app.instances[0].state, "recording");
  assert.equal(app.cameraVideos.at(-1).srcObject.getVideoTracks()[0].readyState, "live");
  app.cameraTick();
  await settle();
  assert.equal(app.frames.at(-1).sessionId, options.sessionId);
  app.deviceStreams[1].getVideoTracks()[0].end();
  await settle();
  assert.equal(
    app.deviceStreams.length,
    3,
    "an interruption during recording is also recovered"
  );
  assert.equal(app.instances[0].state, "recording");
  await app.send({ type: "REC_OFFSCREEN_CANCEL" });
  for (const stream of app.deviceStreams)
    assert.ok(stream.getTracks().every((track) => track.readyState === "ended"));
  const count = app.deviceStreams.length;
  app.cameraTick();
  await settle();
  assert.equal(
    app.deviceStreams.length,
    count,
    "cancellation must never restart the camera"
  );
});

test("camera reads native frames throughout recording without a hidden video player or blocked message freezing it", async () => {
  const app = offscreen({ useProcessor: true, holdDelivery: true });
  const options = { sessionId: "native-camera", withCamera: true };
  await app.send({ type: "REC_OFFSCREEN_PREPARE_DEVICES", ...options });
  app.frame();
  await settle();
  assert.equal(app.frames.length, 1);
  await app.send({ type: "REC_OFFSCREEN_START", streamId: "tab", ...options });
  for (let i = 0; i < 12; i++) {
    app.advance(600);
    app.frame();
    await settle();
    app.cameraTick();
  }
  const status = await app.send({ type: "REC_OFFSCREEN_STATUS" });
  assert.equal(status.camera.source, "track");
  assert.equal(status.camera.framesReceived, 13);
  assert.equal(
    status.camera.framesSent,
    13,
    "a missing reply does not lock frame delivery"
  );
  assert.equal(
    status.camera.recoveries,
    0,
    "healthy frame progress does not reopen the camera"
  );
  assert.equal(status.state, "recording");
  assert.equal(
    app.cameraVideos.length,
    0,
    "camera processing never needs video playback"
  );
  assert.ok(
    app.decodedFrames.every((frame) => frame.closed),
    "every native frame is released"
  );
  await app.send({ type: "REC_OFFSCREEN_CANCEL" });
  await settle();
  assert.equal(app.processors[0].cancelled, true);
});

test("camera watchdog recovers a stalled live track and cancels the old reader", async () => {
  const app = offscreen({ useProcessor: true });
  await app.send({
    type: "REC_OFFSCREEN_START",
    streamId: "tab",
    sessionId: "stalled",
    withCamera: true,
  });
  app.frame();
  await settle();
  app.advance(5000);
  app.cameraTick();
  await settle();
  assert.equal(app.processors.length, 2);
  assert.equal(app.processors[0].cancelled, true);
  app.frame();
  await settle();
  assert.equal((await app.send({ type: "REC_OFFSCREEN_STATUS" })).state, "recording");
  await app.send({ type: "REC_OFFSCREEN_CANCEL" });
});

test("countdown shows 3–2–1, removes itself before replying, and keeps the dock hidden", async () => {
  const app = overlay();
  await settle();
  const finished = app.request({ qa: "rec-countdown", sessionId: "countdown" });
  const host = app.document.getElementById("ramupod-rec-countdown");
  const center = host.shadow.children.find((n) => n.className === "center");
  const number = center.children.find((n) => n.className === "number");
  assert.equal(number.textContent, "3");
  app.countdownTick();
  assert.equal(number.textContent, "2");
  app.countdownTick();
  assert.equal(number.textContent, "1");
  app.countdownTick();
  assert.equal((await finished).ok, true);
  assert.equal(app.document.getElementById("ramupod-rec-countdown"), null);
  assert.equal(
    app.document.getElementById("ramupod-qa-controls").style.visibility,
    "hidden"
  );
});

test("Escape cancels countdown and a reloaded extension replaces orphaned controls", async () => {
  const app = overlay();
  await settle();
  const finished = app.request({ qa: "rec-countdown" });
  app.key("Escape");
  assert.equal((await finished).cancelled, true);
  const oldHost = app.document.getElementById("ramupod-qa-controls");
  app.reinject(true);
  await settle();
  assert.equal(oldHost.isConnected, false);
  assert.notEqual(app.document.getElementById("ramupod-qa-controls"), oldHost);
  assert.equal((await app.request({ qa: "rec-overlay-ping" })).ok, true);
});

test("camera bubble paints extension frames without requesting camera access from the captured page", async () => {
  const app = overlay();
  await settle();
  app.message({
    qa: "rec-overlay-init",
    sessionId: "camera",
    withCamera: true,
    controlsVisible: false,
  });
  app.message({
    qa: "rec-camera-frame",
    sessionId: "camera",
    image: "data:image/jpeg;base64,AA==",
  });
  await settle();
  assert.equal(app.draws.length, 1);
  assert.equal(app.document.getElementById("ramupod-camera-bubble").isConnected, true);
  assert.equal(
    app.document.getElementById("ramupod-qa-controls").style.visibility,
    "hidden"
  );
});

test("device preparation page retains its request across worker restart and rejects another page", async () => {
  let url;
  let app = worker({
    createTab: async (options) => {
      url = options.url;
      return { id: 88, url, windowId: 1 };
    },
  });
  assert.equal(
    (await app.send("rec-open-setup", { withMic: true, withCamera: true })).ok,
    true
  );
  const nonce = new URLSearchParams(new URL(url).hash.slice(1)).get("request");
  app = app.restart();
  const sender = { id: "test-extension", url, tab: { id: 88 }, frameId: 0 };
  const options = await app.send("rec-setup-info", { nonce }, sender);
  assert.equal(options.withMic, true);
  assert.equal(options.withCamera, true);
  assert.match(
    (await app.send("rec-setup-info", { nonce }, { ...sender, tab: { id: 99 } })).error,
    /expired/
  );
});
