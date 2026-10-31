export {};

let currentRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let startTime = 0;
let pauseTime = 0;
let totalPausedDuration = 0;

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as {
    type?: string;
    streamId?: string;
    withMic?: boolean;
  };

  if (!msg.type?.startsWith("REC_OFFSCREEN_")) return;

  if (msg.type === "REC_OFFSCREEN_START") {
    (async () => {
      try {
        if (!msg.streamId) throw new Error("Missing streamId for tab capture");
        recordedChunks = [];
        startTime = Date.now();
        pauseTime = 0;
        totalPausedDuration = 0;

        const tabStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: msg.streamId,
            },
          } as unknown as boolean,
          video: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: msg.streamId,
            },
          } as unknown as boolean,
        });

        recordingStream = tabStream;
        let mixedAudioStream: MediaStream | null = null;

        if (msg.withMic) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            audioContext = new AudioContext();
            const tabAudio = audioContext.createMediaStreamSource(tabStream);
            const micAudio = audioContext.createMediaStreamSource(micStream);
            const destination = audioContext.createMediaStreamDestination();
            tabAudio.connect(destination);
            micAudio.connect(destination);
            mixedAudioStream = destination.stream;
          } catch (micErr) {
            console.warn("Microphone not available, recording tab audio only:", micErr);
          }
        }

        const videoTracks = tabStream.getVideoTracks();
        const audioTracks = mixedAudioStream
          ? mixedAudioStream.getAudioTracks()
          : tabStream.getAudioTracks();

        const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";

        currentRecorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });

        currentRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        currentRecorder.start(1000);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Failed to start offscreen recorder",
        });
      }
    })();
    return true;
  }

  if (msg.type === "REC_OFFSCREEN_PAUSE") {
    if (currentRecorder && currentRecorder.state === "recording") {
      currentRecorder.pause();
      pauseTime = Date.now();
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "REC_OFFSCREEN_RESUME") {
    if (currentRecorder && currentRecorder.state === "paused") {
      if (pauseTime > 0) {
        totalPausedDuration += Date.now() - pauseTime;
        pauseTime = 0;
      }
      currentRecorder.resume();
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "REC_OFFSCREEN_STOP") {
    (async () => {
      try {
        if (!currentRecorder) {
          sendResponse({ ok: false, error: "No active recorder" });
          return;
        }

        // Account for any remaining pause time if stopping while paused
        if (pauseTime > 0) {
          totalPausedDuration += Date.now() - pauseTime;
          pauseTime = 0;
        }

        await new Promise<void>((resolve) => {
          if (!currentRecorder) return resolve();
          currentRecorder.onstop = () => resolve();
          currentRecorder.stop();
        });

        const duration = Math.max(0, Date.now() - startTime - totalPausedDuration);
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const buffer = await blob.arrayBuffer();

        // Cleanup media tracks
        recordingStream?.getTracks().forEach((track) => track.stop());
        micStream?.getTracks().forEach((track) => track.stop());
        audioContext?.close().catch(() => {});
        recordingStream = null;
        micStream = null;
        audioContext = null;
        currentRecorder = null;
        recordedChunks = [];

        sendResponse({
          ok: true,
          buffer: Array.from(new Uint8Array(buffer)),
          duration,
          mimeType: "video/webm",
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
    recordingStream?.getTracks().forEach((track) => track.stop());
    micStream?.getTracks().forEach((track) => track.stop());
    audioContext?.close().catch(() => {});
    recordingStream = null;
    micStream = null;
    audioContext = null;
    currentRecorder = null;
    recordedChunks = [];
    sendResponse({ ok: true });
    return;
  }
});
