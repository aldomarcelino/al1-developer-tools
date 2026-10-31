import { CaptureController } from "./capture.ts";
import type { PanelApi } from "./api.ts";
import { validatePackage } from "../../../features/qa-bug-report/lib/validate.ts";
import { packageSession } from "../../../features/qa-bug-report/lib/model.ts";
const key = `ramupod-qa-tab-${chrome.devtools.inspectedWindow.tabId}`;
const listeners = new Set<Parameters<PanelApi["subscribe"]>[0]>();
let writeQueue = Promise.resolve();
let revision = 0;
let storageError = "";
const controller = new CaptureController((session) => {
  listeners.forEach((listener) =>
    listener(
      session && storageError
        ? { ...session, notices: [...session.notices, storageError] }
        : session
    )
  );
  const current = revision;
  if (session) {
    const snapshot = packageSession(session, true);
    writeQueue = writeQueue
      .then(async () => {
        if (current !== revision) return;
        await chrome.storage.local.set({ [key]: snapshot });
        storageError = "";
      })
      .catch(() => {
        storageError =
          "Local recovery storage failed. Export this session before closing DevTools.";
        listeners.forEach((listener) => listener(api.snapshot()));
      });
  }
});
const restoreRevision = revision;
const ready = chrome.storage.local
  .get(key)
  .then((saved) => {
    if (saved[key] && revision === restoreRevision)
      controller.recover(validatePackage(saved[key]).session);
  })
  .catch(() => {
    storageError =
      "Previous local recovery snapshot was unavailable or invalid. Start a new capture.";
  });
const api: PanelApi = {
  snapshot: () => {
    const s = controller.snapshot();
    if (s && storageError) s.notices = [...s.notices, storageError];
    return s;
  },
  start: async (environment, build) => {
    const requestedRevision = revision;
    await ready;
    const meta = await new Promise<{ url: string; userAgent: string; platform: string }>(
      (resolve, reject) => {
        // Fixed, read-only metadata expression; user strings are never evaluated.
        chrome.devtools.inspectedWindow.eval(
          "({url:location.href,userAgent:navigator.userAgent,platform:navigator.platform})",
          (value, error) => {
            if (error?.isException || !value || typeof value !== "object") {
              reject(
                new Error("Cannot inspect this page. Use an HTTP(S) application tab.")
              );
              return;
            }
            const m = value as Record<string, unknown>;
            if (
              typeof m.url !== "string" ||
              typeof m.userAgent !== "string" ||
              typeof m.platform !== "string"
            ) {
              reject(new Error("Tab metadata unavailable."));
              return;
            }
            resolve({ url: m.url, userAgent: m.userAgent, platform: m.platform });
          }
        );
      }
    );
    if (requestedRevision !== revision)
      throw new Error("Start was cancelled because the session changed.");
    if (controller.snapshot()?.state === "recording")
      throw new Error("Stop the current recording before starting another session.");
    revision++;
    controller.start({
      ...meta,
      tabId: chrome.devtools.inspectedWindow.tabId,
      environment,
      build,
    });
  },
  stop: () => {
    revision++;
    controller.stop();
  },
  clear: async () => {
    revision++;
    controller.clear();
    const deletion = writeQueue.then(() => chrome.storage.local.remove(key));
    writeQueue = deletion.catch(() => {
      storageError =
        "Could not delete the local recovery snapshot. Please try Clear again.";
    });
    await deletion;
  },
  clearAll: async () => {
    revision++;
    controller.clear();
    const deletion = writeQueue.then(() => chrome.storage.local.clear());
    writeQueue = deletion.catch(() => {
      storageError = "Could not delete local recovery snapshots. Please try again.";
    });
    await deletion;
  },
  mark: (description) => controller.mark(description),
  export: () => controller.export(),
  subscribe: (listener) => {
    listeners.add(listener);
    void ready.then(() => {
      if (listeners.has(listener)) listener(api.snapshot());
    });
    return () => listeners.delete(listener);
  },
};
chrome.devtools.network.onRequestFinished.addListener((request) =>
  controller.accept(request, (done) => request.getContent(done))
);
chrome.devtools.network.onNavigated.addListener((url) => controller.navigate(url));
chrome.devtools.panels.create("Ramupod QA", "", "panel.html", (panel) =>
  panel.onShown.addListener((panelWindow) => {
    panelWindow.qaCapture = api;
    panelWindow.dispatchEvent(new Event("qa-ready"));
  })
);
window.addEventListener("pagehide", () => {
  revision++;
  controller.stop(
    "stopped",
    "DevTools closed. Recovery contains the last persisted local snapshot."
  );
});
