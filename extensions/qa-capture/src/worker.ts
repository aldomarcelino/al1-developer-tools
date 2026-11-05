import { CaptureController } from "./capture.ts";
import { NetworkCapture, object } from "./network.ts";
import { validRecipient, viewerOrigin, VIEWER_PATH } from "./handoff.ts";
import { curlFor } from "../../../features/qa-bug-report/lib/report.ts";
import { validatePackage } from "../../../features/qa-bug-report/lib/validate.ts";
import {
  packageSession,
  limits,
  type Attachment,
} from "../../../features/qa-bug-report/lib/model.ts";
const KEY = "ramupod-quick-capture";
let active: {
  tabId: number;
  origin: string;
  controller: CaptureController;
  network: NetworkCapture;
} | null = null;
let testOpen = false;
let shot: { tabId: number; token: string; phase: "selecting" | "editing" } | null = null;
const SHOT_KEY = "ramupod-screenshot-mode";
const REC_KEY = "ramupod-recording-session";
const REC_HANDOFF_KEY = "ramupod-recording-handoff";
const REC_SETUP_KEY = "ramupod-recording-setup";
type RecordingSetup = {
  nonce: string;
  tabId: number;
  sourceTabId: number;
  origin: string;
  withMic: boolean;
  withCamera: boolean;
  expires: number;
};

let activeRec: {
  tabId: number;
  origin: string;
  state: "recording" | "paused" | "stopped";
  startedAt: number;
  pausedAt?: number;
  totalPausedDuration?: number;
  withCamera: boolean;
  withMic: boolean;
  controlsVisible: boolean;
  streamId: string;
  sessionId: string;
  duration?: number;
  error?: string;
  cameraTabId?: number;
  cameraNonce?: string;
  cameraError?: string;
} | null = null;

let recHandoff: {
  nonce: string;
  duration: number;
  mimeType: string;
  extension: string;
  expires: number;
  tabId: number;
  origin: string;
} | null = null;

async function storeRecording() {
  if (activeRec) await chrome.storage.session.set({ [REC_KEY]: activeRec });
  else await chrome.storage.session.remove(REC_KEY);
}
async function syncRecording() {
  if (!activeRec) {
    const saved = object((await chrome.storage.session.get(REC_KEY))[REC_KEY]);
    if (
      typeof saved.tabId === "number" &&
      typeof saved.origin === "string" &&
      typeof saved.sessionId === "string"
    ) {
      activeRec = saved as NonNullable<typeof activeRec>;
    }
  }
  if (!activeRec) return;
  if (!(await chrome.offscreen?.hasDocument?.())) {
    activeRec = null;
    await storeRecording();
    return;
  }
  let status: Record<string, unknown>;
  try {
    status = await sendOffscreen({ type: "REC_OFFSCREEN_STATUS" });
  } catch {
    // An extension reload can leave metadata for a document that no longer has
    // a listener. Clear that stale session rather than surfacing a raw port error.
    activeRec = null;
    await storeRecording();
    return;
  }
  if (!status.hasRecording || status.sessionId !== activeRec.sessionId) {
    activeRec = null;
    await storeRecording();
    return;
  }
  activeRec.state =
    status.state === "paused"
      ? "paused"
      : status.state === "recording"
        ? "recording"
        : "stopped";
  activeRec.startedAt = Number(status.startedAt);
  activeRec.pausedAt = Number(status.pausedAt) || 0;
  activeRec.totalPausedDuration = Number(status.totalPausedDuration) || 0;
  activeRec.duration = Number(status.duration) || 0;
  activeRec.error = typeof status.error === "string" ? status.error : "";
}

