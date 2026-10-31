export {};
const el = <T = HTMLDivElement>(id: string) => document.getElementById(id) as T;
const status = el("status"),
  start = el<HTMLButtonElement>("start"),
  shotButton = el<HTMLButtonElement>("screenshot"),
  viewer = el<HTMLSelectElement>("viewer");
let tabId: number | undefined,
  activity: { mode: "screenshot" | "testing"; tabId: number; state?: string } | null =
    null;
async function send(action: string, extra: Record<string, unknown> = {}) {
  const r = await chrome.runtime.sendMessage({ qa: "quick", action, tabId, ...extra });
  if (r.error) throw new Error(String(r.error));
  return r;
}
const run = (fn: () => Promise<unknown>) =>
  void fn().catch((e) => {
    status.textContent = e instanceof Error ? e.message : "Action failed.";
  });
function glyph(id: string, name: string) {
  el(id).innerHTML = window.ramupodUI?.icon(name) ?? "";
}
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  const saved = await chrome.storage.local.get("qa-viewer");
  if (saved["qa-viewer"] === "http://localhost:3000")
    viewer.value = "http://localhost:3000";
  const result = await send("status");
  activity = (result.activity ?? null) as typeof activity;
  const elsewhere = !!activity && activity.tabId !== tabId;
  el("elsewhere").hidden = !elsewhere;
  el("modes").hidden = elsewhere;
  el("settings").hidden = elsewhere;
  const screenshot = activity?.mode === "screenshot",
    testing = activity?.mode === "testing";
  el("shot-label").textContent = screenshot
    ? "Exit Screenshot Mode"
    : "Capture screenshot";
  el("shot-hint").textContent = screenshot
    ? "Cancel selection or close the editor"
    : "Select an area, annotate, download";
  el("test-label").textContent = testing
    ? activity?.state === "stopped"
      ? "Review unfinished session"
      : "Continue testing"
    : "Start testing";
  el("test-hint").textContent = testing
    ? `${activity?.state === "paused" ? "Paused" : activity?.state === "recording" ? "Capture in progress" : "Stopped · finish or cancel below"} · return to controls`
    : "Requests, screenshots & evidence";
  shotButton.disabled = testing;
  start.disabled = screenshot;
  el("session-actions").hidden = !testing;
  viewer.disabled = !!activity;
  el("export").hidden = !result.session;
  status.textContent = String(result.error ?? "");
  glyph("shot-icon", screenshot ? "close" : "camera");
  el("shot-icon").classList.toggle("destructive", screenshot);
  glyph("test-icon", testing ? "play" : "network");
}
shotButton.onclick = () =>
  run(async () => {
    shotButton.disabled = true;
    try {
      await send(activity?.mode === "screenshot" ? "shot-exit" : "shot-start");
      window.close();
    } finally {
      shotButton.disabled = false;
    }
  });
start.onclick = () =>
  run(async () => {
    start.disabled = true;
    try {
      if (activity?.mode === "testing") await send("back");
      else await send("start", { origin: viewer.value });
      window.close();
    } finally {
      start.disabled = false;
    }
  });
el("back").onclick = () =>
  run(async () => {
    await send("back");
    window.close();
  });
el("finish").onclick = () =>
  run(async () => {
    await send("finish");
    window.close();
  });
el("cancel").onclick = () =>
  run(async () => {
    await send("clear");
    await init();
  });
el("clear").onclick = () =>
  run(async () => {
    await send("clear");
    await init();
  });
el("export").onclick = () =>
  run(async () => {
    const r = await send("export"),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(r.package, null, 2)], { type: "application/json" })
      );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ramupod-capture.ramupod.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
void init().catch((e) => {
  status.textContent = String(e);
});
