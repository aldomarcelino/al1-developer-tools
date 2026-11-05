// The visible device-check tab owns this stream for the whole recording. Tab
// capture runs in a different document and never replaces or reopens the camera.
export function startCameraSource(
  stream: MediaStream,
  publish: (image: string) => Promise<unknown>,
  onError: (message: string) => void
) {
  const track = stream.getVideoTracks().find((value) => value.readyState === "live");
  if (!track) throw new Error("Check your camera before recording.");
  const Processor = (
    globalThis as unknown as {
      MediaStreamTrackProcessor?: new (options: {
        track: MediaStreamTrack;
        maxBufferSize: number;
      }) => { readable: ReadableStream<VideoFrame> };
    }
  ).MediaStreamTrackProcessor;
  if (!Processor)
    throw new Error(
      "This Chrome version cannot read camera frames. Update Chrome and try again."
    );
  const reader = new Processor({ track, maxBufferSize: 1 }).readable.getReader();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  let stopped = false,
    first = true,
    lastSent = 0,
    pendingSince = 0,
    delivery = 0;
  let resolveReady: () => void, rejectReady: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const fail = (message: string) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
    rejectReady(new Error(message));
    onError(message);
  };
  const timer = setTimeout(
    () => fail("Camera preview is not producing frames. Check the camera and try again."),
    8000
  );
  track.addEventListener(
    "ended",
    () => fail("The camera was disconnected. Your screen recording continues."),
    { once: true }
  );
  void (async () => {
    try {
      while (!stopped) {
        const { value: frame, done } = await reader.read();
        if (done) {
          if (!stopped) fail("The camera stream ended. Your screen recording continues.");
          break;
        }
        try {
          const now = Date.now();
          if (
            stopped ||
            now - lastSent < 66 ||
            (pendingSince && now - pendingSince < 500)
          )
            continue;
          const side = Math.min(frame.displayWidth, frame.displayHeight);
          if (!side) continue;
          context.setTransform(-1, 0, 0, 1, 256, 0);
          context.drawImage(
            frame,
            (frame.displayWidth - side) / 2,
            (frame.displayHeight - side) / 2,
            side,
            side,
            0,
            0,
            256,
            256
          );
          const image = canvas.toDataURL("image/jpeg", 0.8);
          const current = ++delivery;
          lastSent = pendingSince = now;
          void publish(image)
            .then(() => {
              if (stopped) return;
              if (first) {
                first = false;
                clearTimeout(timer);
                resolveReady();
              }
            })
            .catch(() => {
              // A transient worker restart should not stop the physical device.
            })
            .finally(() => {
              if (current === delivery) pendingSince = 0;
            });
        } finally {
          frame.close();
        }
      }
    } catch (error) {
      if (!stopped)
        fail(error instanceof Error ? error.message : "Camera frame processing failed.");
    } finally {
      reader.releaseLock();
    }
  })();
  return {
    ready,
    stop() {
      stopped = true;
      clearTimeout(timer);
      rejectReady(new Error("Camera preparation was cancelled."));
      void reader.cancel().catch(() => {});
    },
  };
}
