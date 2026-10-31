"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  createCompositor,
  type WebcamOverlayOptions,
  type CompositorInstance,
} from "../lib/canvas-compositor";
import { mixAudioTracks, type MixedAudioResult } from "../lib/audio-mixer";
import {
  getBestMimeType,
  generateFilename,
  hasDisplayMediaSupport,
  hasMediaRecorderSupport,
} from "../lib/media-support";
import {
  RecordingSession,
  RecordingUrl,
  type RecordingResult,
} from "../lib/recording-session";
import { createDemoSource } from "../lib/demo-source";
import { downloadBlob } from "@/lib/browser/download";
export type RecordingStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "paused"
  | "stopping"
  | "processing"
  | "completed"
  | "error";
export type AudioMode = "none" | "mic" | "system" | "both";
type CaptureDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: {
    handle: string;
    exposeOrigin: boolean;
    permittedOrigins: string[];
  }) => void;
};
type CaptureTrack = MediaStreamTrack & {
  getCaptureHandle?: () => { handle?: string } | null;
};
type Resources = {
  streams: MediaStream[];
  compositor?: CompositorInstance;
  mixed?: MixedAudioResult | null;
  demoCleanup?: () => void;
  cleanup: () => void;
};

export function useScreenRecorder() {
  const [status, setStatus] = useState<RecordingStatus>("idle"),
    [duration, setDuration] = useState(0);
  const [result, setResult] = useState<(RecordingResult & { url: string }) | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null),
    [systemAudioNotice, setSystemAudioNotice] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode>("none");
  const [quality, setQuality] = useState("1080");
  const [webcamOptions, setWebcamOptions] = useState<WebcamOverlayOptions>({
    enabled: false,
    position: "bottom-right",
    size: "medium",
    shape: "circle",
  });
  const [webcamPreviewStream, setWebcamPreviewStream] = useState<MediaStream | null>(
    null
  );
  const [compositor, setCompositor] = useState<CompositorInstance | null>(null);
  const [hasMounted, setHasMounted] = useState(false),
    [isBrowserSupported, setSupported] = useState(false),
    [demo, setDemo] = useState(false);
  const alive = useRef(true),
    generation = useRef(0),
    setup = useRef<AbortController | null>(null),
    resources = useRef<Resources | null>(null),
    session = useRef<RecordingSession | null>(null);
  const urlSlot = useRef(new RecordingUrl()),
    camera = useRef<MediaStream | null>(null),
    cameraGeneration = useRef(0),
    captureId = useRef("");
  const phase = useRef<RecordingStatus>("idle");
  const changeStatus = useCallback((next: RecordingStatus) => {
    phase.current = next;
    if (alive.current) setStatus(next);
  }, []);
  useEffect(() => {
    alive.current = true;
    setHasMounted(true);
    setSupported(
      hasDisplayMediaSupport() &&
        hasMediaRecorderSupport() &&
        typeof HTMLCanvasElement.prototype.captureStream === "function"
    );
    captureId.current = `ramupod-studio-${crypto.randomUUID()}`;
    try {
      (navigator.mediaDevices as CaptureDevices)?.setCaptureHandleConfig?.({
        handle: captureId.current,
        exposeOrigin: false,
        permittedOrigins: [location.origin],
      });
    } catch {
      /* Optional Chromium self-capture protection. */
    }
    const url = urlSlot.current,
      counter = generation,
      cameraCounter = cameraGeneration;
    return () => {
      alive.current = false;
      counter.current++;
      cameraCounter.current++;
      setup.current?.abort();
      session.current?.dispose();
      resources.current?.cleanup();
      camera.current?.getTracks().forEach((t) => t.stop());
      url.clear();
      try {
        (navigator.mediaDevices as CaptureDevices)?.setCaptureHandleConfig?.({
          handle: "",
          exposeOrigin: false,
          permittedOrigins: [],
        });
      } catch {
        /* Optional API. */
      }
    };
  }, []);
  useEffect(() => {
    if (!compositor) return;
    compositor.updateOptions(webcamOptions);
  }, [compositor, webcamOptions]);
  useEffect(() => {
    if (status !== "recording" && status !== "paused") return;
    const tick = () => {
      const active = session.current;
      if (!active) return;
      setDuration(active.duration);
      if (active.duration >= 30 * 60 * 1000) {
        setSystemAudioNotice(
          "The 30-minute session limit was reached. Your video is being finalized."
        );
        active.stop();
      }
    };
    const timer = setInterval(tick, 500);
    const visibility = () => {
      if (document.hidden)
        setSystemAudioNotice(
          "Keep the studio or its floating window visible for smooth frame delivery. Browsers may throttle background tabs."
        );
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [status]);

  const toggleWebcamPreview = useCallback(async (enabled: boolean) => {
    const id = ++cameraGeneration.current;
    camera.current?.getTracks().forEach((t) => t.stop());
    camera.current = null;
    setWebcamPreviewStream(null);
    if (!enabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      if (!alive.current || id !== cameraGeneration.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      camera.current = stream;
      setWebcamPreviewStream(stream);
      setErrorMessage(null);
    } catch {
      if (alive.current && id === cameraGeneration.current)
        setErrorMessage(
          "Camera permission was denied or no camera is available. You can still record without it."
        );
    }
  }, []);

  const prepareRecording = useCallback(
    async (useDemo = false) => {
      if (!["idle", "error", "completed"].includes(phase.current) || setup.current)
        return;
      if (!hasMediaRecorderSupport() || (!useDemo && !hasDisplayMediaSupport())) {
        setErrorMessage(
          "This browser cannot capture screens. Use desktop Chrome or Edge, or try the demo scene."
        );
        return;
      }
      cameraGeneration.current++;
      const id = ++generation.current,
        abort = new AbortController();
      setup.current = abort;
      changeStatus("requesting");
      setErrorMessage(null);
      setSystemAudioNotice(null);
      setDemo(useDemo);
      setDuration(0);
      let cleaned = false;
      const owned: Resources = {
        streams: [],
        cleanup: () => {
          if (cleaned) return;
          cleaned = true;
          owned.streams.forEach((s) =>
            s.getTracks().forEach((t) => {
              t.onended = null;
              t.stop();
            })
          );
          owned.compositor?.destroy();
          owned.mixed?.cleanup();
          owned.demoCleanup?.();
          if (resources.current === owned) {
            resources.current = null;
            if (alive.current) setCompositor(null);
          }
        },
      };
      resources.current = owned;
      const current = () =>
        alive.current && id === generation.current && !abort.signal.aborted;
      const check = () => {
        if (!current()) throw new DOMException("Capture cancelled.", "AbortError");
      };
      try {
        let screen: MediaStream;
        const wantSystem = audioMode === "system" || audioMode === "both";
        if (useDemo) {
          const sample = createDemoSource();
          screen = sample.stream;
          owned.demoCleanup = sample.cleanup;
        } else {
          const options: DisplayMediaStreamOptions & {
            selfBrowserSurface: string;
            monitorTypeSurfaces: string;
            surfaceSwitching: string;
            systemAudio: string;
          } = {
            video: { displaySurface: "browser", frameRate: { ideal: 30, max: 30 } },
            audio: wantSystem,
            selfBrowserSurface: "exclude",
            monitorTypeSurfaces: "exclude",
            surfaceSwitching: "exclude",
            systemAudio: wantSystem ? "include" : "exclude",
          };
          screen = await navigator.mediaDevices.getDisplayMedia(options);
        }
        owned.streams.push(screen);
        check();
        const track = screen.getVideoTracks()[0] as CaptureTrack | undefined;
        if (!track || track.readyState !== "live")
          throw new Error("The shared video source ended before recording could start.");
        if (!useDemo) {
          const surface = track.getSettings().displaySurface;
          if (surface !== "browser")
            throw new Error(
              "Studio records separate browser tabs to keep its controls out of the video. Choose an app tab in desktop Chrome or Edge, not an entire screen or window."
            );
          if (track.getCaptureHandle?.()?.handle?.startsWith("ramupod-studio-"))
            throw new Error("Choose your application tab, not the Ramupod studio tab.");
        }
        track.onended = () => {
          if (!current()) return;
          if (session.current) session.current.stop();
          else {
            abort.abort();
            owned.cleanup();
            setSystemAudioNotice("Screen sharing ended before recording started.");
            changeStatus(result ? "completed" : "idle");
          }
        };
        if (wantSystem && !screen.getAudioTracks().length)
          setSystemAudioNotice(
            useDemo
              ? "The demo scene is silent. Microphone narration is available if enabled."
              : "No tab audio was shared. Enable Share audio in the picker if the browser and source support it."
          );
        let mic: MediaStream | null = null,
          webcam: MediaStream | null = null;
        if (audioMode === "mic" || audioMode === "both") {
          try {
            mic = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            owned.streams.push(mic);
          } catch {
            if (current())
              setSystemAudioNotice(
                "Microphone was unavailable. The session will continue with available tab audio only."
              );
          }
          check();
        }
        if (webcamOptions.enabled) {
          if (camera.current?.getVideoTracks().some((t) => t.readyState === "live")) {
            webcam = camera.current;
            camera.current = null;
            cameraGeneration.current++;
            setWebcamPreviewStream(null);
            owned.streams.push(webcam);
          } else {
            try {
              webcam = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
              });
              owned.streams.push(webcam);
            } catch {
              if (current())
                setSystemAudioNotice(
                  "Camera was unavailable. The session will continue without a webcam overlay."
                );
            }
          }
          check();
        } else {
          cameraGeneration.current++;
          camera.current?.getTracks().forEach((t) => t.stop());
          camera.current = null;
          setWebcamPreviewStream(null);
        }
        owned.compositor = await createCompositor(
          screen,
          webcam,
          { ...webcamOptions, enabled: !!webcam },
          30,
          quality === "720" ? 1280 : 1920,
          abort.signal
        );
        check();
        owned.mixed = mixAudioTracks(
          wantSystem ? screen.getAudioTracks()[0] : null,
          mic?.getAudioTracks()[0]
        );
        const output = new MediaStream([
          ...owned.compositor.stream.getVideoTracks(),
          ...(owned.mixed ? [owned.mixed.track] : []),
        ]);
        owned.streams.push(output);
        setCompositor(owned.compositor);
        changeStatus("ready");
      } catch (error) {
        owned.cleanup();
        // A permission request can resolve after cancellation/unmount; its late streams
        // have been registered above and are stopped here, never published to React.
        owned.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        owned.compositor?.destroy();
        owned.mixed?.cleanup();
        if (alive.current && id === generation.current) {
          const name = error instanceof Error ? error.name : "";
          if (name !== "AbortError" && name !== "NotAllowedError") {
            setErrorMessage(
              error instanceof Error ? error.message : "Could not prepare the recording."
            );
            changeStatus("error");
          } else {
            setSystemAudioNotice(
              "Capture selection was cancelled. No recording was created."
            );
            changeStatus(result ? "completed" : "idle");
          }
        }
      } finally {
        if (setup.current === abort) setup.current = null;
      }
    },
    [audioMode, webcamOptions, quality, changeStatus, result]
  );

  const beginRecording = useCallback(() => {
    if (phase.current !== "ready" || !resources.current?.compositor || session.current)
      return;
    const owned = resources.current,
      id = generation.current;
    const output = owned.streams[owned.streams.length - 1],
      best = getBestMimeType(!!output.getAudioTracks().length);
    const valid = () => alive.current && id === generation.current;
    try {
      void owned.mixed?.resume?.().catch(() => {
        if (valid()) setSystemAudioNotice("Audio mixing could not resume. Check browser audio permissions before the next take.");
      });
      const recorder = new MediaRecorder(output, {
        ...(best ? { mimeType: best.mimeType } : {}),
        videoBitsPerSecond: quality === "720" ? 3_000_000 : 6_000_000,
      });
      const active = new RecordingSession(recorder, {
        status: (next) => {
          if (valid()) changeStatus(next);
        },
        result: (next) => {
          if (valid()) {
            const url = urlSlot.current.replace(next.blob);
            setResult({ ...next, url });
            setDuration(next.duration);
          }
        },
        error: (message) => {
          if (valid()) setErrorMessage(message);
        },
        cleanup: () => {
          owned.cleanup();
          if (session.current === active) session.current = null;
        },
      });
      session.current = active;
      active.start();
    } catch (error) {
      session.current?.dispose();
      session.current = null;
      owned.cleanup();
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start the encoder."
      );
      changeStatus("error");
    }
  }, [quality, changeStatus]);
  const stopRecording = useCallback(() => session.current?.stop(), []);
  const pauseRecording = useCallback(() => {
    try {
      session.current?.pause();
    } catch {
      setErrorMessage("The browser could not pause this recording.");
    }
  }, []);
  const resumeRecording = useCallback(() => {
    try {
      session.current?.resume();
    } catch {
      setErrorMessage("The browser could not resume this recording.");
    }
  }, []);
  const cancelSetup = useCallback(() => {
    generation.current++;
    setup.current?.abort();
    resources.current?.cleanup();
    setCompositor(null);
    changeStatus(result ? "completed" : "idle");
  }, [changeStatus, result]);
  const resetRecording = useCallback(() => {
    if (["recording", "paused", "stopping", "processing"].includes(phase.current)) return;
    generation.current++;
    setup.current?.abort();
    session.current?.dispose();
    session.current = null;
    resources.current?.cleanup();
    cameraGeneration.current++;
    camera.current?.getTracks().forEach((t) => t.stop());
    camera.current = null;
    setWebcamPreviewStream(null);
    setWebcamOptions((prev) => ({ ...prev, enabled: false }));
    urlSlot.current.clear();
    setResult(null);
    setDuration(0);
    setErrorMessage(null);
    setSystemAudioNotice(null);
    changeStatus("idle");
  }, [changeStatus]);
  const downloadRecording = useCallback(() => {
    if (result) downloadBlob(result.blob, generateFilename(result.extension));
  }, [result]);
  const importRecording = useCallback(
    (
      blob: Blob,
      durationMs: number,
      ext: "webm" | "mp4" = "webm",
      mime: string = "video/webm"
    ) => {
      const url = urlSlot.current.replace(blob);
      setResult({
        blob,
        duration: durationMs,
        extension: ext,
        mimeType: mime,
        url,
      });
      setDuration(durationMs);
      changeStatus("completed");
    },
    [changeStatus]
  );
  return {
    status,
    duration,
    recordedBlob: result?.blob ?? null,
    previewUrl: result?.url ?? null,
    fileSize: result?.blob.size ?? 0,
    outputMimeType: result?.mimeType ?? "",
    fileExtension: result?.extension ?? ("webm" as const),
    errorMessage,
    systemAudioNotice,
    audioMode,
    webcamOptions,
    quality,
    setQuality,
    isBrowserSupported,
    hasMounted,
    compositor,
    liveStream: compositor?.stream ?? null,
    webcamPreviewStream,
    setAudioMode,
    setWebcamOptions,
    prepareRecording,
    startRecording: () => void prepareRecording(false),
    beginRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelSetup,
    resetRecording,
    downloadRecording,
    importRecording,
    toggleWebcamPreview,
    demo,
  };
}
