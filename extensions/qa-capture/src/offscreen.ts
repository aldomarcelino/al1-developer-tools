import { deviceError } from "./device-errors.ts";

// This document owns media and finalized bytes. A service-worker restart must not
// end a recording or remove the only copy of a completed video.
let currentRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
let deviceStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let startTime = 0,
  pauseTime = 0,
  totalPausedDuration = 0,
  stoppedAt = 0;
let stopEvent: Promise<void> = Promise.resolve();
let packaged: Uint8Array | null = null;
let lastError = "",
  sessionId = "";
let preparedFor = "",
  preparedMic = false,
  preparedCamera = false;
let cameraVideo: HTMLVideoElement | null = null;
let cameraStream: MediaStream | null = null;
let cameraRecovery: Promise<void> | null = null;
let deviceGeneration = 0;
let cameraRetries = 0;
let cameraTimer: ReturnType<typeof setInterval> | undefined;
let deviceExpiry: ReturnType<typeof setTimeout> | undefined;
let cameraFrameBusy = false;
let cameraReader: ReadableStreamDefaultReader<VideoFrame> | null = null;
let cameraPumpId = 0;
let lastCameraFrameAt = 0;
let cameraFramesReceived = 0;
let cameraFramesSent = 0;
let cameraSource = "idle";
let frameDeliveryId = 0;

