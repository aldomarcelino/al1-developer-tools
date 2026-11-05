import { deviceError } from "./device-errors.ts";
import { startCameraSource } from "./camera-source.ts";

const nonce = new URLSearchParams(location.hash.slice(1)).get("request");
const allow = document.getElementById("allow-devices") as HTMLButtonElement;
const start = document.getElementById("start-countdown") as HTMLButtonElement;
const error = document.getElementById("setup-error")!;
const video = document.getElementById("camera-preview") as HTMLVideoElement;
const meter = document.getElementById("mic-level") as HTMLMeterElement;
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
async function send(action: string) {
  const result = await chrome.runtime.sendMessage({ qa: "quick", action, nonce });
  if (result.error) throw new Error(String(result.error));
  return result;
}
allow.onclick = async () => {
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
    allow.textContent = "Check devices again";
    start.disabled = false;
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
    await send("rec-setup-start");
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
    document.getElementById("mic-device")!.hidden = !options.withMic;
    document.getElementById("camera-device")!.hidden = !options.withCamera;
    document.getElementById("camera-panel")!.hidden = !options.withCamera;
  })
  .catch((value) => {
    showError(value);
    allow.disabled = true;
  });
