import { deviceError } from "./device-errors.ts";
import { startCameraSource } from "./camera-source.ts";

const nonce = new URLSearchParams(location.hash.slice(1)).get("request");
const allow = document.getElementById("allow-devices") as HTMLButtonElement;
const start = document.getElementById("start-countdown") as HTMLButtonElement;
const error = document.getElementById("setup-error")!;
const video = document.getElementById("camera-preview") as HTMLVideoElement;
const meter = document.getElementById("mic-level") as HTMLMeterElement;
const cameraCheck = document.getElementById("camera-check") as HTMLInputElement | null;
const micCheck = document.getElementById("mic-check") as HTMLInputElement | null;
const cameraDevice = document.getElementById("camera-device");
const micDevice = document.getElementById("mic-device");
const cameraPanel = document.getElementById("camera-panel");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const cameraState = document.getElementById("camera-state");
const micState = document.getElementById("mic-state");
const micPreview = document.getElementById("mic-preview");

let options: { withMic?: boolean; withCamera?: boolean } = {};
let stream: MediaStream | null = null,
  audio: AudioContext | null = null;
let animation = 0;
let camera: ReturnType<typeof startCameraSource> | null = null;
let cameraSession = "";

function release() {
  camera?.stop();
  camera = null;
  cancelAnimationFrame(animation);
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  void audio?.close().catch(() => {});
  audio = null;
}
function showError(value: unknown) {
  error.textContent = deviceError(value);
  error.hidden = false;
}
async function send(action: string, payload: Record<string, unknown> = {}) {
  const result = await chrome.runtime.sendMessage({ qa: "quick", action, nonce, ...payload });
  if (result.error) throw new Error(String(result.error));
  return result;
}

function isDeviceReady(el: HTMLElement | null) {
  return el?.dataset?.ready === "true";
}

function updateControls() {
  const withCamera = !!options.withCamera;
  const withMic = !!options.withMic;
  const hasSelected = withCamera || withMic;
  const cameraReady = !withCamera || isDeviceReady(cameraDevice);
  const micReady = !withMic || isDeviceReady(micDevice);
  const allReady = cameraReady && micReady;

  if (cameraState) {
    if (!withCamera) {
      cameraState.textContent = "Not selected";
    } else if (isDeviceReady(cameraDevice)) {
      cameraState.textContent = "Ready to record";
    } else {
      cameraState.textContent = "Waiting for access";
    }
  }

  if (micState) {
    if (!withMic) {
      micState.textContent = "Not selected";
    } else if (isDeviceReady(micDevice)) {
      micState.textContent = "Ready to record";
    } else {
      micState.textContent = "Waiting for access";
    }
  }

  if (cameraDevice?.dataset) {
    cameraDevice.dataset.selected = withCamera ? "true" : "false";
  }
  if (micDevice?.dataset) {
    micDevice.dataset.selected = withMic ? "true" : "false";
  }

  if (cameraPanel) {
    cameraPanel.hidden = !withCamera;
  }

  if (!hasSelected) {
    allow.disabled = true;
    allow.textContent = "No devices selected";
    start.disabled = false;
  } else if (allReady) {
    allow.disabled = false;
    allow.textContent = "Check devices again";
    start.disabled = false;
  } else {
    allow.disabled = false;
    allow.textContent = "Allow selected devices";
    start.disabled = true;
  }
}

function onCameraToggle(selected: boolean) {
  options.withCamera = selected;
  if (!selected) {
    cameraDevice?.removeAttribute("data-ready");
    if (camera) {
      camera.stop();
      camera = null;
    }
    video.srcObject = null;
    video.hidden = true;
    if (cameraPlaceholder) cameraPlaceholder.hidden = false;
    stream?.getVideoTracks().forEach((track) => track.stop());
  } else {
    cameraDevice?.removeAttribute("data-ready");
    if (cameraPlaceholder) cameraPlaceholder.hidden = false;
    video.hidden = true;
  }
  updateControls();
  void send("rec-setup-update", {
    withMic: !!options.withMic,
    withCamera: !!options.withCamera,
  }).catch(() => {});
}

function onMicToggle(selected: boolean) {
  options.withMic = selected;
  if (!selected) {
    micDevice?.removeAttribute("data-ready");
    if (micPreview) micPreview.hidden = true;
    cancelAnimationFrame(animation);
    void audio?.close().catch(() => {});
    audio = null;
    stream?.getAudioTracks().forEach((track) => track.stop());
  } else {
    micDevice?.removeAttribute("data-ready");
  }
  updateControls();
  void send("rec-setup-update", {
    withMic: !!options.withMic,
    withCamera: !!options.withCamera,
  }).catch(() => {});
}