async function ensureOffscreen() {
  const hasDoc = await chrome.offscreen?.hasDocument?.();
  if (!hasDoc && chrome.offscreen) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Record tab media stream",
    });
  }
}
async function sendOffscreen(message: Record<string, unknown>) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const result = await chrome.runtime.sendMessage(message);
      if (result && typeof result.ok === "boolean") return result;
    } catch (error) {
      if (attempt === 19) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(
    "The recorder could not connect. Reload the extension and refresh the recorded tab before trying again."
  );
}
async function ensureRecordingOverlay(tabId: number) {
  try {
    const ping = (await chrome.tabs.sendMessage(tabId, { qa: "rec-overlay-ping" })) as
      { ok?: boolean } | undefined;
    if (ping?.ok) return;
  } catch {
    /* A refreshed extension may have left stale controls in the page. */
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.ramupodOverlayReady = false;
      },
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["ui.js", "overlay.js"],
    });
    const ping = (await chrome.tabs.sendMessage(tabId, { qa: "rec-overlay-ping" })) as
      { ok?: boolean } | undefined;
    if (!ping?.ok) throw new Error("No recorder listener");
  } catch {
    throw new Error(
      "Could not attach recording controls to this page. Refresh the tab, allow this extension on the site, then try again. Browser settings, Chrome Web Store, and other protected pages cannot be recorded."
    );
  }
}
async function stopRecordingCamera(close = true) {
  if (!activeRec || typeof activeRec.cameraTabId !== "number") return;
  const sessionId = activeRec.sessionId;
  activeRec.cameraTabId = undefined;
  activeRec.cameraNonce = undefined;
  await storeRecording();
  await chrome.runtime
    .sendMessage({ qa: "rec-camera-stop", sessionId, close })
    .catch(() => {});
}
async function recordingSetup(sender: QaSender, nonce: unknown) {
  const request = (await chrome.storage.session.get(REC_SETUP_KEY))[REC_SETUP_KEY] as
    RecordingSetup | undefined;
  if (
    !request ||
    request.nonce !== nonce ||
    request.expires < Date.now() ||
    sender.id !== chrome.runtime.id ||
    sender.tab?.id !== request.tabId ||
    !sender.url?.startsWith(chrome.runtime.getURL("setup.html"))
  ) {
    throw new Error(
      "This preparation page has expired. Open the extension in the tab you want to record and try again."
    );
  }
  return request;
}
async function storeShot() {
  if (shot) await chrome.storage.session.set({ [SHOT_KEY]: shot });
  else await chrome.storage.session.remove(SHOT_KEY);
}
let writeQueue = Promise.resolve(),
  error = "",
  updateTimer: ReturnType<typeof setTimeout> | undefined;
let handoff: { tabId: number; origin: string; nonce: string; expires: number } | null =
  null;