function stopDevices() {
  deviceGeneration++;
  cameraPumpId++;
  frameDeliveryId++;
  void cameraReader?.cancel().catch(() => {});
  cameraReader = null;
  cameraSource = "idle";
  clearInterval(cameraTimer);
  clearTimeout(deviceExpiry);
  deviceStream?.getTracks().forEach((track) => track.stop());
  deviceStream = null;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  if (cameraVideo) {
    cameraVideo.srcObject = null;
    cameraVideo.remove();
    cameraVideo = null;
  }
  preparedFor = "";
  cameraFrameBusy = false;
}
function cameraIsLive() {
  return !!cameraStream?.getVideoTracks().some((track) => track.readyState === "live");
}
async function recoverCamera(force = false) {
  if (cameraRecovery) return cameraRecovery;
  if (!preparedCamera || !preparedFor || (!force && cameraIsLive())) return;
  if (cameraRetries >= 2) {
    lastError =
      "Camera disconnected. Your screen recording is still available; finish and check the camera before starting again.";
    return;
  }
  cameraRetries++;
  const generation = deviceGeneration;
  cameraRecovery = (async () => {
    const replacement = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
    });
    if (generation !== deviceGeneration || !preparedFor) {
      replacement.getTracks().forEach((track) => track.stop());
      return;
    }
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = replacement;
    await connectCamera(replacement);
    watchCamera(replacement, generation);
  })()
    .catch((error) => {
      if (generation === deviceGeneration)
        lastError = `Camera interrupted: ${deviceError(error)} Your screen recording continues.`;
    })
    .finally(() => {
      cameraRecovery = null;
    });
  return cameraRecovery;
}
function watchCamera(stream: MediaStream, generation: number) {
  for (const track of stream.getVideoTracks()) {
    track.addEventListener(
      "ended",
      () => {
        if (generation === deviceGeneration) void recoverCamera();
      },
      { once: true }
    );
    // A background HTMLVideoElement may be muted while its camera track is
    // still producing frames. Recovery is driven by actual frame progress.
  }
}
async function connectCamera(stream: MediaStream) {
  const pump = ++cameraPumpId;
  const generation = deviceGeneration;
  const owner = preparedFor;
  clearInterval(cameraTimer);
  void cameraReader?.cancel().catch(() => {});
  cameraReader = null;
  if (cameraVideo) {
    cameraVideo.srcObject = null;
    cameraVideo.remove();
    cameraVideo = null;
  }
  cameraFrameBusy = false;
  frameDeliveryId++;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  let lastSent = 0;
  let deliveryStarted = 0;
  lastCameraFrameAt = Date.now();
  const paint = (source: CanvasImageSource, width: number, height: number) => {
    if (pump !== cameraPumpId || owner !== preparedFor || !width || !height) return;
    lastCameraFrameAt = Date.now();
    cameraFramesReceived++;
    // Drop intermediate frames; neither a slow tab nor a missing RPC reply may
    // block the camera reader indefinitely.
    if (
      lastCameraFrameAt - lastSent < 66 ||
      (cameraFrameBusy && lastCameraFrameAt - deliveryStarted < 500)
    )
      return;
    const delivery = ++frameDeliveryId;
    cameraFrameBusy = true;
    deliveryStarted = lastCameraFrameAt;
    try {
      const side = Math.min(width, height);
      context.setTransform(-1, 0, 0, 1, 256, 0);
      context.drawImage(
        source,
        (width - side) / 2,
        (height - side) / 2,
        side,
        side,
        0,
        0,
        256,
        256
      );
      const image = canvas.toDataURL("image/jpeg", 0.8);
      lastSent = lastCameraFrameAt;
      cameraFramesSent++;
      void chrome.runtime
        .sendMessage({ type: "REC_CAMERA_FRAME", sessionId: owner, image })
        .catch(() => {})
        .finally(() => {
          if (delivery === frameDeliveryId) cameraFrameBusy = false;
        });
    } catch {
      if (delivery === frameDeliveryId) cameraFrameBusy = false;
    }
  };
  const Processor = (
    globalThis as unknown as {
      MediaStreamTrackProcessor?: new (options: {
        track: MediaStreamTrack;
        maxBufferSize: number;
      }) => { readable: ReadableStream<VideoFrame> };
    }
  ).MediaStreamTrackProcessor;
  if (Processor) {
    // Read the camera source itself, not playback from a hidden video element.
    // Playback can stop advancing when Chrome moves the setup page off screen.
    cameraSource = "track";
    const reader = new Processor({
      track: stream.getVideoTracks()[0],
      maxBufferSize: 1,
    }).readable.getReader();
    cameraReader = reader;
    void (async () => {
      try {
        while (pump === cameraPumpId) {
          const { value: frame, done } = await reader.read();
          if (done) break;
          try {
            paint(frame, frame.displayWidth, frame.displayHeight);
          } finally {
            frame.close();
          }
        }
      } catch {
        // The watchdog below handles stalled/ended sources without touching mic.
      } finally {
        reader.releaseLock();
      }
    })();
    cameraTimer = setInterval(() => {
      if (generation !== deviceGeneration || pump !== cameraPumpId) return;
      if (!cameraIsLive() || Date.now() - lastCameraFrameAt > 4000)
        void recoverCamera(true);
    }, 1000);
    return;
  }
  // Compatibility path for browsers without the track-processing API.
  cameraSource = "video";
  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.style.cssText =
    "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
  cameraVideo = video;
  document.body.appendChild(video);
  await video.play();
  let previousTime = -1;
  cameraTimer = setInterval(() => {
    if (generation !== deviceGeneration || pump !== cameraPumpId) return;
    if (!cameraIsLive() || Date.now() - lastCameraFrameAt > 4000) {
      void recoverCamera(true);
      return;
    }
    if (video.currentTime !== previousTime) {
      previousTime = video.currentTime;
      paint(video, video.videoWidth, video.videoHeight);
    }
  }, 100);
}

async function prepareDevices(options: {
  sessionId?: string;
  withMic?: boolean;
  withCamera?: boolean;
}) {
  const mic = !!options.withMic,
    camera = !!options.withCamera;
  if (
    preparedFor === options.sessionId &&
    preparedMic === mic &&
    preparedCamera === camera &&
    ((!mic && !camera) ||
      ((!mic ||
        deviceStream?.getAudioTracks().some((track) => track.readyState === "live")) &&
        (!camera || cameraIsLive())))
  )
    return;
  stopDevices();
  cameraRetries = 0;
  const generation = deviceGeneration;
  preparedFor = options.sessionId ?? "";
  preparedMic = mic;
  preparedCamera = camera;
  if (!mic && !camera) return;
  const acquired = await navigator.mediaDevices.getUserMedia({
    audio: mic ? { echoCancellation: true, noiseSuppression: true } : false,
    video: camera ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
  });
  if (generation !== deviceGeneration) {
    acquired.getTracks().forEach((track) => track.stop());
    throw new Error("Device preparation was cancelled.");
  }
  deviceStream = acquired;
  if (mic && !deviceStream.getAudioTracks().length)
    throw new Error("No microphone track was provided. Check the selected input device.");
  if (camera && !deviceStream.getVideoTracks().length)
    throw new Error("No camera track was provided. Check the selected camera.");
  if (camera) {
    cameraStream = new MediaStream(deviceStream.getVideoTracks());
    cameraFramesReceived = 0;
    cameraFramesSent = 0;
    await connectCamera(cameraStream);
    watchCamera(cameraStream, generation);
  }
  deviceExpiry = setTimeout(() => {
    if (!currentRecorder) stopDevices();
  }, 30000);
}

