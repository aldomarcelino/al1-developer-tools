import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { deviceError } from "../extensions/qa-capture/src/device-errors.ts";
const compile = (name) =>
  ts.transpileModule(
    readFileSync(
      new URL(`../extensions/qa-capture/src/${name}.ts`, import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }
  ).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("device setup keeps the original camera track open through Start and releases it only on Finish", async () => {
  const nodes = new Map();
  const element = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        hidden: false,
        dataset: {},
        textContent: "",
        removeAttribute() {},
        play: async () => {},
      });
    return nodes.get(id);
  };
  const track = (kind) => ({
    kind,
    readyState: "live",
    stop() {
      this.readyState = "ended";
    },
  });
  const videoTrack = track("video"),
    audioTrack = track("audio");
  const stream = {
    getTracks: () => [videoTrack, audioTrack],
    getVideoTracks: () => [videoTrack],
    getAudioTracks: () => [audioTrack],
  };
  let listener,
    acquisitions = 0,
    closed = 0,
    source,
    cameraStopped = false;
  const runtime = {
    id: "extension",
    onMessage: {
      addListener(fn) {
        listener = fn;
      },
    },
    async sendMessage(message) {
      if (message.action === "rec-setup-info") return { withCamera: true, withMic: true };
      if (message.action === "rec-setup-start") {
        assert.equal(
          videoTrack.readyState,
          "live",
          "Start must not close the preview camera"
        );
        assert.equal(
          audioTrack.readyState,
          "ended",
          "only narration transfers to offscreen"
        );
        return new Promise((resolve) =>
          listener(
            { qa: "rec-camera-start", nonce: "owner", sessionId: "recording" },
            { id: "extension" },
            resolve
          )
        );
      }
      return { ok: true };
    },
  };
  runInNewContext(compile("setup"), {
    exports: {},
    require: (name) =>
      name.includes("device-errors")
        ? { deviceError }
        : {
            startCameraSource: (value) => {
              source = value;
              return {
                ready: Promise.resolve(),
                stop() {
                  cameraStopped = true;
                },
              };
            },
          },
    chrome: { runtime },
    location: { hash: "#request=owner" },
    URLSearchParams,
    Error,
    document: { getElementById: element, querySelector: element },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => {
          acquisitions++;
          return stream;
        },
      },
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    AudioContext: class {
      createAnalyser() {
        return {
          fftSize: 0,
          frequencyBinCount: 1,
          getByteTimeDomainData(bytes) {
            bytes.fill(128);
          },
        };
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      async resume() {}
      async close() {}
    },
    window: {
      addEventListener() {},
      close() {
        closed++;
      },
    },
    Uint8Array,
  });
  await settle();
  await element("allow-devices").onclick();
  await element("start-countdown").onclick();
  assert.equal(
    acquisitions,
    1,
    "camera is acquired exactly once for preview and recording"
  );
  assert.equal(source, stream, "the frame pump receives the same preview stream");
  assert.equal(videoTrack.readyState, "live");
  assert.equal(closed, 0, "the camera owner tab survives recording start");
  assert.equal(element("start-countdown").textContent, "Finish recording");
  listener(
    { qa: "rec-camera-stop", sessionId: "recording", close: true },
    { id: "extension" },
    () => {}
  );
  assert.equal(cameraStopped, true);
  assert.equal(videoTrack.readyState, "ended");
  assert.equal(closed, 1);
});

test("camera source releases every frame, waits for delivery, and never reopens the physical device", async () => {
  let pending,
    time = Date.now(),
    cancelled = false;
  let cameraEnded;
  const track = {
    readyState: "live",
    addEventListener(_name, fn) {
      cameraEnded = fn;
    },
  };
  const reader = {
    read: () =>
      new Promise((resolve) => {
        pending = resolve;
      }),
    cancel: async () => {
      cancelled = true;
      pending?.({ done: true });
    },
    releaseLock() {},
  };
  let start;
  runInNewContext(compile("camera-source"), {
    exports: new Proxy(
      {},
      {
        set(target, name, value) {
          if (name === "startCameraSource") start = value;
          target[name] = value;
          return true;
        },
      }
    ),
    MediaStreamTrackProcessor: class {
      readable = { getReader: () => reader };
    },
    document: {
      createElement: () => ({
        getContext: () => ({ setTransform() {}, drawImage() {} }),
        toDataURL: () => "data:image/jpeg;base64,AA==",
      }),
    },
    Date: class extends Date {
      static now() {
        return time;
      }
    },
    setTimeout,
    clearTimeout,
    Error,
  });
  let sent = 0;
  const errors = [];
  const pump = start(
    { getVideoTracks: () => [track] },
    async () => {
      sent++;
    },
    (message) => errors.push(message)
  );
  const frames = [];
  for (let i = 0; i < 20; i++) {
    time += 100;
    const frame = {
      displayWidth: 640,
      displayHeight: 480,
      closed: false,
      close() {
        this.closed = true;
      },
    };
    frames.push(frame);
    pending({ value: frame, done: false });
    await settle();
  }
  await pump.ready;
  assert.equal(sent, 20);
  assert.ok(frames.every((frame) => frame.closed));
  assert.equal(errors.length, 0);
  cameraEnded();
  cameraEnded();
  await settle();
  assert.equal(
    errors.length,
    1,
    "a disconnected source reports once and stops its reader"
  );
  pump.stop();
  await settle();
  assert.equal(cancelled, true);
});