const persist = (value: unknown) => {
  writeQueue = writeQueue
    .then(() =>
      value
        ? chrome.storage.local.set({ [KEY]: value, "qa-test-open": testOpen })
        : chrome.storage.local.remove(KEY)
    )
    .catch(() => {
      error = "Local recovery storage failed. Download capture before closing Chrome.";
      if (active)
        void chrome.tabs
          .sendMessage(active.tabId, { qa: "quick-state", error })
          .catch(() => {});
    });
  return writeQueue;
};
function update() {
  if (!active) return;
  const s = active.controller.snapshot();
  if (!s) return;
  const target = active;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    if (active !== target) return;
    void persist(packageSession(target.controller.snapshot()!, true));
    void chrome.tabs
      .sendMessage(target.tabId, {
        qa: "quick-state",
        state: s.state,
        count: s.requests.length,
        errors: s.requests.filter(
          (r) => r.response.status === 0 || r.response.status >= 400
        ).length,
        startedAt: s.startedAt,
        images: s.attachments.length,
        error,
      })
      .catch(() => {});
  }, 150);
  if (!["recording", "paused"].includes(s.state))
    void chrome.debugger.detach({ tabId: target.tabId }).catch(() => {});
}
async function restore() {
  try {
    const saved = await chrome.storage.session.get(SHOT_KEY);
    const value = object(saved[SHOT_KEY]);
    if (
      typeof value.tabId === "number" &&
      typeof value.token === "string" &&
      ["selecting", "editing"].includes(String(value.phase))
    ) {
      try {
        await chrome.tabs.get(value.tabId);
        shot = value as typeof shot;
      } catch {
        await chrome.storage.session.remove(SHOT_KEY);
      }
    }
  } catch {
    /* No screenshot data is persisted. */
  }
  const stored = await chrome.storage.local.get(KEY);
  if (!stored[KEY]) return;
  try {
    const s = validatePackage(stored[KEY]).session;
    testOpen = (await chrome.storage.local.get("qa-test-open"))["qa-test-open"] !== false;
    const controller = new CaptureController(update);
    controller.recover(s);
    const origin = (await chrome.storage.local.get("qa-viewer"))["qa-viewer"];
    const tabId = s.tabId ?? -1;
    try {
      await chrome.tabs.get(tabId);
    } catch {
      testOpen = false;
      await chrome.storage.local.set({ "qa-test-open": false });
    }
    active = {
      tabId,
      origin: viewerOrigin(origin ?? "https://ramupod.com"),
      controller,
      network: new NetworkCapture(controller, (method, params) =>
        chrome.debugger.sendCommand({ tabId }, method, params)
      ),
    };
    // A worker restart never silently resumes an interrupted session.
    void chrome.debugger.detach({ tabId }).catch(() => {});
  } catch {
    error = "Saved quick capture could not be restored. Start a new session.";
  }
}
const ready = restore();
async function stop() {
  const current = active;
  if (!current) return;
  current.controller.stop();
  current.network.clear();
  await chrome.debugger.detach({ tabId: current.tabId }).catch(() => {});
  await persist(current.controller.export());
}
async function start(tabId: number, origin: unknown) {
  if (shot || (active && testOpen))
    throw new Error("Capture in progress. Finish or cancel it before starting another.");
  const destination = viewerOrigin(origin),
    tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:\/\//.test(tab.url))
    throw new Error("Open an HTTP(S) application tab first.");
  await chrome.debugger.attach({ tabId }, "1.3");
  handoff = null;
  error = "";
  try {
    const controller = new CaptureController(update),
      network = new NetworkCapture(controller, (method, params) =>
        chrome.debugger.sendCommand({ tabId }, method, params)
      );
    active = { tabId, origin: destination, controller, network };
    testOpen = true;
    controller.start(
      {
        url: tab.url,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        tabId,
        environment: "",
        build: "",
      },
      "extension-debugger"
    );
    await chrome.debugger.sendCommand({ tabId }, "Network.enable", {
      maxTotalBufferSize: 4 * 1024 * 1024,
      maxResourceBufferSize: limits.bodyBytes,
      maxPostDataSize: limits.bodyBytes,
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["ui.js", "overlay.js"],
    });
    await chrome.storage.local.set({ "qa-viewer": destination });
    await persist(controller.export());
  } catch (e) {
    await stop();
    throw e;
  }
}
async function finish() {
  if (!active) throw new Error("No quick capture to finish.");
  await stop();
  // Transfer remains local, bound to the newly created recipient tab and random nonce.
  const nonce = crypto.randomUUID();
  const tab = await chrome.tabs.create({
    url: `${active.origin}${VIEWER_PATH}#qa-capture=${nonce}`,
  });
  if (tab.id === undefined)
    throw new Error("Could not open Ramupod. Download the capture instead.");
  testOpen = false;
  await persist(active.controller.export());
  void chrome.tabs.sendMessage(active.tabId, { qa: "quick-remove" }).catch(() => {});
  handoff = {
    tabId: tab.id,
    origin: active.origin,
    nonce,
    expires: Date.now() + 5 * 60 * 1000,
  };
}
function callerTab(sender: QaSender, m: Record<string, unknown>) {
  const extensionPage = sender.url?.startsWith(chrome.runtime.getURL("")) && !sender.tab;
  const id = extensionPage ? m.tabId : sender.tab?.id;
  if (
    typeof id !== "number" ||
    sender.id !== chrome.runtime.id ||
    (!extensionPage && sender.frameId !== 0)
  )
    throw new Error("This capture control is not authorized.");
  return id;
}
async function handle(
  input: unknown,
  sender: QaSender
): Promise<Record<string, unknown>> {
  const m = object(input);
  await ready;
  if (typeof m.action === "string" && m.action.startsWith("rec-")) await syncRecording();
  if (m.action === "rec-open-setup") {
    if (activeRec || (active && testOpen) || shot)
      throw new Error("Finish or discard the current session first.");
    if (
      sender.id !== chrome.runtime.id ||
      !sender.url?.startsWith(chrome.runtime.getURL("popup.html")) ||
      typeof m.tabId !== "number"
    )
      throw new Error("Start recording from the extension popup.");
    const source = await chrome.tabs.get(m.tabId);
    if (!source.url || !/^https?:\/\/|^file:\/\//.test(source.url))
      throw new Error("Open a regular website tab before recording.");
    const nonce = crypto.randomUUID();
    const page = await chrome.tabs.create({
      url: chrome.runtime.getURL(`setup.html#request=${nonce}`),
    });
    if (typeof page.id !== "number")
      throw new Error("Could not open device preparation.");
    const request: RecordingSetup = {
      nonce,
      tabId: page.id,
      sourceTabId: m.tabId,
      origin: viewerOrigin(m.origin ?? "https://ramupod.com"),
      withMic: !!m.withMic,
      withCamera: !!m.withCamera,
      expires: Date.now() + 10 * 60 * 1000,
    };
    await chrome.storage.session.set({ [REC_SETUP_KEY]: request });
    return { ok: true };
  }
  if (m.action === "rec-setup-info") {
    const request = await recordingSetup(sender, m.nonce);
    return { withMic: request.withMic, withCamera: request.withCamera };
  }
  if (m.action === "rec-setup-start") {
    const request = await recordingSetup(sender, m.nonce);
    const result = await handle(
      {
        action: "rec-start",
        tabId: request.sourceTabId,
        origin: request.origin,
        withMic: request.withMic,
        withCamera: request.withCamera,
        cameraTabId: request.withCamera ? request.tabId : undefined,
        cameraNonce: request.withCamera ? request.nonce : undefined,
      },
      sender
    );
    await chrome.storage.session.remove(REC_SETUP_KEY);
    return result;
  }
  if (m.action === "rec-status") {
    const currentPause =
      activeRec?.state === "paused" && activeRec?.pausedAt
        ? Date.now() - activeRec.pausedAt
        : 0;
    const totalPaused = (activeRec?.totalPausedDuration ?? 0) + currentPause;
    return {
      recording: !!activeRec,
      state: activeRec?.state ?? "idle",
      startedAt: activeRec?.startedAt ?? 0,
      totalPaused,
      tabId: activeRec?.tabId,
      controlsVisible: activeRec?.controlsVisible ?? false,
      withCamera: activeRec?.withCamera ?? false,
      sessionId: activeRec?.sessionId,
      duration: activeRec?.duration ?? 0,
      warning: [activeRec?.error, activeRec?.cameraError].filter(Boolean).join(" "),
    };
  }
  if (m.action === "rec-handoff" || m.action === "rec-read") {
    if (!recHandoff)
      recHandoff = (await chrome.storage.session.get(REC_HANDOFF_KEY))[
        REC_HANDOFF_KEY
      ] as typeof recHandoff;
    if (
      !recHandoff ||
      recHandoff.nonce !== m.nonce ||
      Date.now() > recHandoff.expires ||
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      sender.tab?.id !== recHandoff.tabId ||
      new URL(sender.url ?? sender.tab?.url ?? "about:blank").origin !==
        recHandoff.origin ||
      new URL(sender.url ?? sender.tab?.url ?? "about:blank").pathname !==
        "/tools/screen-recorder"
    ) {
      throw new Error("Recording handoff expired or not found.");
    }
    if (m.action === "rec-read") {
      const chunk = await chrome.runtime.sendMessage({
        type: "REC_OFFSCREEN_READ",
        offset: m.offset,
      });
      if (!chunk.ok) throw new Error(String(chunk.error));
      return chunk;
    }
    const recording = await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_STOP" });
    if (!recording.ok || !recording.byteLength)
      throw new Error(
        String(
          recording.error ?? "Video is not ready. Try Finish again from the extension."
        )
      );
    const result = {
      byteLength: recording.byteLength,
      duration: recHandoff.duration,
      mimeType: recHandoff.mimeType,
      extension: recHandoff.extension,
    };
    return result;
  }
  if (m.action === "rec-ack") {
    const pending =
      recHandoff ??
      ((await chrome.storage.session.get(REC_HANDOFF_KEY))[
        REC_HANDOFF_KEY
      ] as typeof recHandoff);
    if (
      !pending ||
      pending.nonce !== m.nonce ||
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      sender.tab?.id !== pending.tabId
    ) {
      throw new Error("This recording delivery is not authorized.");
    }
    await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_CANCEL" });
    await chrome.offscreen?.closeDocument?.();
    activeRec = null;
    recHandoff = null;
    await storeRecording();
    await chrome.storage.session.remove(REC_HANDOFF_KEY);
    return { ok: true };
  }
  if (m.action === "rec-start") {
    if ((active && testOpen) || shot || activeRec) {
      throw new Error("Another capture or recording session is already active.");
    }
    const targetTabId = typeof m.tabId === "number" ? m.tabId : sender.tab?.id;
    if (typeof targetTabId !== "number") throw new Error("No active tab to record.");
    if (!chrome.tabCapture) throw new Error("Tab capture API not available.");

    const targetTab = await chrome.tabs.get(targetTabId);
    if (!targetTab.url || !/^https?:\/\/|^file:\/\//.test(targetTab.url)) {
      throw new Error(
        "Cannot record browser system pages (chrome://). Please open a regular website or web application tab to record."
      );
    }

    if (m.withCamera) {
      const request = await recordingSetup(sender, m.cameraNonce);
      if (!request.withCamera || m.cameraTabId !== request.tabId)
        throw new Error("Check the camera from the device setup page before recording.");
    }
    const sessionId = crypto.randomUUID();
    activeRec = {
      tabId: targetTabId,
      origin: viewerOrigin(m.origin ?? "https://ramupod.com"),
      state: "recording",
      startedAt: Date.now(),
      withCamera: !!m.withCamera,
      withMic: !!m.withMic,
      controlsVisible: false,
      streamId: "",
      sessionId,
      cameraTabId: m.withCamera ? Number(m.cameraTabId) : undefined,
      cameraNonce: m.withCamera ? String(m.cameraNonce) : undefined,
    };
    await storeRecording();
    try {
      await chrome.tabs.update(targetTabId, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true });
      await ensureRecordingOverlay(targetTabId);
      if (m.withCamera) {
        // Arm the overlay before accepting the first frame from the camera tab.
        await chrome.tabs.sendMessage(targetTabId, {
          qa: "rec-overlay-init",
          sessionId,
          withCamera: true,
          startedAt: activeRec.startedAt,
          controlsVisible: false,
        });
        const camera = (await chrome.runtime.sendMessage({
          qa: "rec-camera-start",
          sessionId,
          nonce: activeRec.cameraNonce,
        })) as { ok?: boolean; error?: string } | undefined;
        if (!camera?.ok)
          throw new Error(camera?.error ?? "Camera setup could not provide live frames.");
      }
      await ensureOffscreen();
      const prepared = await sendOffscreen({
        type: "REC_OFFSCREEN_PREPARE_DEVICES",
        sessionId,
        withMic: !!m.withMic,
        withCamera: false,
      });
      if (!prepared.ok) throw new Error(String(prepared.error));
      const countdown = (await chrome.tabs.sendMessage(targetTabId, {
        qa: "rec-countdown",
        sessionId,
        withCamera: !!m.withCamera,
      })) as { ok?: boolean; cancelled?: boolean } | undefined;
      if (!countdown?.ok)
        throw new Error(
          countdown?.cancelled
            ? "Recording cancelled before it started."
            : "The page changed during countdown. Return to the tab and try again."
        );
      // Obtain the short-lived stream ID only after preparation and countdown.
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId });
      activeRec.streamId = streamId;
      const started = await sendOffscreen({
        type: "REC_OFFSCREEN_START",
        streamId,
        sessionId,
        withMic: !!m.withMic,
        withCamera: false,
      });
      if (!started.ok) throw new Error(String(started.error));
      activeRec.startedAt = Number(started.startedAt) || Date.now();
      await storeRecording();
      await chrome.tabs.sendMessage(targetTabId, {
        qa: "rec-overlay-init",
        sessionId,
        withCamera: !!m.withCamera,
        startedAt: activeRec.startedAt,
        controlsVisible: false,
      });
      void chrome.action?.setBadgeText?.({ text: "REC" });
      void chrome.action?.setBadgeBackgroundColor?.({ color: "#e53945" });
      return { ok: true };
    } catch (error) {
      await stopRecordingCamera(false);
      await chrome.runtime
        .sendMessage({ type: "REC_OFFSCREEN_CANCEL", sessionId })
        .catch(() => {});
      await chrome.tabs
        .sendMessage(targetTabId, { qa: "rec-overlay-remove" })
        .catch(() => {});
      activeRec = null;
      await storeRecording();
      if (
        error instanceof Error &&
        /receiving end|establish connection|message port/i.test(error.message)
      ) {
        throw new Error(
          "The recorder lost its connection to the tab. Refresh the tab and start again from the extension popup."
        );
      }
      throw error;
    }
  }

  if (m.action === "rec-set-controls") {
    if (!activeRec) throw new Error("No recording in progress.");
    const extensionPage =
      sender.url?.startsWith(chrome.runtime.getURL("")) && !sender.tab;
    if (
      sender.id !== chrome.runtime.id ||
      (!extensionPage && (sender.tab?.id !== activeRec.tabId || sender.frameId !== 0))
    ) {
      throw new Error("This recording control is not authorized.");
    }
    if (typeof m.visible !== "boolean")
      throw new Error("Choose whether to show controls.");
    await ensureRecordingOverlay(activeRec.tabId);
    await chrome.tabs.sendMessage(activeRec.tabId, {
      qa: "rec-overlay-visibility",
      visible: m.visible,
    });
    activeRec.controlsVisible = m.visible;
    await storeRecording();
    return { ok: true, controlsVisible: activeRec.controlsVisible };
  }
  if (m.action === "rec-toggle-pause") {
    if (!activeRec) throw new Error("No recording in progress.");
    if (activeRec.state === "stopped")
      throw new Error("Recording has stopped. Finish to recover the video.");
    if (activeRec.state === "recording") {
      const result = await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_PAUSE" });
      if (!result.ok) throw new Error(String(result.error));
      activeRec.state = "paused";
      activeRec.pausedAt = Date.now();
      void chrome.tabs.sendMessage(activeRec.tabId, {
        qa: "rec-overlay-state",
        state: "paused",
      });
    } else {
      const result = await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_RESUME" });
      if (!result.ok) throw new Error(String(result.error));
      activeRec.state = "recording";
      if (activeRec.pausedAt) {
        activeRec.totalPausedDuration =
          (activeRec.totalPausedDuration ?? 0) + (Date.now() - activeRec.pausedAt);
        activeRec.pausedAt = 0;
      }
      void chrome.tabs.sendMessage(activeRec.tabId, {
        qa: "rec-overlay-state",
        state: "recording",
      });
    }
    await storeRecording();
    return { ok: true, state: activeRec.state };
  }
  if (m.action === "rec-stop") {
    if (!activeRec) throw new Error("No recording in progress.");
    const targetOrigin = activeRec.origin;
    const targetTabId = activeRec.tabId;

    const res = (await chrome.runtime.sendMessage({
      type: "REC_OFFSCREEN_STOP",
      includeBuffer: false,
    })) as {
      ok?: boolean;
      buffer?: number[];
      duration?: number;
      mimeType?: string;
      extension?: string;
      error?: string;
    };

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to package recording");
    }
    activeRec.state = "stopped";
    await stopRecordingCamera();
    await storeRecording();
    void chrome.action?.setBadgeText?.({ text: "" });
    void chrome.tabs
      .sendMessage(targetTabId, { qa: "rec-overlay-remove" })
      .catch(() => {});

    const nonce = crypto.randomUUID();
    const recipient = await chrome.tabs.create({
      url: `${targetOrigin}/tools/screen-recorder#companion-recording=${nonce}`,
    });
    if (typeof recipient.id !== "number")
      throw new Error(
        "Could not open the viewer. Your video is retained; try Finish again."
      );
    recHandoff = {
      nonce,
      duration: res.duration ?? 0,
      mimeType: res.mimeType ?? "video/webm",
      extension: res.extension ?? "webm",
      expires: Date.now() + 5 * 60 * 1000,
      tabId: recipient.id,
      origin: targetOrigin,
    };
    await chrome.storage.session.set({ [REC_HANDOFF_KEY]: recHandoff });
    return { ok: true, nonce };
  }
  if (m.action === "rec-cancel") {
    if (!activeRec) return { ok: true };
    await stopRecordingCamera();
    void chrome.action?.setBadgeText?.({ text: "" });
    void chrome.tabs
      .sendMessage(activeRec.tabId, { qa: "rec-overlay-remove" })
      .catch(() => {});
    await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_CANCEL" });
    void chrome.offscreen?.closeDocument?.().catch(() => {});
    activeRec = null;
    recHandoff = null;
    await storeRecording();
    await chrome.storage.session.remove(REC_HANDOFF_KEY);
    return { ok: true };
  }
  if (m.action === "handoff") {
    if (
      !handoff ||
      !active ||
      !validRecipient(sender, chrome.runtime.id, handoff, m.nonce)
    )
      throw new Error(
        "Capture handoff expired or recipient does not match. Download and import the capture instead."
      );
    const result = active.controller.export();
    // Consumed only after the web viewer acknowledges successful validation.
    return { package: result };
  }
  if (m.action === "ack") {
    if (!handoff || !validRecipient(sender, chrome.runtime.id, handoff, m.nonce))
      throw new Error("Invalid handoff acknowledgment.");
    handoff = null;
    return { ok: true };
  }
  const tabId = callerTab(sender, m);
  const extensionPage = sender.url?.startsWith(chrome.runtime.getURL("")) && !sender.tab;
  if (m.action === "clear" && (extensionPage || active?.tabId === tabId)) {
    const owner = active?.tabId;
    await stop();
    clearTimeout(updateTimer);
    // Removing must fail visibly; never claim that a failed deletion succeeded.
    await writeQueue;
    await chrome.storage.local.remove(KEY);
    active = null;
    testOpen = false;
    handoff = null;
    error = "";
    if (owner !== undefined)
      void chrome.tabs.sendMessage(owner, { qa: "quick-remove" }).catch(() => {});
    return { ok: true };
  }
  if (m.action === "back") {
    if (!extensionPage) throw new Error("Use the extension popup to return to capture.");
    const owner = shot?.tabId ?? (testOpen ? active?.tabId : undefined);
    if (owner === undefined) throw new Error("No capture in progress.");
    const tab = await chrome.tabs.update(owner, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    if (!shot)
      await chrome.scripting
        .executeScript({ target: { tabId: owner }, files: ["ui.js", "overlay.js"] })
        .catch(() => {});
    return { ok: true };
  }
  if (m.action === "shot-start") {
    if (shot || (active && testOpen))
      throw new Error("Capture in progress. Finish or cancel it first.");
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^https?:\/\//.test(tab.url))
      throw new Error("Open an HTTP(S) page to take a screenshot.");
    shot = { tabId, token: crypto.randomUUID(), phase: "selecting" };
    await storeShot();
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["ui.js", "screenshot.js"],
      });
    } catch (e) {
      shot = null;
      await storeShot();
      throw e;
    }
    return { ok: true };
  }
  if (m.action === "shot-exit") {
    if (!shot) return { ok: true };
    if (!extensionPage && (shot.tabId !== tabId || m.token !== shot.token))
      throw new Error("Screenshot belongs to another tab.");
    const owner = shot.tabId;
    shot = null;
    await storeShot();
    void chrome.tabs.sendMessage(owner, { qa: "shot-remove" }).catch(() => {});
    return { ok: true };
  }
  if (m.action === "shot-image") {
    if (!shot || shot.tabId !== tabId || m.token !== shot.token)
      throw new Error("Screenshot mode is no longer active.");
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) throw new Error("Return to the capture tab first.");
    shot.phase = "editing";
    await storeShot();
    return {
      image: await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
    };
  }
  const recovered = extensionPage && active?.controller.snapshot()?.state !== "recording";
  if (m.action === "start") {
    await start(tabId, m.origin);
    return { ok: true };
  }
  if (m.action === "status")
    return {
      session:
        active && (active.tabId === tabId || recovered)
          ? active.controller.snapshot()
          : null,
      activity: shot
        ? {
            mode: "screenshot",
            tabId: shot.tabId,
            token: shot.tabId === tabId ? shot.token : undefined,
            phase: shot.phase,
          }
        : active && testOpen
          ? {
              mode: "testing",
              tabId: active.tabId,
              state: active.controller.snapshot()?.state,
            }
          : null,
      error,
    };
  if (activeRec && activeRec.tabId === tabId) {
    if (m.action === "pause" || m.action === "resume") {
      return handle({ ...m, action: "rec-toggle-pause" }, sender);
    }
    if (m.action === "finish" || m.action === "stop") {
      return handle({ ...m, action: "rec-stop" }, sender);
    }
    if (m.action === "clear" || m.action === "cancel") {
      return handle({ ...m, action: "rec-cancel" }, sender);
    }
  }
  if (!active || (active.tabId !== tabId && !recovered))
    throw new Error(
      "This tab has no quick capture. Click the extension and Start testing."
    );
  if (m.action === "pause") {
    if (active.controller.snapshot()?.state !== "recording")
      throw new Error("Capture is not recording.");
    active.controller.pause();
    active.network.clear();
    await chrome.debugger.sendCommand({ tabId: active.tabId }, "Network.disable");
    await persist(active.controller.export());
    return { ok: true };
  }
  if (m.action === "resume") {
    if (active.controller.snapshot()?.state !== "paused")
      throw new Error("Capture is not paused.");
    active.network.clear();
    await chrome.debugger.sendCommand({ tabId: active.tabId }, "Network.enable", {
      maxTotalBufferSize: 4 * 1024 * 1024,
      maxResourceBufferSize: limits.bodyBytes,
      maxPostDataSize: limits.bodyBytes,
    });
    active.controller.resume();
    await persist(active.controller.export());
    return { ok: true };
  }
  if (m.action === "stop") {
    await stop();
    return { ok: true };
  }
  if (m.action === "finish") {
    await finish();
    return { ok: true };
  }
  if (m.action === "export") return { package: active.controller.export() };
  if (m.action === "mark") {
    active.controller.mark(
      typeof m.description === "string" ? m.description : "Bug marked"
    );
    return { ok: true };
  }
  if (m.action === "toggle-request") {
    if (typeof m.id !== "string") throw new Error("Choose a captured request.");
    const selected = active.controller.toggleRequest(m.id);
    await persist(active.controller.export());
    return { selected };
  }
  if (m.action === "requests") {
    const s = active.controller.snapshot()!;
    return {
      requests: s.requests
        .slice(-100)
        .reverse()
        .map((r) => ({
          id: r.id,
          method: r.method,
          url: r.url,
          status: r.response.status,
          bodyStatus: r.response.body.status,
          response: r.response.body.text.slice(0, 1500),
          curl: curlFor(r),
          selected: s.report.requestIds.includes(r.id),
        })),
    };
  }
  if (m.action === "screenshot") {
    if (!["recording", "paused"].includes(active.controller.snapshot()?.state ?? ""))
      throw new Error("Start testing before taking a screenshot.");
    if (active.controller.snapshot()!.attachments.length >= limits.screenshots)
      throw new Error("Two-screenshot limit reached.");
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active)
      throw new Error("Return to the captured tab before taking a screenshot.");
    return {
      image: await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
      sessionId: active.controller.snapshot()!.id,
    };
  }
  if (m.action === "save-image") {
    const s = active.controller.snapshot()!,
      data = typeof m.data === "string" ? m.data : "";
    if (
      m.sessionId !== s.id ||
      !["recording", "paused"].includes(s.state) ||
      !data.startsWith("data:image/png;base64,")
    )
      throw new Error("Screenshot session is no longer active.");
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      sessionId: s.id,
      name: `annotated-${s.attachments.length + 1}.png`,
      mimeType: "image/png",
      base64: data.slice(22),
      reviewed: true,
    };
    // Reuse the same signature/type/size/reference validator as imported packages.
    validatePackage(
      packageSession({ ...s, attachments: [...s.attachments, attachment] }, true)
    );
    active.controller.attach(attachment);
    active.controller.mark(
      typeof m.note === "string" && m.note.trim()
        ? `Screenshot: ${m.note.slice(0, 500)}`
        : `Screenshot ${s.attachments.length + 1} reviewed and saved`
    );
    await persist(active.controller.export());
    return { ok: true };
  }
  throw new Error("Unknown capture action.");
}
let actionQueue = Promise.resolve();
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  const message = object(m);
  if (message.type === "REC_CAPTURE_STOPPED") {
    if (
      sender.id !== chrome.runtime.id ||
      sender.url !== chrome.runtime.getURL("offscreen.html")
    )
      return;
    void (async () => {
      await ready;
      if (!activeRec) await syncRecording();
      if (!activeRec || activeRec.sessionId !== message.sessionId) return;
      activeRec.state = "stopped";
      await stopRecordingCamera();
      await storeRecording();
    })()
      .then(() => reply({ ok: true }))
      .catch(() => reply({ ok: false }));
    return true;
  }
  if (message.type === "REC_CAMERA_FRAME" || message.type === "REC_CAMERA_ERROR") {
    if (
      sender.id !== chrome.runtime.id ||
      !sender.url?.startsWith(chrome.runtime.getURL("setup.html"))
    ) {
      reply({ ok: false });
      return;
    }
    void (async () => {
      await ready;
      if (!activeRec) await syncRecording();
      if (
        !activeRec ||
        message.sessionId !== activeRec.sessionId ||
        sender.tab?.id !== activeRec.cameraTabId ||
        message.nonce !== activeRec.cameraNonce
      ) {
        reply({ ok: false });
        return;
      }
      if (message.type === "REC_CAMERA_ERROR") {
        activeRec.cameraError = String(message.error ?? "Camera interrupted.").slice(
          0,
          500
        );
        await storeRecording();
        await chrome.tabs
          .sendMessage(activeRec.tabId, { qa: "rec-camera-unavailable" })
          .catch(() => {});
        reply({ ok: true });
        return;
      }
      if (
        typeof message.image !== "string" ||
        message.image.length > 128 * 1024 ||
        !message.image.startsWith("data:image/jpeg;base64,")
      ) {
        reply({ ok: false });
        return;
      }
      await chrome.tabs.sendMessage(activeRec.tabId, {
        qa: "rec-camera-frame",
        sessionId: message.sessionId,
        image: message.image,
      });
      reply({ ok: true });
    })().catch(() => reply({ ok: false }));
    return true;
  }
  if (object(m).qa !== "quick") return;
  actionQueue = actionQueue.then(async () => {
    try {
      reply(await handle(m, sender));
    } catch (e) {
      reply({ error: e instanceof Error ? e.message : "Capture action failed" });
    }
  });
  return true;
});
chrome.debugger.onEvent.addListener((target, method, params) => {
  if (active && target.tabId === active.tabId) active.network.event(method, params);
});
chrome.debugger.onDetach.addListener((target, reason) => {
  if (active && target.tabId === active.tabId) {
    active.controller.stop(
      "stopped",
      `Chrome debugging detached (${reason}). Capture stopped; pending requests are unavailable.`
    );
    active.network.clear();
  }
});
chrome.tabs.onRemoved.addListener((id) => {
  if (id === activeRec?.cameraTabId) {
    activeRec.cameraError =
      "The camera setup tab was closed. Your screen recording continues.";
    activeRec.cameraTabId = undefined;
    activeRec.cameraNonce = undefined;
    void storeRecording();
    void chrome.tabs
      .sendMessage(activeRec.tabId, { qa: "rec-camera-unavailable" })
      .catch(() => {});
  }
  if (id === activeRec?.tabId) {
    void stopRecordingCamera();
    void chrome.action?.setBadgeText?.({ text: "" });
    const session = activeRec;
    void chrome.runtime
      .sendMessage({ type: "REC_OFFSCREEN_STOP", includeBuffer: false })
      .then(async (result) => {
        if (activeRec !== session) return;
        session.state = "stopped";
        session.error = result.ok
          ? "The recorded tab closed. Finish to recover your video."
          : String(result.error ?? "Recording was interrupted.");
        await storeRecording();
      })
      .catch(() => {});
  }
  if (id === active?.tabId) {
    void stop().then(() => {
      testOpen = false;
      return active ? persist(active.controller.export()) : undefined;
    });
  }
  if (id === shot?.tabId) {
    shot = null;
    void storeShot();
  }
  if (id === handoff?.tabId) handoff = null;
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === activeRec?.tabId && change.status === "complete") {
    // Reattach shortcuts and restore the visibility choice after tab navigation.
    void chrome.scripting
      .executeScript({
        target: { tabId: id },
        files: ["ui.js", "overlay.js"],
      })
      .catch(() => {});
  }
  if (id === shot?.tabId && change.status === "loading") {
    shot = null;
    void storeShot();
  }

  if (
    !active ||
    id !== active.tabId ||
    !["recording", "paused"].includes(active.controller.snapshot()?.state ?? "")
  )
    return;
  if (change.url) {
    try {
      if (
        new URL(change.url).origin !==
        new URL(active.controller.snapshot()!.pageUrl).origin
      ) {
        active.controller.stop(
          "stopped",
          "Navigation changed origin. Click the extension to Start again on the new site."
        );
        return;
      }
    } catch {
      active.controller.stop();
      return;
    }
    active.controller.navigate(change.url);
  }
  if (change.status === "complete")
    void chrome.scripting
      .executeScript({ target: { tabId: id }, files: ["ui.js", "overlay.js"] })
      .catch(() => {
        active?.controller.stop(
          "error",
          "Could not restore floating controls after navigation. Capture stopped."
        );
      });
});
