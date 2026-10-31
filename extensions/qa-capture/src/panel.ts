import type { PanelApi } from "./api.ts";
import type { Session } from "../../../features/qa-bug-report/lib/model.ts";
let api: PanelApi | undefined;
let unsubscribe: (() => void) | undefined;
let renderedSessionId: string | null = null;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element("status"),
  notice = element("notice"),
  count = element("count"),
  sessionId = element("session-id"),
  list = element("requests");
function render(session: Session | null) {
  status.textContent = session?.state ?? "idle";
  status.dataset.state = session?.state ?? "idle";
  const recording = session?.state === "recording";
  if (session?.id !== renderedSessionId) {
    element<HTMLInputElement>("environment").value = session?.environment.value ?? "";
    element<HTMLInputElement>("build").value = session?.build.value ?? "";
    if (!session) element<HTMLInputElement>("description").value = "";
    renderedSessionId = session?.id ?? null;
  }
  element<HTMLInputElement>("environment").disabled = recording;
  element<HTMLInputElement>("build").disabled = recording;
  element<HTMLButtonElement>("start").disabled = recording;
  element<HTMLButtonElement>("stop").disabled = !recording;
  element<HTMLButtonElement>("mark").disabled = !recording;
  element<HTMLButtonElement>("export").disabled = !session || recording;
  element<HTMLButtonElement>("clear").disabled = !session;
  count.textContent = `${session?.requests.length ?? 0} / 250 requests`;
  sessionId.textContent = session
    ? `Session ${session.id} · tab ${session.tabId}`
    : "No active session";
  notice.textContent =
    session?.notices.slice(-2).join(" ") ??
    "Open an HTTP(S) application tab, start capture, then reproduce the issue. Start creates a new session; export the previous session first.";
  list.replaceChildren();
  for (const request of [...(session?.requests ?? [])].reverse().slice(0, 25)) {
    const row = document.createElement("li");
    row.textContent = `${request.startedAt.slice(11, 23)}  ${request.method}  ${request.response.status || "Failed"}  ${request.response.body.status}  ${request.url}`;
    list.appendChild(row);
  }
  const markers = element("markers");
  markers.replaceChildren();
  for (const marker of session?.markers ?? []) {
    const li = document.createElement("li");
    li.textContent = `${marker.at.slice(11, 23)} — ${marker.description}`;
    markers.appendChild(li);
  }
}
function bind() {
  if (!window.qaCapture) return;
  api = window.qaCapture;
  unsubscribe?.();
  unsubscribe = api.subscribe(render);
  element("connection").textContent =
    "Connected to this tab’s DevTools. Capture stops when DevTools closes.";
  render(api.snapshot());
}
function message(text: string) {
  element("feedback").textContent = text;
}
async function action(work: () => void | Promise<void>) {
  try {
    await work();
  } catch (cause) {
    message(cause instanceof Error ? cause.message : "Capture action failed.");
  }
}
element("start").addEventListener(
  "click",
  () =>
    void action(async () => {
      if (!api)
        throw new Error("DevTools connection not ready. Reopen the Ramupod QA panel.");
      await api.start(
        element<HTMLInputElement>("environment").value,
        element<HTMLInputElement>("build").value
      );
      message("Recording this tab only. Run your scenario now.");
    })
);
element("stop").addEventListener("click", () => {
  api?.stop();
  message("Stopped. You can export this session.");
});
element("mark").addEventListener(
  "click",
  () =>
    void action(() => {
      api?.mark(element<HTMLInputElement>("description").value);
      element<HTMLInputElement>("description").value = "";
      message("Bug marker added to this capture session.");
    })
);
element("clear").addEventListener(
  "click",
  () =>
    void action(async () => {
      await api?.clear();
      message("This session and its local recovery snapshot were deleted.");
    })
);
element("clear-all").addEventListener(
  "click",
  () =>
    void action(async () => {
      await api?.clearAll();
      message(
        "All saved recovery snapshots removed. Other open DevTools panels can retain their own current session in memory."
      );
    })
);
element("export").addEventListener(
  "click",
  () =>
    void action(() => {
      if (!api) return;
      const data = api.export();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `qa-${data.session.id}.ramupod.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message(
        "Redacted session exported. Import it in Ramupod and review before sharing."
      );
    })
);
window.addEventListener("qa-ready", bind);
window.addEventListener("pagehide", () => unsubscribe?.());
bind();
