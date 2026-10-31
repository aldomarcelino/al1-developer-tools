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

let activeRec: {
  tabId: number;
  origin: string;
  state: "recording" | "paused";
  startedAt: number;
  pausedAt?: number;
  totalPausedDuration?: number;
  withCamera: boolean;
  withMic: boolean;
  streamId: string;
} | null = null;

let recHandoff: {
  nonce: string;
  buffer: number[];
  duration: number;
  mimeType: string;
  extension: string;
  expires: number;
} | null = null;

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
async function handle(input: unknown, sender: QaSender) {
  const m = object(input);
  await ready;
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
    };
  }
  if (m.action === "rec-handoff") {
    if (
      !recHandoff ||
      recHandoff.nonce !== m.nonce ||
      Date.now() > recHandoff.expires
    ) {
      throw new Error("Recording handoff expired or not found.");
    }
    const result = {
      blobData: recHandoff.buffer,
      duration: recHandoff.duration,
      mimeType: recHandoff.mimeType,
      extension: recHandoff.extension,
    };
    recHandoff = null;
    return result;
  }
  if (m.action === "rec-start") {
    if (active || shot || activeRec) {
      throw new Error("Another capture or recording session is already active.");
    }
    const targetTabId = typeof m.tabId === "number" ? m.tabId : sender.tab?.id;
    if (typeof targetTabId !== "number") throw new Error("No active tab to record.");
    if (!chrome.tabCapture) throw new Error("Tab capture API not available.");

    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId });
    await ensureOffscreen();

    const started = (await chrome.runtime.sendMessage({
      type: "REC_OFFSCREEN_START",
      streamId,
      withMic: !!m.withMic,
    })) as { ok?: boolean; error?: string };
    if (!started?.ok) throw new Error(started?.error || "Failed to start recorder");

    activeRec = {
      tabId: targetTabId,
      origin: typeof m.origin === "string" ? m.origin : "https://ramupod.com",
      state: "recording",
      startedAt: Date.now(),
      withCamera: !!m.withCamera,
      withMic: !!m.withMic,
      streamId,
    };

    void chrome.action?.setBadgeText?.({ text: "REC" });
    void chrome.action?.setBadgeBackgroundColor?.({ color: "#e53945" });

    await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      files: ["ui.js", "overlay.js"],
    });

    await chrome.tabs
      .sendMessage(targetTabId, {
        qa: "rec-overlay-init",
        withCamera: !!m.withCamera,
        startedAt: activeRec.startedAt,
      })
      .catch(() => {});

    return { ok: true };
  }
  if (m.action === "rec-toggle-pause") {
    if (!activeRec) throw new Error("No recording in progress.");
    if (activeRec.state === "recording") {
      await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_PAUSE" });
      activeRec.state = "paused";
      activeRec.pausedAt = Date.now();
      void chrome.tabs.sendMessage(activeRec.tabId, {
        qa: "rec-overlay-state",
        state: "paused",
      });
    } else {
      await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_RESUME" });
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
    return { ok: true, state: activeRec.state };
  }
  if (m.action === "rec-stop") {
    if (!activeRec) throw new Error("No recording in progress.");
    const targetOrigin = activeRec.origin;
    const targetTabId = activeRec.tabId;

    void chrome.action?.setBadgeText?.({ text: "" });
    void chrome.tabs
      .sendMessage(targetTabId, { qa: "rec-overlay-remove" })
      .catch(() => {});

    const res = (await chrome.runtime.sendMessage({
      type: "REC_OFFSCREEN_STOP",
    })) as {
      ok?: boolean;
      buffer?: number[];
      duration?: number;
      mimeType?: string;
      extension?: string;
      error?: string;
    };

    void chrome.offscreen?.closeDocument?.().catch(() => {});

    if (!res?.ok || !res.buffer) {
      activeRec = null;
      throw new Error(res?.error || "Failed to package recording");
    }

    const nonce = crypto.randomUUID();
    recHandoff = {
      nonce,
      buffer: res.buffer,
      duration: res.duration ?? 0,
      mimeType: res.mimeType ?? "video/webm",
      extension: res.extension ?? "webm",
      expires: Date.now() + 5 * 60 * 1000,
    };
    activeRec = null;

    await chrome.tabs.create({
      url: `${targetOrigin}/tools/screen-recorder#companion-recording=${nonce}`,
    });
    return { ok: true, nonce };
  }
  if (m.action === "rec-cancel") {
    if (!activeRec) return { ok: true };
    void chrome.action?.setBadgeText?.({ text: "" });
    void chrome.tabs
      .sendMessage(activeRec.tabId, { qa: "rec-overlay-remove" })
      .catch(() => {});
    await chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_CANCEL" });
    void chrome.offscreen?.closeDocument?.().catch(() => {});
    activeRec = null;
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
  if (id === activeRec?.tabId) {
    void chrome.action?.setBadgeText?.({ text: "" });
    void chrome.runtime.sendMessage({ type: "REC_OFFSCREEN_CANCEL" });
    void chrome.offscreen?.closeDocument?.().catch(() => {});
    activeRec = null;
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
