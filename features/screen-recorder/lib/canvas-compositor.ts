import {
  newScene,
  viewRect,
  renderEffects,
  type Scene,
  type View,
} from "./studio-scene.ts";
export type OverlayPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export type OverlaySize = "small" | "medium" | "large";
export type OverlayShape = "circle" | "rounded";

export interface WebcamOverlayOptions {
  enabled: boolean;
  position: OverlayPosition;
  size: OverlaySize;
  shape: OverlayShape;
}

export interface OverlayBox {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/**
 * Calculates the bounding box and positioning for the webcam overlay.
 * Pure function suitable for unit testing without canvas / DOM dependencies.
 */
export function calculateOverlayBox(
  canvasWidth: number,
  canvasHeight: number,
  webcamAspect: number,
  position: OverlayPosition,
  size: OverlaySize,
  shape: OverlayShape,
  marginPercent = 0.025
): OverlayBox {
  const sizeMultiplier = size === "small" ? 0.15 : size === "large" ? 0.25 : 0.2;
  const overlayWidth = Math.round(canvasWidth * sizeMultiplier);

  const overlayHeight =
    shape === "circle"
      ? overlayWidth
      : Math.round(overlayWidth / (webcamAspect > 0 ? webcamAspect : 4 / 3));

  const margin = Math.round(canvasWidth * marginPercent);

  let x = margin;
  let y = margin;

  if (position === "bottom-right") {
    x = canvasWidth - overlayWidth - margin;
    y = canvasHeight - overlayHeight - margin;
  } else if (position === "bottom-left") {
    x = margin;
    y = canvasHeight - overlayHeight - margin;
  } else if (position === "top-right") {
    x = canvasWidth - overlayWidth - margin;
    y = margin;
  } else {
    // top-left
    x = margin;
    y = margin;
  }

  const radius =
    shape === "circle" ? overlayWidth / 2 : Math.min(20, Math.round(overlayWidth * 0.08));

  return {
    x,
    y,
    width: overlayWidth,
    height: overlayHeight,
    radius,
  };
}

export interface CompositorInstance {
  stream: MediaStream;
  canvas: HTMLCanvasElement;
  updateOptions: (newOptions: Partial<WebcamOverlayOptions>) => void;
  destroy: () => void;
  getScene: () => Scene;
  editScene: (edit: (scene: Scene) => void) => void;
  getView: () => View;
  setClock: (clock: Window) => void;
}

/**
 * Composites a screen stream and an optional webcam stream onto an HTML5 Canvas,
 * returning a live MediaStream.
 */
export async function createCompositor(
  screenStream: MediaStream,
  webcamStream: MediaStream | null,
  initialOptions: WebcamOverlayOptions,
  fps = 30,
  maxWidth = 1920,
  signal?: AbortSignal
): Promise<CompositorInstance> {
  let options = { ...initialOptions };
  let isDestroyed = false;
  let timer: number | undefined;
  let clock: Window = window;
  const scene = newScene();
  let zoom = 1,
    focus = { x: 0.5, y: 0.5 },
    lastFrame = performance.now();
  let view = viewRect(zoom, focus);

  // Screen video source
  const screenVideo = document.createElement("video");
  screenVideo.muted = true;
  screenVideo.playsInline = true;
  screenVideo.autoplay = true;
  screenVideo.srcObject = screenStream;

  // Webcam video source
  const webcamVideo = document.createElement("video");
  webcamVideo.muted = true;
  webcamVideo.playsInline = true;
  webcamVideo.autoplay = true;
  if (webcamStream) {
    webcamVideo.srcObject = webcamStream;
  }

  // Canvas setup
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas context for screen compositor.");
  }

  try {
    await Promise.all([
      readyVideo(screenVideo, signal),
      webcamStream ? readyVideo(webcamVideo, signal) : Promise.resolve(),
    ]);
    signal?.throwIfAborted();
  } catch (error) {
    screenVideo.pause();
    screenVideo.srcObject = null;
    webcamVideo.pause();
    webcamVideo.srcObject = null;
    throw error;
  }
  const width = screenVideo.videoWidth,
    height = screenVideo.videoHeight;
  const scale = Math.min(1, maxWidth / width, (maxWidth * 9) / 16 / height);
  canvas.width = Math.max(2, Math.floor((width * scale) / 2) * 2);
  canvas.height = Math.max(2, Math.floor((height * scale) / 2) * 2);