function releaseTracks() {
  recordingStream?.getTracks().forEach((track) => track.stop());
  stopDevices();
  void audioContext?.close().catch(() => {});
  recordingStream = null;
  deviceStream = null;
  audioContext = null;
}
function finishPause() {
  if (pauseTime) {
    totalPausedDuration += Date.now() - pauseTime;
    pauseTime = 0;
  }
}
function duration() {
  return Math.max(
    0,
    (stoppedAt || Date.now()) -
      startTime -
      totalPausedDuration -
      (pauseTime ? Date.now() - pauseTime : 0)
  );
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as {
    type?: string;
    streamId?: string;
    withMic?: boolean;
    withCamera?: boolean;
    sessionId?: string;
    includeBuffer?: boolean;
    offset?: number;
  };
  if (!msg.type?.startsWith("REC_OFFSCREEN_")) return;

  if (msg.type === "REC_OFFSCREEN_PREPARE_DEVICES") {
    if (currentRecorder) {
      sendResponse({
        ok: false,
        error: "Finish or discard the current recording first.",
      });
      return;
    }
    void prepareDevices(msg)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        stopDevices();
        sendResponse({ ok: false, error: deviceError(error) });
      });
    return true;
  }

  if (msg.type === "REC_OFFSCREEN_STATUS") {
    sendResponse({
      ok: true,
      hasRecording: !!currentRecorder,
      camera: {
        source: cameraSource,
        framesReceived: cameraFramesReceived,
        framesSent: cameraFramesSent,
        lastFrameAgeMs: lastCameraFrameAt ? Date.now() - lastCameraFrameAt : null,
        trackState: cameraStream?.getVideoTracks()[0]?.readyState ?? "none",
        recoveries: cameraRetries,
      },
      state:
        currentRecorder?.state === "inactive"
          ? "stopped"
          : (currentRecorder?.state ?? "idle"),
      startedAt: startTime,
      pausedAt: pauseTime,
      totalPausedDuration,
      duration: duration(),
      error: lastError,
      sessionId,
    });
    return;
  }
  if (msg.type === "REC_OFFSCREEN_READ") {
    if (
      !packaged ||
      !Number.isSafeInteger(msg.offset) ||
      msg.offset! < 0 ||
      msg.offset! >= packaged.byteLength
    ) {
      sendResponse({ ok: false, error: "Video chunk is unavailable. Try Finish again." });
      return;
    }
    sendResponse({
      ok: true,
      offset: msg.offset,
      buffer: Array.from(packaged.subarray(msg.offset!, msg.offset! + 256 * 1024)),
    });
    return;
  }
  if (msg.type === "REC_OFFSCREEN_START") {
    if (currentRecorder) {
      sendResponse(
        msg.sessionId && msg.sessionId === sessionId
          ? { ok: true }
          : { ok: false, error: "Finish or discard the existing recording first." }
      );
      return;
    }
    (async () => {
      try {
        if (!msg.streamId) throw new Error("Missing streamId for tab capture");
        recordedChunks = [];
        packaged = null;
        lastError = "";
        startTime = Date.now();
        pauseTime = 0;
        totalPausedDuration = 0;
        stoppedAt = 0;
        sessionId = msg.sessionId ?? msg.streamId;
        await prepareDevices(msg);
        clearTimeout(deviceExpiry);
        let tabStream: MediaStream;
        const tabVideo = {
          mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: msg.streamId },
        } as unknown as boolean;
        try {
          tabStream = await navigator.mediaDevices.getUserMedia({
            audio: tabVideo,
            video: tabVideo,
          });
        } catch {
          tabStream = await navigator.mediaDevices.getUserMedia({ video: tabVideo });
        }
        recordingStream = tabStream;
        // Starting tab capture can interrupt a previously opened camera. Recover
        // only video so the microphone source already in use is preserved.
        await recoverCamera();
        if (msg.withCamera && cameraVideo) await cameraVideo.play();
        let mixedAudioStream: MediaStream | null = null;
        if (msg.withMic && deviceStream) {
          audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();
          if (tabStream.getAudioTracks().length)
            audioContext.createMediaStreamSource(tabStream).connect(destination);
          audioContext.createMediaStreamSource(deviceStream).connect(destination);
          await audioContext.resume();
          mixedAudioStream = destination.stream;
        }
        const combined = new MediaStream([
          ...tabStream.getVideoTracks(),
          ...(mixedAudioStream ?? tabStream).getAudioTracks(),
        ]);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";
        const recorder = new MediaRecorder(combined, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });
        currentRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (currentRecorder === recorder && event.data.size)
            recordedChunks.push(event.data);
        };
        stopEvent = new Promise<void>((resolve) => {
          recorder.onstop = () => {
            if (currentRecorder === recorder) {
              finishPause();
              stoppedAt = Date.now();
              releaseTracks();
              void chrome.runtime
                .sendMessage({ type: "REC_CAPTURE_STOPPED", sessionId })
                .catch(() => {});
            }
            resolve();
          };
        });
        recorder.onerror = () => {
          lastError =
            "The browser interrupted recording. Finish to recover the available video.";
        };
        for (const track of tabStream.getVideoTracks())
          track.addEventListener(
            "ended",
            () => {
              if (recorder.state !== "inactive") recorder.stop();
            },
            { once: true }
          );
        recorder.start(1000);
        sendResponse({ ok: true, startedAt: startTime });
      } catch (err) {
        currentRecorder = null;
        releaseTracks();
        sendResponse({
          ok: false,
          error: deviceError(err),
        });
      }
    })();
    return true;
  }
  if (msg.type === "REC_OFFSCREEN_PAUSE" || msg.type === "REC_OFFSCREEN_RESUME") {
    if (!currentRecorder || currentRecorder.state === "inactive") {
      sendResponse({
        ok: false,
        error: "Recording has stopped. Finish to recover the video.",
      });
      return;
    }
    if (msg.type === "REC_OFFSCREEN_PAUSE" && currentRecorder.state === "recording") {
      currentRecorder.pause();
      pauseTime = Date.now();
    } else if (
      msg.type === "REC_OFFSCREEN_RESUME" &&
      currentRecorder.state === "paused"
    ) {
      finishPause();
      currentRecorder.resume();
    }
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "REC_OFFSCREEN_STOP") {
    (async () => {
      try {
        if (!currentRecorder)
          throw new Error(
            "Recording data is unavailable. Reloading the extension or closing Chrome ends its recording session."
          );
        if (!packaged) {
          if (currentRecorder.state !== "inactive") currentRecorder.stop();
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              stopEvent,
              new Promise<never>((_, reject) => {
                timeout = setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Video is still finalizing. Try Finish again; the captured data is retained."
                      )
                    ),
                  10000
                );
              }),
            ]);
          } finally {
            clearTimeout(timeout);
          }
          const blob = new Blob(recordedChunks, {
            type: currentRecorder.mimeType || "video/webm",
          });
          if (!blob.size)
            throw new Error(
              "The browser produced no video frames. Try recording again after the tab has loaded."
            );
          packaged = new Uint8Array(await blob.arrayBuffer());
          recordedChunks = [];
        }
        sendResponse({
          ok: true,
          byteLength: packaged.byteLength,
          duration: duration(),
          mimeType: currentRecorder.mimeType || "video/webm",
          extension: "webm",
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Failed to package recording",
        });
      }
    })();
    return true;
  }
  if (msg.type === "REC_OFFSCREEN_CANCEL") {
    if (msg.sessionId && msg.sessionId !== sessionId && msg.sessionId !== preparedFor) {
      sendResponse({ ok: false, error: "Another recording owns these devices." });
      return;
    }
    const recorder = currentRecorder;
    currentRecorder = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    releaseTracks();
    recordedChunks = [];
    packaged = null;
    sessionId = "";
    lastError = "";
    sendResponse({ ok: true });
  }
});
