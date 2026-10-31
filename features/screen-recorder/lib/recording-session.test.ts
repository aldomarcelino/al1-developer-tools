import test from "node:test";
import assert from "node:assert/strict";
import { RecordingSession, RecordingUrl } from "./recording-session.ts";
class FakeRecorder {
  state: RecordingState = "inactive";
  mimeType = "video/webm;codecs=vp8";
  stops = 0;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  start() {
    this.state = "recording";
    this.onstart?.();
  }
  pause() {
    this.state = "paused";
    this.onpause?.();
  }
  resume() {
    this.state = "recording";
    this.onresume?.();
  }
  stop() {
    this.stops++;
    this.state = "inactive";
  }
  data(text: string) {
    this.ondataavailable?.({ data: new Blob([text], { type: this.mimeType }) });
  }
  end() {
    this.onstop?.();
  }
}
function fixture() {
  let now = 0,
    cleanups = 0;
  const recorder = new FakeRecorder(),
    states: string[] = [],
    errors: string[] = [],
    results: Blob[] = [];
  const session = new RecordingSession(
    recorder as unknown as MediaRecorder,
    {
      status: (s) => states.push(s),
      error: (e) => errors.push(e),
      result: (r) => results.push(r.blob),
      cleanup: () => cleanups++,
    },
    () => now
  );
  return {
    recorder,
    session,
    states,
    errors,
    results,
    setTime: (t: number) => {
      now = t;
    },
    cleanupCount: () => cleanups,
  };
}
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));
test("stop waits for final dataavailable before publishing a non-empty recording", async () => {
  const f = fixture();
  f.session.start();
  f.recorder.data("first");
  f.setTime(5100);
  f.session.stop();
  f.session.stop();
  assert.equal(f.recorder.stops, 1);
  assert.equal(f.results.length, 0);
  assert.equal(f.cleanupCount(), 0);
  f.recorder.data("last");
  f.recorder.end();
  await flush();
  assert.equal(await f.results[0].text(), "firstlast");
  assert.equal(f.session.duration, 5100);
  assert.equal(f.cleanupCount(), 1);
  assert.deepEqual(f.states, ["recording", "stopping", "processing", "completed"]);
});
test("pause excludes paused time and native stop finalizes a paused session", async () => {
  const f = fixture();
  f.session.start();
  f.setTime(2000);
  f.session.pause();
  f.setTime(9000);
  assert.equal(f.session.duration, 2000);
  f.session.resume();
  f.setTime(12000);
  f.session.pause();
  f.recorder.data("frame");
  f.recorder.end();
  await flush();
  assert.equal(f.session.duration, 5000);
  assert.ok(f.states.includes("paused"));
  assert.equal(f.results.length, 1);
});
test("inactive recorder errors wait for browser's queued final chunk and stop event", async () => {
  const f = fixture();
  f.session.start();
  f.recorder.state = "inactive";
  f.recorder.onerror?.();
  assert.equal(f.cleanupCount(), 0);
  f.recorder.data("recoverable");
  f.recorder.end();
  await flush();
  assert.equal(f.results.length, 1);
  assert.equal(f.cleanupCount(), 1);
  assert.equal(f.errors.length, 1);
});
test("empty recordings fail clearly; duplicate stop events do not publish twice", async () => {
  const f = fixture();
  f.session.start();
  f.session.stop();
  f.recorder.end();
  f.recorder.end();
  await flush();
  assert.equal(f.results.length, 0);
  assert.match(f.errors[0], /No video data/);
  assert.equal(f.cleanupCount(), 1);
});
test("disposing a session rejects late callbacks and does not pollute a new session", async () => {
  const old = fixture();
  old.session.start();
  const staleStop = old.recorder.onstop,
    staleData = old.recorder.ondataavailable;
  old.session.dispose();
  const fresh = fixture();
  fresh.session.start();
  fresh.recorder.data("new");
  staleData?.({ data: new Blob(["old"]) });
  staleStop?.();
  fresh.session.stop();
  fresh.recorder.data("final");
  fresh.recorder.end();
  await flush();
  assert.equal(old.results.length, 0);
  assert.equal(await fresh.results[0].text(), "newfinal");
  assert.equal(old.cleanupCount(), 1);
});
test("actual MP4 type is retained and byte limits request only one stop", async () => {
  const f = fixture();
  f.recorder.mimeType = "video/mp4";
  f.session.start();
  f.recorder.data("mp4");
  f.session.stop();
  f.recorder.end();
  await flush();
  assert.equal(f.results[0].type, "video/mp4");
  const recorder = new FakeRecorder();
  let result: Blob | undefined;
  const s = new RecordingSession(
    recorder as unknown as MediaRecorder,
    {
      status: () => {},
      error: () => {},
      result: (r) => {
        result = r.blob;
      },
      cleanup: () => {},
    },
    () => 0,
    3
  );
  s.start();
  recorder.data("1234");
  assert.equal(recorder.stops, 1);
  recorder.end();
  await flush();
  assert.equal(result?.size, 4);
});
test("preview URLs remain valid until explicitly replaced or cleared", async () => {
  const slot = new RecordingUrl(),
    first = slot.replace(new Blob(["first"]));
  assert.equal(await (await fetch(first)).text(), "first");
  const next = slot.replace(new Blob(["next"]));
  await assert.rejects(fetch(first));
  assert.equal(await (await fetch(next)).text(), "next");
  slot.clear();
  slot.clear();
  await assert.rejects(fetch(next));
});

test("missing stop event recovers available chunks after the bounded timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  f.session.start();
  f.recorder.data("saved");
  f.session.stop();
  t.mock.timers.tick(12000);
  await flush();
  assert.equal(await f.results[0].text(), "saved");
  assert.equal(f.cleanupCount(), 1);
  assert.match(f.errors[0], /did not finish normally/);
});
