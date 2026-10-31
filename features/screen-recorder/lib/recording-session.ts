export type SessionStatus =
  "recording" | "paused" | "stopping" | "processing" | "completed" | "error";
export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  extension: "webm" | "mp4";
  duration: number;
};
export type SessionCallbacks = {
  status: (status: SessionStatus) => void;
  result: (result: RecordingResult) => void;
  error: (message: string) => void;
  cleanup: () => void;
};

/** A recorder owns its chunks and event handlers until the final stop event.
 * Resource cleanup is deliberately after final dataavailable, never after stop().
 */
export class RecordingSession {
  private chunks: Blob[] = [];
  private bytes = 0;
  private stopped = false;
  private stopping = false;
  private finalized = false;
  private started = 0;
  private elapsed = 0;
  private running = false;
  private stopTimer: ReturnType<typeof setTimeout> | undefined;
  private failure = "";
  private recorder: MediaRecorder;
  private callbacks: SessionCallbacks;
  private now: () => number;
  private maxBytes: number;
  constructor(
    recorder: MediaRecorder,
    callbacks: SessionCallbacks,
    now = () => performance.now(),
    maxBytes = 512 * 1024 * 1024
  ) {
    this.recorder = recorder;
    this.callbacks = callbacks;
    this.now = now;
    this.maxBytes = maxBytes;
    recorder.ondataavailable = (event) => {
      if (this.stopped || !event.data.size) return;
      this.chunks.push(event.data);
      this.bytes += event.data.size;
      if (this.bytes >= this.maxBytes) {
        callbacks.error(
          "The 512 MB recording limit was reached. Your captured video is being finalized."
        );
        this.stop();
      }
    };
    recorder.onstart = () => {
      if (this.stopped || this.stopping) return;
      this.started = this.now();
      this.running = true;
      callbacks.status("recording");
    };
    recorder.onpause = () => {
      if (this.stopped || this.stopping) return;
      this.freeze();
      callbacks.status("paused");
    };
    recorder.onresume = () => {
      if (this.stopped || this.stopping) return;
      this.started = this.now();
      this.running = true;
      callbacks.status("recording");
    };
    recorder.onerror = () => {
      if (this.stopped) return;
      this.failure =
        "The browser reported an encoding error. Any captured video will be preserved.";
      callbacks.error(this.failure);
      this.stop();
    };
    recorder.onstop = () => {
      void this.finalize();
    };
  }
  get duration() {
    return this.elapsed + (this.running ? Math.max(0, this.now() - this.started) : 0);
  }
  get size() {
    return this.bytes;
  }
  start() {
    this.recorder.start(1000);
  }
  pause() {
    if (!this.stopping && this.recorder.state === "recording") this.recorder.pause();
  }
  resume() {
    if (!this.stopping && this.recorder.state === "paused") this.recorder.resume();
  }
  private freeze() {
    this.elapsed = this.duration;
    this.running = false;
  }
  stop() {
    if (this.stopped || this.stopping || this.finalized) return;
    this.stopping = true;
    this.freeze();
    this.callbacks.status("stopping");
    // An encoding error can set state inactive before its queued data/stop events.
    // Still wait for onstop; stopping tracks now can lose the last chunk.
    this.stopTimer = setTimeout(() => {
      this.callbacks.error(
        "The browser did not finish normally. Recovering captured chunks."
      );
      void this.finalize();
    }, 12_000);
    if (this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        this.failure = "The browser could not stop normally.";
      }
    }
  }
  private async finalize() {
    if (this.stopped || this.finalized) return;
    this.finalized = true;
    this.freeze();
    clearTimeout(this.stopTimer);
    this.callbacks.status("processing");
    await Promise.resolve();
    if (this.stopped) return;
    try {
      const mimeType =
        this.recorder.mimeType || this.chunks.find((c) => c.type)?.type || "";
      if (!/^video\/(webm|mp4)(;|$)/i.test(mimeType))
        throw new Error("The browser returned an unsupported video container.");
      const blob = new Blob(this.chunks, { type: mimeType });
      if (!blob.size)
        throw new Error("No video data was captured. Select another tab and try again.");
      this.callbacks.result({
        blob,
        mimeType,
        extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm",
        duration: this.elapsed,
      });
      this.callbacks.status("completed");
    } catch (error) {
      this.callbacks.error(
        error instanceof Error ? error.message : "Could not finalize recording."
      );
      this.callbacks.status("error");
    } finally {
      this.detach();
      this.callbacks.cleanup();
      this.chunks = [];
    }
  }
  private detach() {
    this.stopped = true;
    clearTimeout(this.stopTimer);
    this.recorder.ondataavailable = this.recorder.onstop = this.recorder.onerror = null;
    this.recorder.onstart = this.recorder.onpause = this.recorder.onresume = null;
  }
  dispose() {
    if (this.stopped) return;
    this.detach();
    if (this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.chunks = [];
    this.callbacks.cleanup();
  }
}

export class RecordingUrl {
  value: string | null = null;
  replace(blob: Blob) {
    const next = URL.createObjectURL(blob);
    this.clear();
    this.value = next;
    return next;
  }
  clear() {
    if (this.value) URL.revokeObjectURL(this.value);
    this.value = null;
  }
}
