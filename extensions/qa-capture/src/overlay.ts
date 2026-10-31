// Floating testing controls, isolated from the page and its styles.
(() => {
  if (!window.ramupodUI || document.getElementById("ramupod-qa-controls")) return;
  const ui = window.ramupodUI;
  const host = document.createElement("div");
  host.id = "ramupod-qa-controls";
  host.style.cssText =
    "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483646;color-scheme:light";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
 *{box-sizing:border-box}:host{font:12px/1.5 system-ui;color:#232527;color-scheme:light}button,input,textarea,select{font:inherit}button{cursor:pointer}.dock{display:flex;align-items:center;gap:4px;padding:8px;background:#fff;border:1px solid #e5e8e9;border-radius:16px;box-shadow:0 6px 30px #14252a20;max-width:calc(100vw - 24px)}.icon-button{position:relative;display:grid;place-items:center;width:38px;height:38px;border:0;background:transparent;color:#747b80;border-radius:10px;flex-shrink:0;padding:0}.icon-button:hover,.icon-button[aria-pressed=true]{background:#eef3f2;color:#103e3b}.icon-button.primary{background:#103e3b;color:white}.icon-button:disabled{opacity:.35;cursor:default}.icon-button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #103e3b;outline-offset:2px}.icon-button[data-tip]:hover:after,.icon-button[data-tip]:focus-visible:after{content:attr(data-tip);position:absolute;bottom:calc(100% + 11px);left:50%;transform:translateX(-50%);white-space:nowrap;padding:6px 8px;background:#183d3b;color:#fff;border-radius:6px;font-size:11px;font-weight:400;pointer-events:none;z-index:20}.timer{display:flex;align-items:center;gap:7px;font-variant-numeric:tabular-nums;width:80px;flex-shrink:0;padding:0 6px;font-size:14px}.dot{height:6px;width:6px;border-radius:50%;background:#e53945}.timer.paused .dot{background:#a19d4e}.divider{width:1px;height:24px;background:#e5e8e9;margin:0 4px}.dock{cursor:grab;touch-action:none;user-select:none}.dock.dragging{cursor:grabbing}.dock:focus-visible{outline:2px solid #103e3b;outline-offset:3px}.icon-button.destructive:hover{background:#fff1f0;color:#b42318}.icon-button.selected{color:#103e3b;background:#eef3f2}.icon-button.selected svg{fill:currentColor}.counter{position:absolute;top:1px;right:0;background:#103e3b;color:white;border:2px solid white;min-width:15px;height:15px;line-height:11px;border-radius:8px;font-size:8px;pointer-events:none}.pane{position:absolute;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%);background:white;border:1px solid #e5e8e9;border-radius:16px;padding:18px;width:min(460px,calc(100vw - 28px));max-height:min(560px,calc(100dvh - 130px));overflow:auto;box-shadow:0 10px 40px #14252a20}.heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.heading h2{font-size:14px;margin:0;font-weight:600}.heading .icon-button{width:28px;height:28px}.subtle{font-size:11px;color:#747b80;line-height:1.65;margin:8px 0}.filters{display:flex;align-items:center;gap:8px;margin:12px 0}.filters input{flex:1;width:auto}.filters select{flex:0 0 120px;width:120px}input,textarea,select{border:1px solid #e5e8e9;border-radius:9px;padding:9px 10px;color:#232527;background:white;min-width:0}input{width:100%}select{max-width:130px}.row{border:1px solid #e5e8e9;border-radius:11px;padding:12px;margin:8px 0}.request-top{display:flex;align-items:center;gap:8px}.method{font-size:10px;font-weight:600;background:#eef3f2;color:#103e3b;border-radius:5px;padding:3px 6px}.code{font-size:10px;padding:3px 6px;border-radius:5px;background:#f7f8fa;color:#747b80}.code.error{background:#fff1f0;color:#b42318}.endpoint{font-size:11px;overflow-wrap:anywhere;display:block;margin:8px 0;color:#424b4d}.actions{display:flex;gap:4px;margin-left:auto}.actions .icon-button{width:29px;height:29px}.actions svg{width:16px;height:16px}summary{cursor:pointer;font-size:11px;color:#747b80}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto;padding:10px;border-radius:8px;background:#f7f8fa;color:#424b4d;font:11px/1.6 ui-monospace,monospace}.toast{position:absolute;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%);width:max-content;max-width:min(400px,calc(100vw - 24px));padding:10px 14px;border-radius:10px;background:#103e3b;color:white;box-shadow:0 4px 20px #14252a20;font-size:11px;pointer-events:none}.toast.over-pane{bottom:calc(100% + 24px);top:auto;z-index:3}textarea{width:100%;resize:vertical}.text-button{border:0;border-radius:8px;padding:9px 12px;background:#103e3b;color:white}.text-button.danger{color:white;background:#b42318}.text-button.danger:hover{background:#912018}.live-note{display:flex;gap:6px;align-items:center}[hidden]{display:none!important}.dock.minimized{padding:4px 10px;border-radius:24px;background:rgba(16,62,59,0.94);color:#fff;border:1px solid rgba(255,255,255,0.25);box-shadow:0 4px 20px rgba(0,0,0,0.35);backdrop-filter:blur(8px);gap:6px;opacity:.28;transition:opacity .25s ease-in-out,transform .2s ease}.dock.minimized:hover,.dock.minimized:focus-within{opacity:1}.dock.minimized .icon-button:not(.btn-min-toggle){display:none!important}.dock.minimized .divider{display:none!important}.dock.minimized .timer{color:#fff;width:auto;font-size:13px;padding:0 4px}.dock.minimized .btn-min-toggle{color:#fff;width:28px;height:28px}.dock.minimized .btn-min-toggle:hover{background:rgba(255,255,255,0.2);color:#fff}.icon-button.active-tool{background:#103e3b!important;color:#fff!important}.icon-button.active-tool svg{stroke-width:2.2}@media(max-width:480px){.dock{gap:0;padding:6px}.icon-button{width:33px;height:33px}.timer{width:75px;font-size:14px}.divider{margin:0 2px}}`;
  root.appendChild(style);
  const dock = document.createElement("div");
  dock.className = "dock";
  dock.setAttribute("role", "toolbar");
  dock.tabIndex = 0;
  dock.setAttribute(
    "aria-description",
    "Drag empty space to move controls, or focus the card and use arrow keys."
  );
  dock.setAttribute("aria-label", "Ramupod testing controls");
  root.appendChild(dock);
  document.documentElement.appendChild(host);
  const b = (
    name: string,
    icon: string,
    action: () => void,
    parent: Node = dock,
    cls = ""
  ) => ui.button(parent, name, icon, action, cls);
  let state = "recording",
    startedAt = Date.now(),
    pausedAt = 0,
    totalPausedMs = 0,
    count = 0,
    errors = 0,
    images = 0,
    pane: HTMLElement | null = null,
    toastTimer: ReturnType<typeof setTimeout> | undefined,
    removed = false;
  const notify = (message: string) => {
    let toast = root.querySelector<HTMLElement>(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      root.appendChild(toast);
    }
    toast.classList.toggle("over-pane", !!pane);
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast?.remove(), 4000);
  };
  const send = async (action: string, extra: Record<string, unknown> = {}) => {
    const r = await chrome.runtime.sendMessage({ qa: "quick", action, ...extra });
    if (r.error) throw new Error(String(r.error));
    return r;
  };
  const run = (fn: () => Promise<unknown>) =>
    void fn().catch((e) => notify(e instanceof Error ? e.message : "Action failed."));
  const timer = document.createElement("span");
  timer.className = "timer";
  timer.setAttribute("aria-live", "off");
  const dot = document.createElement("span");
  dot.className = "dot";
  const time = document.createElement("span");
  timer.appendChild(dot);
  timer.appendChild(time);
  dock.appendChild(timer);
  const divider = document.createElement("span");
  divider.className = "divider";
  dock.appendChild(divider);
  function closePane() {
    pane?.remove();
    pane = null;
    root.querySelector(".toast")?.classList.remove("over-pane");
  }
  function openPane(title: string) {
    closePane();
    root.querySelector(".toast")?.remove();
    clearTimeout(toastTimer);
    const box = document.createElement("section");
    box.className = "pane";
    box.setAttribute("aria-label", title);
    const heading = document.createElement("div");
    heading.className = "heading";
    const h = document.createElement("h2");
    h.textContent = title;
    heading.appendChild(h);
    const close = b("Close panel", "close", closePane, heading);
    delete close.dataset.tip;
    box.appendChild(heading);
    root.appendChild(box);
    pane = box;
    root.querySelector(".toast")?.classList.add("over-pane");
    return box;
  }
  type Request = {
    id: string;
    method: string;
    url: string;
    status: number;
    bodyStatus: string;
    response: string;
    curl: { command: string | null; warnings: string[] };
    selected: boolean;
  };
  const network = b("Captured requests", "network", () =>
    run(async () => {
      if (pane?.getAttribute("aria-label") === "Captured requests") {
        closePane();
        return;
      }
      const box = openPane("Captured requests");
      const filters = document.createElement("div");
      filters.className = "filters";
      const search = document.createElement("input");
      search.placeholder = "Search requests…";
      search.setAttribute("aria-label", "Search captured requests");
      const filter = document.createElement("select");
      filter.setAttribute("aria-label", "Request status filter");
      for (const [value, label] of [
        ["all", "All requests"],
        ["errors", "HTTP errors"],
      ]) {
        const o = document.createElement("option");
        o.value = value;
        o.textContent = label;
        filter.appendChild(o);
      }
      filters.appendChild(search);
      filters.appendChild(filter);
      box.appendChild(filters);
      const note = document.createElement("p");
      note.className = "subtle";
      note.textContent =
        "Latest 100 completed requests. Response previews: up to 1,500 characters; Finish for full captured evidence. HTTP errors need review. cURL: POSIX shell, replace redacted credentials.";
      box.appendChild(note);
      const rows = document.createElement("div");
      box.appendChild(rows);
      const result = await send("requests"),
        requests = result.requests as Request[];
      function render() {
        rows.replaceChildren();
        const selected = requests.filter(
          (r) =>
            (filter.value !== "errors" || r.status === 0 || r.status >= 400) &&
            `${r.method} ${r.url}`.toLowerCase().includes(search.value.toLowerCase())
        );
        if (!selected.length) {
          const empty = document.createElement("p");
          empty.className = "subtle";
          empty.textContent = "No matching requests. Continue testing or change filters.";
          rows.appendChild(empty);
        }
        for (const r of selected) {
          const row = document.createElement("article");
          row.className = "row";
          const top = document.createElement("div");
          top.className = "request-top";
          const method = document.createElement("span");
          method.className = "method";
          method.textContent = r.method;
          const status = document.createElement("span");
          status.className = `code ${r.status === 0 || r.status >= 400 ? "error" : ""}`;
          status.textContent = String(r.status || "Failed");
          top.appendChild(method);
          top.appendChild(status);
          const actions = document.createElement("div");
          actions.className = "actions";
          top.appendChild(actions);
          const copy = b(
            "Copy cURL",
            "copy",
            () =>
              run(async () => {
                if (!r.curl.command)
                  throw new Error("cURL is unavailable for this request body.");
                try {
                  await navigator.clipboard.writeText(r.curl.command);
                  notify("cURL copied. Replace redacted credentials before use.");
                } catch {
                  const area = document.createElement("textarea");
                  area.value = r.curl.command;
                  area.setAttribute("aria-label", "cURL — copy manually");
                  row.appendChild(area);
                  area.focus();
                  area.select();
                  notify("Copy the selected cURL manually.");
                }
              }),
            actions
          );
          copy.disabled = !r.curl.command;
          const mark = b(
            "Mark this request",
            "mark",
            () =>
              run(async () => {
                mark.disabled = true;
                try {
                  const result = await send("toggle-request", { id: r.id });
                  r.selected = Boolean(result.selected);
                  updateMarked();
                  notify(
                    r.selected
                      ? "Request added to report evidence."
                      : "Request removed from report evidence."
                  );
                } finally {
                  mark.disabled = false;
                }
              }),
            actions
          );
          function updateMarked() {
            mark.setAttribute("aria-pressed", String(r.selected));
            mark.classList.toggle("selected", r.selected);
            mark.dataset.tip = r.selected
              ? "Remove from report evidence"
              : "Mark this request";
          }
          updateMarked();
          const url = document.createElement("span");
          url.className = "endpoint";
          url.textContent = r.url;
          const details = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = `Response preview · ${r.bodyStatus}`;
          const pre = document.createElement("pre");
          let preview = r.response;
          try {
            preview = JSON.stringify(JSON.parse(preview), null, 2);
          } catch {
            /* Non-JSON and partial previews stay text. */
          }
          pre.textContent = preview || "No response text available.";
          details.appendChild(summary);
          details.appendChild(pre);
          row.appendChild(top);
          row.appendChild(url);
          row.appendChild(details);
          rows.appendChild(row);
        }
      }
      search.oninput = render;
      filter.onchange = render;
      render();
      search.focus();
    })
  );
  const badge = document.createElement("span");
  badge.className = "counter";
  badge.hidden = true;
  network.appendChild(badge);
  const screenshot = b("Capture screenshot", "camera", () =>
    run(async () => {
      if (images >= 2)
        throw new Error("Two screenshots already saved. Finish this session first.");
      closePane();
      host.style.visibility = "hidden";
      ui.select(
        (region) => {
          void (async () => {
            try {
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              );
              const result = await send("screenshot");
              await ui.editor(String(result.image), {
                selection: region,
                saveLabel: "Save screenshot to session",
                onSave: async (data) => {
                  await send("save-image", { sessionId: result.sessionId, data });
                  notify("Screenshot saved to this testing session.");
                },
                onClose: () => {
                  host.style.visibility = "visible";
                },
              });
            } catch (e) {
              host.style.visibility = "visible";
              notify(e instanceof Error ? e.message : "Screenshot failed.");
            }
          })();
        },
        () => {
          host.style.visibility = "visible";
        }
      );
    })
  );
  let overlayMode: "qa" | "rec" = "qa";

  // Drawing tool state & helpers
  let drawCanvas: HTMLCanvasElement | null = null;
  let drawCtx: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let penMode = false;
  type Point = { x: number; y: number };
  type Stroke = { points: Point[]; color: string; width: number };
  const strokes: Stroke[] = [];
  let currentStroke: Stroke | null = null;

  function ensureCanvas() {
    if (drawCanvas && drawCanvas.isConnected) return drawCanvas;
    const canvas = document.createElement("canvas");
    canvas.id = "ramupod-rec-canvas";
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483640;pointer-events:none;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.documentElement.appendChild(canvas);
    drawCanvas = canvas;
    drawCtx = canvas.getContext("2d");
    if (drawCtx) {
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
    }
    setupCanvasEvents(canvas);
    return canvas;
  }

  function setupCanvasEvents(canvas: HTMLCanvasElement) {
    canvas.onpointerdown = (e) => {
      if (e.button !== 0 || !penMode) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      isDrawing = true;
      currentStroke = {
        points: [{ x: e.clientX, y: e.clientY }],
        color: "#e53945",
        width: 3.5,
      };
      strokes.push(currentStroke);
      if (drawCtx) {
        drawCtx.beginPath();
        drawCtx.strokeStyle = currentStroke.color;
        drawCtx.lineWidth = currentStroke.width;
        drawCtx.moveTo(e.clientX, e.clientY);
      }
    };
    canvas.onpointermove = (e) => {
      if (!isDrawing || !currentStroke || !drawCtx) return;
      const pt = { x: e.clientX, y: e.clientY };
      currentStroke.points.push(pt);
      drawCtx.lineTo(pt.x, pt.y);
      drawCtx.stroke();
    };
    const endStroke = () => {
      if (!isDrawing) return;
      isDrawing = false;
      currentStroke = null;
      redrawStrokes();
    };
    canvas.onpointerup = endStroke;
    canvas.onpointercancel = endStroke;
  }

  function redrawStrokes() {
    if (!drawCtx || !drawCanvas) return;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      drawCtx.beginPath();
      drawCtx.strokeStyle = s.color;
      drawCtx.lineWidth = s.width;
      drawCtx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        drawCtx.lineTo(s.points[i].x, s.points[i].y);
      }
      drawCtx.stroke();
    }
    updateDrawButtons();
  }

  function updateDrawButtons() {
    undoBtn.hidden = overlayMode !== "rec" || strokes.length === 0;
    clearBtn.hidden = overlayMode !== "rec" || strokes.length === 0;
  }

  function setPenMode(active: boolean) {
    penMode = active;
    const canvas = ensureCanvas();
    if (active) {
      if (zoomMode || isZoomed) setZoomMode(false);
      canvas.style.pointerEvents = "auto";
      canvas.style.cursor = "crosshair";
      penBtn.classList.add("active-tool");
      penBtn.dataset.tip = "Turn off drawing (Alt+Shift+D or Esc)";
      notify("Pen active. Draw anywhere on screen.");
    } else {
      canvas.style.pointerEvents = "none";
      canvas.style.cursor = "default";
      penBtn.classList.remove("active-tool");
      penBtn.dataset.tip = "Draw on screen (Alt+Shift+D)";
    }
    updateDrawButtons();
  }

  // Zoom tool state & helpers
  let zoomMode = false;
  let isZoomed = false;
  const ZOOM_SCALE = 1.75;

  function resetZoom() {
    document.body.style.transition = "transform 0.25s ease-out";
    document.body.style.transform = "";
    document.body.style.transformOrigin = "";
    setTimeout(() => {
      document.body.style.transition = "";
    }, 300);
    isZoomed = false;
    zoomBtn.innerHTML = ui.icon("zoomIn");
    zoomBtn.dataset.tip = "Zoom into area on click (Alt+Shift+Z)";
    zoomBtn.classList.remove("active-tool");
  }

  function zoomTo(clientX: number, clientY: number) {
    document.body.style.transition = "transform 0.25s ease-out";
    document.body.style.transformOrigin = `${clientX}px ${clientY}px`;
    document.body.style.transform = `scale(${ZOOM_SCALE})`;
    isZoomed = true;
    zoomBtn.innerHTML = ui.icon("zoomOut");
    zoomBtn.dataset.tip = "Zoom out (click page, Alt+Shift+Z, or Esc)";
    zoomBtn.classList.add("active-tool");
  }

  function setZoomMode(active: boolean) {
    zoomMode = active;
    if (active) {
      if (penMode) setPenMode(false);
      zoomBtn.classList.add("active-tool");
      notify("Zoom mode active. Click any area to focus.");
      document.documentElement.style.cursor = isZoomed ? "zoom-out" : "zoom-in";
    } else {
      if (isZoomed) resetZoom();
      zoomBtn.classList.remove("active-tool");
      document.documentElement.style.cursor = "";
    }
  }

  const handlePageZoomClick = (e: MouseEvent) => {
    if (!zoomMode && !isZoomed) return;
    const target = e.target as Node | null;
    if (!target || host.contains(target) || (cameraBubble && cameraBubble.contains(target))) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (isZoomed) {
      resetZoom();
      setZoomMode(false);
    } else {
      zoomTo(e.clientX, e.clientY);
    }
  };
  window.addEventListener("click", handlePageZoomClick, true);

  // Recorder-specific buttons in dock
  const penBtn = b(
    "Draw on screen (Alt+Shift+D)",
    "pen",
    () => setPenMode(!penMode),
    dock
  );
  penBtn.hidden = true;

  const undoBtn = b(
    "Undo drawing stroke",
    "undo",
    () => {
      strokes.pop();
      redrawStrokes();
    },
    dock
  );
  undoBtn.hidden = true;

  const clearBtn = b(
    "Clear drawings",
    "trash",
    () => {
      strokes.length = 0;
      redrawStrokes();
      notify("Drawings cleared.");
    },
    dock
  );
  clearBtn.hidden = true;

  const zoomBtn = b(
    "Zoom into area on click (Alt+Shift+Z)",
    "zoomIn",
    () => {
      if (isZoomed) {
        resetZoom();
        setZoomMode(false);
      } else {
        setZoomMode(!zoomMode);
      }
    },
    dock
  );
  zoomBtn.hidden = true;

  const divider2 = document.createElement("span");
  divider2.className = "divider";
  divider2.hidden = true;
  dock.appendChild(divider2);

  const pause = b("Pause testing", "pause", () =>
    run(async () => {
      pause.disabled = true;
      try {
        if (overlayMode === "rec") {
          const res = (await send("rec-toggle-pause")) as { state?: string };
          state = res.state ?? (state === "paused" ? "recording" : "paused");
          if (state === "paused") {
            if (!pausedAt) pausedAt = Date.now();
          } else {
            if (pausedAt) {
              totalPausedMs += Date.now() - pausedAt;
              pausedAt = 0;
            }
          }
          refresh();
        } else {
          const next = state === "paused" ? "resume" : "pause";
          await send(next);
          state = next === "pause" ? "paused" : "recording";
          refresh();
          notify(
            state === "paused"
              ? "Paused. Requests during the pause are not captured."
              : "Testing resumed."
          );
        }
      } finally {
        pause.disabled = false;
      }
    })
  );
  const finish = b(
    "Finish",
    "finish",
    () =>
      run(async () => {
        finish.disabled = true;
        try {
          if (overlayMode === "rec") {
            await send("rec-stop");
            remove();
          } else {
            await send("finish");
            remove();
          }
        } finally {
          finish.disabled = false;
        }
      }),
    dock,
    "primary"
  );
  b(
    "Cancel",
    "close",
    () => {
      if (overlayMode === "rec") {
        run(async () => {
          await send("rec-cancel");
          remove();
        });
        return;
      }
      const box = openPane("Cancel testing?");
      const p = document.createElement("p");
      p.className = "subtle";
      p.textContent =
        "This removes the saved testing session from the extension. Download it from the popup first if you want to keep it.";
      box.appendChild(p);
      const discard = document.createElement("button");
      discard.textContent = "Discard session";
      discard.className = "text-button danger";
      discard.onclick = () =>
        run(async () => {
          await send("clear");
          remove();
        });
      box.appendChild(discard);
    },
    dock,
    "destructive"
  );

  const divider3 = document.createElement("span");
  divider3.className = "divider";
  divider3.hidden = true;
  dock.appendChild(divider3);

  let isMinimized = false;
  let dockVisibility: "normal" | "minimized" | "hidden" = "normal";

  function toggleMinimize(force?: boolean) {
    isMinimized = typeof force === "boolean" ? force : !isMinimized;
    dock.classList.toggle("minimized", isMinimized);
    minimizeBtn.innerHTML = ui.icon(isMinimized ? "expand" : "minimize");
    minimizeBtn.dataset.tip = isMinimized
      ? "Expand controls (Alt+Shift+H)"
      : "Minimize dock (Alt+Shift+H)";
    minimizeBtn.setAttribute(
      "aria-label",
      isMinimized ? "Expand controls" : "Minimize controls"
    );
    if (isMinimized) closePane();
  }

  function cycleDockVisibility() {
    if (dockVisibility === "normal") {
      dockVisibility = "minimized";
      host.style.visibility = "visible";
      toggleMinimize(true);
      notify("Dock minimized (Alt+Shift+H to hide or restore)");
    } else if (dockVisibility === "minimized") {
      dockVisibility = "hidden";
      host.style.visibility = "hidden";
      notify("Dock hidden (Alt+Shift+H to restore)");
    } else {
      dockVisibility = "normal";
      host.style.visibility = "visible";
      toggleMinimize(false);
      notify("Dock restored");
    }
  }

  const minimizeBtn = b(
    "Minimize dock (Alt+Shift+H)",
    "minimize",
    () => {
      if (isMinimized) {
        dockVisibility = "normal";
        toggleMinimize(false);
      } else {
        dockVisibility = "minimized";
        toggleMinimize(true);
      }
    },
    dock,
    "btn-min-toggle"
  );
  minimizeBtn.hidden = true;

  const handleKeyShortcuts = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isInput =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (e.key === "Escape") {
      if (penMode) {
        setPenMode(false);
        return;
      }
      if (isZoomed || zoomMode) {
        resetZoom();
        setZoomMode(false);
        return;
      }
      if (isMinimized) {
        dockVisibility = "normal";
        toggleMinimize(false);
        return;
      }
    }

    if (isInput) return;

    if (overlayMode === "rec") {
      if (e.altKey && e.shiftKey) {
        if (e.code === "KeyH") {
          e.preventDefault();
          cycleDockVisibility();
        } else if (e.code === "KeyP") {
          e.preventDefault();
          pause.click();
        } else if (e.code === "KeyS") {
          e.preventDefault();
          finish.click();
        } else if (e.code === "KeyD") {
          e.preventDefault();
          setPenMode(!penMode);
        } else if (e.code === "KeyZ") {
          e.preventDefault();
          if (isZoomed) {
            resetZoom();
            setZoomMode(false);
          } else {
            setZoomMode(!zoomMode);
          }
        }
      }
    }
  };
  window.addEventListener("keydown", handleKeyShortcuts);

  const handleResize = () => {
    if (drawCanvas) {
      drawCanvas.width = window.innerWidth;
      drawCanvas.height = window.innerHeight;
      redrawStrokes();
    }
  };
  window.addEventListener("resize", handleResize);
  let dragging: { x: number; y: number; left: number; top: number } | null = null;
  function position(left: number, top: number) {
    host.style.transform = "none";
    host.style.bottom = "auto";
    host.style.left = `${Math.max(8, Math.min(innerWidth - host.offsetWidth - 8, left))}px`;
    host.style.top = `${Math.max(8, Math.min(innerHeight - host.offsetHeight - 8, top))}px`;
  }
  dock.onpointerdown = (e) => {
    if (
      e.button !== 0 ||
      !(e.target instanceof Element) ||
      e.target.closest("button,input,textarea,select,a")
    )
      return;
    e.preventDefault();
    dock.focus({ preventScroll: true });
    dock.classList.add("dragging");
    const r = host.getBoundingClientRect();
    dragging = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    dock.setPointerCapture(e.pointerId);
  };
  dock.onpointermove = (e) => {
    if (dragging)
      position(
        dragging.left + e.clientX - dragging.x,
        dragging.top + e.clientY - dragging.y
      );
  };
  const endDrag = () => {
    dragging = null;
    dock.classList.remove("dragging");
  };
  dock.onpointerup = endDrag;
  dock.onpointercancel = endDrag;
  dock.onlostpointercapture = endDrag;
  dock.onkeydown = (e) => {
    if (e.target !== dock) return;
    if (!e.key.startsWith("Arrow")) return;
    e.preventDefault();
    const r = host.getBoundingClientRect();
    position(
      r.left + (e.key === "ArrowRight" ? 20 : e.key === "ArrowLeft" ? -20 : 0),
      r.top + (e.key === "ArrowDown" ? 20 : e.key === "ArrowUp" ? -20 : 0)
    );
  };
  let cameraBubble: HTMLElement | null = null;
  let cameraStream: MediaStream | null = null;

  function setupCameraBubble() {
    if (cameraBubble || document.getElementById("ramupod-camera-bubble")) return;
    const bubble = document.createElement("div");
    bubble.id = "ramupod-camera-bubble";
    bubble.style.cssText =
      "position:fixed;bottom:24px;left:24px;width:140px;height:140px;border-radius:50%;overflow:hidden;z-index:2147483645;border:3px solid #103e3b;box-shadow:0 8px 30px rgba(16,62,59,0.3);cursor:grab;user-select:none;touch-action:none;background:#000;";
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.cssText =
      "width:100%;height:100%;object-fit:cover;transform:scaleX(-1);pointer-events:none;";
    bubble.appendChild(video);
    document.documentElement.appendChild(bubble);
    cameraBubble = bubble;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        cameraStream = s;
        video.srcObject = s;
        video.play().catch(() => {});
      })
      .catch(() => {
        bubble.remove();
        cameraBubble = null;
      });

    let bDrag: { x: number; y: number; left: number; top: number } | null = null;
    bubble.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      bubble.setPointerCapture(e.pointerId);
      bubble.style.cursor = "grabbing";
      const r = bubble.getBoundingClientRect();
      bDrag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    };
    bubble.onpointermove = (e) => {
      if (!bDrag) return;
      const l = Math.max(8, Math.min(innerWidth - 148, bDrag.left + e.clientX - bDrag.x));
      const t = Math.max(8, Math.min(innerHeight - 148, bDrag.top + e.clientY - bDrag.y));
      bubble.style.left = `${l}px`;
      bubble.style.top = `${t}px`;
      bubble.style.bottom = "auto";
    };
    const bEnd = () => {
      bDrag = null;
      bubble.style.cursor = "grab";
    };
    bubble.onpointerup = bEnd;
    bubble.onpointercancel = bEnd;
  }

  function tearDownCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    cameraBubble?.remove();
    cameraBubble = null;
    document.getElementById("ramupod-camera-bubble")?.remove();
  }

  function refresh() {
    const currentPause = pausedAt > 0 ? Date.now() - pausedAt : 0;
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt - totalPausedMs - currentPause) / 1000)
    );
    time.textContent =
      state === "paused"
        ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        : state === "recording"
          ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
          : "Stopped";
    timer.classList.toggle("paused", state === "paused");
    timer.title =
      overlayMode === "rec"
        ? `Screen Recording · ${time.textContent}`
        : state === "recording"
          ? `${count} requests · ${errors} HTTP/network errors`
          : state;
    badge.textContent = String(count > 99 ? "99+" : count);
    badge.hidden = overlayMode === "rec" || !count;
    pause.innerHTML = ui.icon(state === "paused" ? "play" : "pause");
    pause.setAttribute(
      "aria-label",
      overlayMode === "rec"
        ? state === "paused" ? "Resume recording" : "Pause recording"
        : state === "paused" ? "Resume testing" : "Pause testing"
    );
    pause.dataset.tip =
      overlayMode === "rec"
        ? state === "paused" ? "Resume recording" : "Pause recording"
        : state === "paused" ? "Resume testing" : "Pause testing";
    pause.disabled = !["recording", "paused"].includes(state);
    screenshot.disabled = !["recording", "paused"].includes(state);
  }
  const clock = setInterval(() => {
    if (!host.isConnected) {
      clearInterval(clock);
      return;
    }
    refresh();
  }, 1000);
  function remove() {
    if (removed) return;
    removed = true;
    resetZoom();
    window.removeEventListener("click", handlePageZoomClick, true);
    window.removeEventListener("keydown", handleKeyShortcuts);
    window.removeEventListener("resize", handleResize);
    if (drawCanvas) {
      drawCanvas.remove();
      drawCanvas = null;
    }
    tearDownCamera();
    ui.dismiss();
    clearInterval(clock);
    clearTimeout(toastTimer);
    chrome.runtime.onMessage.removeListener(listener);
    host.remove();
  }
  const listener = (m: unknown) => {
    const message = m as {
      qa?: string;
      state?: string;
      count?: number;
      errors?: number;
      images?: number;
      startedAt?: string | number;
      error?: string;
      withCamera?: boolean;
    };
    if (message.qa === "quick-remove" || message.qa === "rec-overlay-remove") remove();
    if (message.qa === "rec-overlay-init") {
      overlayMode = "rec";
      if (typeof message.startedAt === "number") startedAt = message.startedAt;
      network.hidden = true;
      screenshot.hidden = true;
      penBtn.hidden = false;
      zoomBtn.hidden = false;
      divider2.hidden = false;
      divider3.hidden = false;
      minimizeBtn.hidden = false;
      updateDrawButtons();
      if (message.withCamera) setupCameraBubble();
      refresh();
    }
    if (message.qa === "rec-overlay-state") {
      state = message.state ?? state;
      if (state === "paused") {
        if (!pausedAt) pausedAt = Date.now();
      } else if (state === "recording") {
        if (pausedAt) {
          totalPausedMs += Date.now() - pausedAt;
          pausedAt = 0;
        }
      }
      refresh();
    }
    if (message.qa === "quick-state") {
      state = message.state ?? state;
      count = message.count ?? count;
      errors = message.errors ?? errors;
      images = message.images ?? images;
      if (typeof message.startedAt === "string") startedAt = Date.parse(message.startedAt);
      if (typeof message.startedAt === "number") startedAt = message.startedAt;
      if (message.error) notify(message.error);
      refresh();
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  root.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && pane) {
      closePane();
      network.focus();
    }
  });
  run(async () => {
    const recCheck = (await send("rec-status")) as {
      recording?: boolean;
      state?: string;
      startedAt?: number;
      totalPaused?: number;
    };
    if (recCheck?.recording) {
      overlayMode = "rec";
      state = recCheck.state ?? "recording";
      if (recCheck.startedAt) startedAt = recCheck.startedAt;
      if (typeof recCheck.totalPaused === "number") totalPausedMs = recCheck.totalPaused;
      if (state === "paused") pausedAt = Date.now();
      network.hidden = true;
      screenshot.hidden = true;
      penBtn.hidden = false;
      zoomBtn.hidden = false;
      divider2.hidden = false;
      divider3.hidden = false;
      minimizeBtn.hidden = false;
      updateDrawButtons();
      refresh();
      return;
    }
    const result = await send("status"),
      session = result.session as
        | {
            state: string;
            startedAt: string;
            requests: unknown[];
            attachments: unknown[];
          }
        | undefined;
    if (session) {
      state = session.state;
      startedAt = Date.parse(session.startedAt);
      count = session.requests.length;
      images = session.attachments.length;
      refresh();
    } else {
      remove();
    }
  });
  refresh();
})();
