export {};

const el = <T = HTMLDivElement>(id: string) => document.getElementById(id) as T;

const TAB_STORAGE_KEY = "ramupod_active_tab";

const status = el("status"),
  start = el<HTMLButtonElement>("start"),
  shotButton = el<HTMLButtonElement>("screenshot"),
  viewer = el<HTMLSelectElement>("viewer");

const tabBtnRecorder = el<HTMLButtonElement>("tab-btn-recorder"),
  tabBtnQa = el<HTMLButtonElement>("tab-btn-qa"),
  panelRecorder = el("panel-recorder"),
  panelQa = el("panel-qa");

const btnStartTabRec = el<HTMLButtonElement>("btn-start-tab-rec"),
  recActiveSection = el("rec-active-section"),
  recIdleSection = el("rec-idle-section"),
  recTimerDisplay = el("rec-timer-display"),
  recPauseBtn = el<HTMLButtonElement>("rec-pause-btn"),
  recStopBtn = el<HTMLButtonElement>("rec-stop-btn"),
  recCancelBtn = el<HTMLButtonElement>("rec-cancel-btn"),
  btnOpenStudio = el<HTMLButtonElement>("btn-open-studio"),
  recOptMic = el<HTMLInputElement>("rec-opt-mic"),
  recOptCam = el<HTMLInputElement>("rec-opt-cam");

let tabId: number | undefined,
  activity: { mode: "screenshot" | "testing"; tabId: number; state?: string } | null =
    null,
  recActivity: {
    recording: boolean;
    state: string;
    startedAt: number;
    totalPaused?: number;
  } | null = null,
  timerInterval: ReturnType<typeof setInterval> | undefined;

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
  const target = el(id);
  if (target) {
    target.innerHTML = window.ramupodUI?.icon(name) ?? "";
  }
}

function switchTab(mode: "recorder" | "qa", save = true) {
  const isRec = mode === "recorder";
  tabBtnRecorder.classList.toggle("active", isRec);
  tabBtnRecorder.setAttribute("aria-selected", isRec ? "true" : "false");

  tabBtnQa.classList.toggle("active", !isRec);
  tabBtnQa.setAttribute("aria-selected", !isRec ? "true" : "false");

  panelRecorder.classList.toggle("active", isRec);
  panelQa.classList.toggle("active", !isRec);

  if (save) {
    void chrome.storage.local.set({ [TAB_STORAGE_KEY]: mode });
  }
}

function updateRecTimer() {
  if (!recActivity || !recActivity.recording) return;
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - recActivity.startedAt - (recActivity.totalPaused ?? 0)) / 1000)
  );
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  recTimerDisplay.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;

  const saved = await chrome.storage.local.get(["qa-viewer", TAB_STORAGE_KEY]);
  if (saved["qa-viewer"] === "http://localhost:3000") {
    viewer.value = "http://localhost:3000";
  } else if (saved["qa-viewer"] === "https://ramupod.com") {
    viewer.value = "https://ramupod.com";
  }

  // Check QA Testing status
  const qaResult = await send("status");
  activity = (qaResult.activity ?? null) as typeof activity;
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
  el("export").hidden = !qaResult.session;
  status.textContent = String(qaResult.error ?? "");

  glyph("shot-icon", screenshot ? "close" : "camera");
  el("shot-icon").classList.toggle("destructive", screenshot);
  glyph("test-icon", testing ? "play" : "network");
  glyph("rec-icon", "clapperboard");
  glyph("tab-rec-icon", "video");
  glyph("tab-qa-icon", "bug");

  // Check Screen Recorder status
  const recResult = await send("rec-status");
  recActivity = recResult as typeof recActivity;

  const isRecording = !!recActivity?.recording;
  recActiveSection.hidden = !isRecording;
  recIdleSection.hidden = isRecording;

  if (isRecording) {
    updateRecTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateRecTimer, 1000);
    recPauseBtn.textContent = recActivity?.state === "paused" ? "Resume" : "Pause";
  } else {
    clearInterval(timerInterval);
  }

  // Tab Selection Logic (Strict priority order):
  // 1. If currently recording screen -> automatically open Screen Recorder
  // 2. If currently capturing QA bug report -> automatically open QA Bug Report
  // 3. Daily usage (Sticky Tab) from chrome.storage.local
  // 4. First time install: Default to Screen Recorder
  if (isRecording) {
    switchTab("recorder", false);
  } else if (testing) {
    switchTab("qa", false);
  } else {
    const sticky = saved[TAB_STORAGE_KEY];
    if (sticky === "qa" || sticky === "recorder") {
      switchTab(sticky, false);
    } else {
      switchTab("recorder", false);
    }
  }
}

// Tab switcher click handlers
tabBtnRecorder.onclick = () => switchTab("recorder", true);
tabBtnQa.onclick = () => switchTab("qa", true);

// Screen Recorder Button Handlers
btnStartTabRec.onclick = () =>
  run(async () => {
    btnStartTabRec.disabled = true;
    try {
      await send("rec-start", {
        withMic: recOptMic.checked,
        withCamera: recOptCam.checked,
        origin: viewer.value,
      });
      window.close();
    } finally {
      btnStartTabRec.disabled = false;
    }
  });

recPauseBtn.onclick = () =>
  run(async () => {
    await send("rec-toggle-pause");
    await init();
  });

recStopBtn.onclick = () =>
  run(async () => {
    recStopBtn.disabled = true;
    try {
      await send("rec-stop");
      window.close();
    } finally {
      recStopBtn.disabled = false;
    }
  });

recCancelBtn.onclick = () =>
  run(async () => {
    await send("rec-cancel");
    await init();
  });

btnOpenStudio.onclick = () =>
  run(async () => {
    const targetUrl = `${viewer.value}/tools/screen-recorder`;
    await chrome.tabs.create({ url: targetUrl });
    window.close();
  });

// QA Bug Report Button Handlers
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

viewer.onchange = () => {
  void chrome.storage.local.set({ "qa-viewer": viewer.value });
};

el("export").onclick = () =>
  run(async () => {
    const result = await send("export");
    if (!result.package) return;
    const blob = new Blob([JSON.stringify(result.package, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ramupod-qa-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

void init();