if (cameraCheck) {
  cameraCheck.onchange = () => {
    onCameraToggle(!!cameraCheck.checked);
  };
}
if (micCheck) {
  micCheck.onchange = () => {
    onMicToggle(!!micCheck.checked);
  };
}

allow.onclick = async () => {
  if (!options.withMic && !options.withCamera) return;
  allow.disabled = true;
  start.disabled = true;
  error.hidden = true;
  for (const id of ["mic-device", "camera-device"])
    document.getElementById(id)!.removeAttribute("data-ready");
  release();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: !!options.withMic,
      video: !!options.withCamera,
    });
    if (options.withCamera) {
      video.hidden = false;
      video.srcObject = stream;
      await video.play();
      document.getElementById("camera-placeholder")!.hidden = true;
      document.getElementById("camera-state")!.textContent = "Ready to record";
      document.getElementById("camera-device")!.dataset.ready = "true";
    }
    if (options.withMic) {
      document.getElementById("mic-state")!.textContent = "Ready to record";
      document.getElementById("mic-device")!.dataset.ready = "true";
      document.getElementById("mic-preview")!.hidden = false;
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      audio.createMediaStreamSource(stream).connect(analyser);
      await audio.resume();
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteTimeDomainData(samples);
        meter.value = Math.min(
          100,
          Math.max(...samples.map((value) => Math.abs(value - 128))) * 3
        );
        animation = requestAnimationFrame(update);
      };
      update();
    }
    updateControls();
  } catch (value) {
    release();
    showError(value);
  } finally {
    allow.disabled = false;
  }
};
start.onclick = async () => {
  start.disabled = true;
  allow.disabled = true;
  error.hidden = true;
  // Keep the original camera track alive. Only microphone ownership moves to
  // the offscreen recorder; camera capture stays in this extension tab.
  if (options.withCamera) {
    cancelAnimationFrame(animation);
    stream?.getAudioTracks().forEach((track) => track.stop());
    void audio?.close().catch(() => {});
    audio = null;
    document.getElementById("mic-preview")!.hidden = true;
  } else release();
  try {
    await send("rec-setup-start", {
      withMic: !!options.withMic,
      withCamera: !!options.withCamera,
    });
    if (!options.withCamera) {
      window.close();
      return;
    }
    document.querySelector("h1")!.textContent = "Your camera is on.";
    document.getElementById("setup-description")!.textContent =
      "Keep this tab open while recording. Your camera appears in the recorded tab.";
    document.getElementById("camera-state")!.textContent = "In use";
    (document.querySelector(".permission-note") as HTMLElement).hidden = true;
    document.querySelector(".note-detail")!.textContent =
      "You can finish from this page or the extension popup.";
    allow.hidden = true;
    start.disabled = false;
    start.textContent = "Finish recording";
    start.onclick = async () => {
      start.disabled = true;
      try {
        await send("rec-stop");
      } catch (value) {
        showError(value);
        start.disabled = false;
      }
    };
  } catch (value) {
    release();
    showError(value);
    allow.disabled = false;
  }
};
chrome.runtime.onMessage.addListener((input, sender, reply) => {
  const message = input as {
    qa?: string;
    nonce?: string;
    sessionId?: string;
    close?: boolean;
  };
  if (sender.id !== chrome.runtime.id) return;
  if (message.qa === "rec-camera-start" && message.nonce === nonce && message.sessionId) {
    camera?.stop();
    cameraSession = message.sessionId;
    try {
      if (!stream) throw new Error("Allow and preview your camera before recording.");
      camera = startCameraSource(
        stream,
        async (image) => {
          const result = await chrome.runtime.sendMessage({
            type: "REC_CAMERA_FRAME",
            sessionId: cameraSession,
            nonce,
            image,
          });
          if (!result?.ok) throw new Error("Camera frame was not accepted.");
        },
        (message) => {
          showError(new Error(message));
          void chrome.runtime
            .sendMessage({
              type: "REC_CAMERA_ERROR",
              sessionId: cameraSession,
              nonce,
              error: message,
            })
            .catch(() => {});
        }
      );
      void camera.ready
        .then(() => reply({ ok: true }))
        .catch((value) => reply({ ok: false, error: deviceError(value) }));
    } catch (value) {
      reply({ ok: false, error: deviceError(value) });
    }
    return true;
  }
  if (message.qa === "rec-camera-stop" && message.sessionId === cameraSession) {
    release();
    reply({ ok: true });
    if (message.close) window.close();
  }
});
window.addEventListener("pagehide", release);
void send("rec-setup-info")
  .then((result) => {
    options = result;
    if (cameraCheck) cameraCheck.checked = !!options.withCamera;
    if (micCheck) micCheck.checked = !!options.withMic;
    updateControls();
  })
  .catch((value) => {
    showError(value);
    allow.disabled = true;
  });