  const renderFrame = () => {
    if (isDestroyed) return;

    // Draw base screen frame
    if (screenVideo.readyState >= 2) {
      const now = performance.now(),
        dt = Math.min(100, now - lastFrame);
      lastFrame = now;
      const factor = 1 - Math.exp(-dt / 150);
      zoom += (scene.zoom - zoom) * factor;
      focus = {
        x: focus.x + (scene.focus.x - focus.x) * factor,
        y: focus.y + (scene.focus.y - focus.y) * factor,
      };
      view = viewRect(zoom, focus);
      ctx.drawImage(
        screenVideo,
        view.x * screenVideo.videoWidth,
        view.y * screenVideo.videoHeight,
        view.size * screenVideo.videoWidth,
        view.size * screenVideo.videoHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      renderEffects(ctx, canvas.width, canvas.height, scene, view, now);
    }

    // Draw webcam overlay if enabled and ready
    if (
      options.enabled &&
      webcamStream &&
      webcamVideo.readyState >= 2 &&
      webcamVideo.videoWidth > 0
    ) {
      const webcamAspect = webcamVideo.videoWidth / webcamVideo.videoHeight;
      const box = calculateOverlayBox(
        canvas.width,
        canvas.height,
        webcamAspect,
        options.position,
        options.size,
        options.shape
      );

      ctx.save();

      // Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = Math.max(8, Math.round(box.width * 0.06));
      ctx.shadowOffsetY = Math.max(3, Math.round(box.height * 0.03));

      // Clip path
      ctx.beginPath();
      if (options.shape === "circle") {
        ctx.arc(box.x + box.radius, box.y + box.radius, box.radius, 0, Math.PI * 2);
      } else if (typeof ctx.roundRect === "function") {
        ctx.roundRect(box.x, box.y, box.width, box.height, box.radius);
      } else {
        ctx.rect(box.x, box.y, box.width, box.height);
      }
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.clip();

      // Center crop webcam source
      const srcW = webcamVideo.videoWidth;
      const srcH = webcamVideo.videoHeight;
      const srcAspect = srcW / srcH;
      const destAspect = box.width / box.height;

      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;

      if (srcAspect > destAspect) {
        sw = srcH * destAspect;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / destAspect;
        sy = (srcH - sh) / 2;
      }

      ctx.drawImage(webcamVideo, sx, sy, sw, sh, box.x, box.y, box.width, box.height);

      // Border outline
      ctx.restore();
      ctx.save();
      ctx.lineWidth = Math.max(2, Math.round(box.width * 0.02));
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      if (options.shape === "circle") {
        ctx.arc(box.x + box.radius, box.y + box.radius, box.radius, 0, Math.PI * 2);
      } else if (typeof ctx.roundRect === "function") {
        ctx.roundRect(box.x, box.y, box.width, box.height, box.radius);
      } else {
        ctx.rect(box.x, box.y, box.width, box.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  // Start rendering loop
  renderFrame();
  timer = clock.setInterval(renderFrame, 1000 / fps);

  // Capture canvas stream
  const canvasStream = canvas.captureStream(fps);

  const updateOptions = (newOptions: Partial<WebcamOverlayOptions>) => {
    options = { ...options, ...newOptions };
  };

  const destroy = () => {
    isDestroyed = true;
    if (timer !== undefined) clock.clearInterval(timer);
    canvasStream.getTracks().forEach((track) => track.stop());
    screenVideo.pause();
    screenVideo.srcObject = null;
    webcamVideo.pause();
    webcamVideo.srcObject = null;
    canvas.width = 0;
    canvas.height = 0;
  };

  return {
    stream: canvasStream,
    canvas,
    updateOptions,
    getScene: () => scene,
    editScene: (edit) => edit(scene),
    getView: () => view,
    setClock: (nextClock) => {
      if (isDestroyed) return;
      if (timer !== undefined) clock.clearInterval(timer);
      clock = nextClock;
      timer = clock.setInterval(renderFrame, 1000 / fps);
    },
    destroy,
  };
}

function readyVideo(video: HTMLVideoElement, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("resize", check);
      signal?.removeEventListener("abort", abort);
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const abort = () => fail("Capture setup cancelled.");
    const check = () => {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(
      () => fail("No video frames arrived. Choose another source and try again."),
      8000
    );
    video.addEventListener("loadeddata", check);
    video.addEventListener("resize", check);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    void video
      .play()
      .then(check)
      .catch(() => fail("Could not play the captured stream."));
    check();
  });
}
