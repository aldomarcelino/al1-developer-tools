/** UI shared by injected scripts in Chrome's isolated world. No page data is evaluated. */
(() => {
  if (window.ramupodUI) return;
  let activeEditor: (() => void) | undefined, activeSelection: (() => void) | undefined;
  const paths: Record<string, string> = {
    camera:
      '<path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10h20V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="4"/>',
    // Geometry from lucide-react 1.61.0 (ISC): Network, Pause, Play, GripHorizontal.
    network:
      '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
    mark: '<path d="M5 21V3m0 1h13l-3 4 3 4H5"/>',
    pause:
      '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>',
    play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
    grip: '<circle cx="12" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="19" cy="15" r="1"/><circle cx="5" cy="15" r="1"/>',
    finish: '<path d="m4 12 5 5L20 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    pen: '<path d="m16 3 5 5L8 21H3v-5zM13 6l5 5"/>',
    rectangle: '<rect x="4" y="5" width="16" height="14" rx="2"/>',
    arrow: '<path d="M5 19 19 5M8 5h11v11"/>',
    text: '<path d="M4 5h16M12 5v15M8 20h8"/>',
    blur: '<path d="M3 12h2m3 0h2m3 0h2m3 0h2M5 7h2m3 0h2m3 0h2M5 17h2m3 0h2m3 0h2"/>',
    undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v3"/>',
    redo: '<path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0-7 7v3"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    move: '<path d="m9 5 3-3 3 3m-3-3v20m-3-3 3 3 3-3M5 9l-3 3 3 3m-3-3h20m-3-3 3 3-3 3"/>',
    minimize: '<path d="M5 12h14"/>',
    expand: '<path d="M5 12h14M12 5v14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    back: '<path d="m9 5-7 7 7 7M2 12h19"/>',
    cursor: '<path d="m5 3 14 9-7 2-3 7z"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  };
  const icon = (name: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.cursor}</svg>`;
  const append = (parent: Node, ...nodes: Node[]) =>
    nodes.forEach((node) => parent.appendChild(node));
  const button = (
    parent: Node,
    name: string,
    symbol: string,
    action: () => void,
    className = ""
  ) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `icon-button ${className}`;
    b.setAttribute("aria-label", name);
    b.dataset.tip = name;
    // Only the fixed local icon dictionary is used as markup.
    b.innerHTML = icon(symbol);
    b.onclick = action;
    append(parent, b);
    return b;
  };
  const base = `*{box-sizing:border-box} :host{color-scheme:light;font:13px/1.5 system-ui;color:#232527}button,input{font:inherit}button{cursor:pointer}.icon-button{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:40px;height:40px;border:0;background:transparent;color:#626b6c;border-radius:10px;padding:0}.icon-button:hover,.icon-button[aria-pressed=true]{background:#eef3f2;color:#103e3b}.icon-button:disabled{opacity:.3;cursor:default}.icon-button:focus-visible,input:focus-visible{outline:2px solid #103e3b;outline-offset:3px}.icon-button[data-tip]:hover:after,.icon-button[data-tip]:focus-visible:after{content:attr(data-tip);position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);white-space:nowrap;background:#183d3b;color:white;padding:6px 9px;border-radius:6px;font-size:11px;font-weight:400;pointer-events:none;z-index:5}.icon-button.primary{background:#103e3b;color:white}.icon-button.destructive:hover{background:#fff1f0;color:#b42318}.divider{width:1px;height:28px;background:#e5e8e9;margin:0 4px;flex-shrink:0}[hidden]{display:none!important}`;
  async function editor(
    image: string,
    options: {
      selection?: QaSelection;
      saveLabel?: string;
      onSave: (data: string) => Promise<void>;
      onClose: () => void;
    }
  ) {
    const prior = document.activeElement as HTMLElement | null;
    const host = document.createElement("div");
    host.id = "ramupod-image-editor";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;color-scheme:light";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent =
      base +
      `
  .backdrop{position:fixed;inset:0;background:#17252980;display:grid;place-items:center;padding:32px;backdrop-filter:blur(5px)}.dialog{display:flex;flex-direction:column;align-items:center;gap:16px;max-height:calc(100dvh - 64px);width:min(1100px,100%);outline:none}.preview{display:grid;place-items:center;min-height:0;width:100%;flex:1;position:relative}.preview canvas{display:block;max-width:100%;max-height:calc(100dvh - 190px);object-fit:contain;box-shadow:0 10px 60px #14252a30;border-radius:10px;background:white;touch-action:none;cursor:crosshair}.tools{position:relative;display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #e5e8e9;border-radius:16px;padding:8px;box-shadow:0 4px 20px #14252a15;max-width:100%;flex-wrap:wrap;justify-content:center}.color{position:relative;width:40px;height:40px;border-radius:10px;display:grid;place-items:center}.color input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.swatch{width:24px;height:24px;border-radius:50%;background:#e53945;box-shadow:inset 0 0 0 3px #00000012}.caption{display:flex;align-items:center;gap:8px;width:min(680px,100%);color:#fff;font-size:11px;justify-content:center}.caption p{margin:0;text-align:center}.caption input{background:#fff;color:#232527;border:1px solid #e5e8e9;border-radius:8px;padding:8px 10px;max-width:240px;min-width:0}.error{padding:8px 14px;background:#fff1f0;color:#b42318;border-radius:8px;margin:0;max-width:100%;overflow-wrap:anywhere}.text-entry{position:absolute;max-width:100%;display:flex;gap:4px;background:white;padding:6px;border-radius:12px;box-shadow:0 2px 15px #14252a30}.text-entry input{border:1px solid #e5e8e9;border-radius:7px;padding:8px;color:#232527;background:white;width:210px;min-width:0}.tip{font-size:11px;color:#fff;margin:0;text-align:center}@media(max-width:680px){.backdrop{padding:12px}.dialog{max-height:calc(100dvh - 24px)}.icon-button,.color{width:34px;height:34px}.tools{gap:0;padding:6px}.caption{flex-wrap:wrap}.preview canvas{max-height:calc(100dvh - 220px)}}`;
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    const dialog = document.createElement("section");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Screenshot editor");
    dialog.tabIndex = -1;
    const preview = document.createElement("div");
    preview.className = "preview";
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Screenshot canvas. Drag to draw. Text tool: click to add text."
    );
    append(preview, canvas);
    const tools = document.createElement("div");
    tools.className = "tools";
    tools.setAttribute("role", "toolbar");
    tools.setAttribute("aria-label", "Screenshot editing tools");
    const error = document.createElement("p");
    error.className = "error";
    error.hidden = true;
    error.setAttribute("role", "alert");
    const caption = document.createElement("div");
    caption.className = "caption";
    const note = document.createElement("p");
    note.textContent =
      "Review private information before saving. Blur only covers the area you select.";
    append(caption, note);
    append(dialog, preview, tools, caption, error);
    append(backdrop, dialog);
    append(shadow, style, backdrop);
    append(document.documentElement, host);
    let closed = false;
    let clearTextEntry: (() => void) | undefined;
    const close = () => {
      if (closed) return;
      closed = true;
      clearTextEntry?.();
      if (activeEditor === close) activeEditor = undefined;
      chrome.runtime.onMessage.removeListener(onMessage);
      host.remove();
      prior?.focus();
      options.onClose();
    };
    activeEditor = close;
    const onMessage = (m: unknown) => {
      if ((m as { qa?: string })?.qa === "shot-remove") close();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const imageEl = new Image();
    imageEl.src = image;
    try {
      await imageEl.decode();
    } catch {
      close();
      throw new Error("Could not open screenshot.");
    }
    if (closed) return;
    const selected = options.selection;
    // Chrome capture pixels scale uniformly. Height can differ under viewport emulation;
    // clamp to the native image bounds rather than stretching the selected area.
    const ratio = selected ? imageEl.width / selected.viewportWidth : 1;
    const sx = selected
      ? Math.min(imageEl.width - 1, Math.max(0, selected.x * ratio))
      : 0;
    const sy = selected
      ? Math.min(imageEl.height - 1, Math.max(0, selected.y * ratio))
      : 0;
    const sw = selected
      ? Math.max(1, Math.min(imageEl.width - sx, selected.width * ratio))
      : imageEl.width;
    const sh = selected
      ? Math.max(1, Math.min(imageEl.height - sy, selected.height * ratio))
      : imageEl.height;
    const scale = Math.min(1, 1920 / sw, Math.sqrt(8000000 / (sw * sh)));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d")!;
    const original = document.createElement("canvas");
    original.width = canvas.width;
    original.height = canvas.height;
    original
      .getContext("2d")!
      .drawImage(imageEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    type Point = { x: number; y: number };
    type Edit = { tool: string; color: string; points: Point[]; text?: string };
    let edits: Edit[] = [],
      redo: Edit[] = [],
      current: Edit | null = null,
      tool = "arrow",
      color = "#e53945";
    const toolButtons = new Map<string, HTMLButtonElement>();
    function choose(value: string) {
      tool = value;
      toolButtons.forEach((b, k) => b.setAttribute("aria-pressed", String(k === tool)));
      canvas.style.cursor =
        tool === "cursor" ? "default" : tool === "text" ? "text" : "crosshair";
    }
    const colorLabel = document.createElement("label");
    colorLabel.className = "color";
    colorLabel.title = "Annotation color";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = color;
    colorInput.setAttribute("aria-label", "Annotation color");
    colorInput.oninput = () => {
      color = colorInput.value;
      swatch.style.background = color;
    };
    append(colorLabel, swatch, colorInput);
    append(tools, colorLabel);
    for (const [key, name] of [
      ["pen", "Draw"],
      ["rectangle", "Rectangle"],
      ["arrow", "Arrow"],
      ["text", "Text"],
      ["blur", "Blur"],
    ])
      toolButtons.set(
        key,
        button(tools, name, key, () => choose(key))
      );
    const divider = document.createElement("span");
    divider.className = "divider";
    append(tools, divider);
    const undoButton = button(tools, "Undo", "undo", () => {
      const e = edits.pop();
      if (e) redo.push(e);
      render();
    });
    const redoButton = button(tools, "Redo", "redo", () => {
      const e = redo.pop();
      if (e) edits.push(e);
      render();
    });
    const divider2 = divider.cloneNode() as HTMLElement;
    append(tools, divider2);
    button(tools, "Close editor", "close", close, "destructive");
    const save = button(
      tools,
      options.saveLabel ?? "Download screenshot",
      "download",
      () => {
        void (async () => {
          save.disabled = true;
          error.hidden = true;
          try {
            await options.onSave(canvas.toDataURL("image/png"));
            close();
          } catch (e) {
            error.textContent =
              e instanceof Error ? e.message : "Could not save screenshot.";
            error.hidden = false;
          } finally {
            save.disabled = false;
          }
        })();
      },
      "primary"
    );
    function draw(edit: Edit) {
      const a = edit.points[0],
        b = edit.points[edit.points.length - 1];
      ctx.strokeStyle = edit.color;
      ctx.fillStyle = edit.color;
      ctx.lineWidth = Math.max(3, canvas.width / 500);
      ctx.lineCap = "round";
      if (edit.tool === "blur") {
        const x = Math.floor(Math.min(a.x, b.x)),
          y = Math.floor(Math.min(a.y, b.y)),
          w = Math.ceil(Math.abs(a.x - b.x)),
          h = Math.ceil(Math.abs(a.y - b.y));
        if (w < 2 || h < 2) return;
        const temp = document.createElement("canvas");
        temp.width = w;
        temp.height = h;
        temp.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.filter = "blur(14px)";
        ctx.drawImage(temp, x - 10, y - 10, w + 20, h + 20);
        ctx.restore();
        return;
      }
      if (edit.tool === "text") {
        ctx.font = `600 ${Math.max(20, canvas.width / 45)}px system-ui`;
        ctx.textBaseline = "top";
        ctx.fillText(edit.text ?? "", a.x, a.y);
        return;
      }
      ctx.beginPath();
      if (edit.tool === "rectangle") ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      else {
        ctx.moveTo(a.x, a.y);
        if (edit.tool === "pen") edit.points.forEach((p) => ctx.lineTo(p.x, p.y));
        else ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (edit.tool === "arrow") {
          const angle = Math.atan2(b.y - a.y, b.x - a.x),
            size = Math.max(15, canvas.width / 90);
          ctx.beginPath();
          ctx.moveTo(
            b.x - size * Math.cos(angle - 0.5),
            b.y - size * Math.sin(angle - 0.5)
          );
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(
            b.x - size * Math.cos(angle + 0.5),
            b.y - size * Math.sin(angle + 0.5)
          );
          ctx.stroke();
        }
      }
    }
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(original, 0, 0);
      edits.forEach(draw);
      if (current) draw(current);
      undoButton.disabled = !edits.length;
      redoButton.disabled = !redo.length;
    }
    const point = (e: PointerEvent): Point => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.min(canvas.width, ((e.clientX - r.left) * canvas.width) / r.width)
        ),
        y: Math.max(
          0,
          Math.min(canvas.height, ((e.clientY - r.top) * canvas.height) / r.height)
        ),
      };
    };
    function commit(edit: Edit) {
      if (edits.length >= 100) {
        error.textContent = "100 annotation limit reached. Undo a mark first.";
        error.hidden = false;
        return;
      }
      edits.push(edit);
      redo = [];
      render();
    }
    function textEntry(position: Point) {
      clearTextEntry?.();
      const form = document.createElement("form");
      form.className = "text-entry";
      const input = document.createElement("input");
      input.maxLength = 300;
      input.placeholder = "Add text…";
      input.setAttribute("aria-label", "Annotation text");
      append(form, input);
      button(form, "Add text", "finish", () => {
        if (input.value.trim()) {
          commit({ tool: "text", color, points: [position], text: input.value });
          clearTextEntry?.();
          canvas.focus();
        }
      });
      form.onsubmit = (e) => {
        e.preventDefault();
        if (input.value.trim()) {
          commit({ tool: "text", color, points: [position], text: input.value });
          clearTextEntry?.();
          canvas.focus();
        }
      };
      append(preview, form);
      const place = () => {
        const image = canvas.getBoundingClientRect(),
          container = preview.getBoundingClientRect();
        const width = form.offsetWidth,
          height = form.offsetHeight;
        const minX = image.width >= width ? image.left - container.left : 0;
        const maxX =
          image.width >= width
            ? image.right - container.left - width
            : container.width - width;
        const minY = image.height >= height ? image.top - container.top : 0;
        const maxY =
          image.height >= height
            ? image.bottom - container.top - height
            : container.height - height;
        const x = image.left - container.left + (position.x / canvas.width) * image.width;
        const y = image.top - container.top + (position.y / canvas.height) * image.height;
        form.style.left = `${Math.max(minX, Math.min(Math.max(minX, maxX), x))}px`;
        form.style.top = `${Math.max(minY, Math.min(Math.max(minY, maxY), y))}px`;
      };
      const resize = new ResizeObserver(place);
      clearTextEntry = () => {
        resize.disconnect();
        form.remove();
        clearTextEntry = undefined;
      };
      resize.observe(canvas);
      resize.observe(preview);
      place();
      input.focus();
    }
    canvas.onpointerdown = (e) => {
      if (tool === "cursor") return;
      if (edits.length >= 100) {
        error.textContent = "100 annotation limit reached. Undo a mark first.";
        error.hidden = false;
        return;
      }
      if (tool === "text") {
        textEntry(point(e));
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      current = { tool, color, points: [point(e)] };
      render();
    };
    canvas.onpointermove = (e) => {
      if (!current) return;
      if (current.tool === "pen") {
        if (current.points.length < 3000) current.points.push(point(e));
      } else current.points = [current.points[0], point(e)];
      render();
    };
    canvas.onpointerup = () => {
      if (current) {
        const finished = current;
        current = null;
        commit(finished);
      }
    };
    canvas.onpointercancel = () => {
      current = null;
      render();
    };
    dialog.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const typing = (shadow.activeElement as HTMLElement)?.tagName === "INPUT";
      if (!typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        (e.shiftKey ? redoButton : undoButton).click();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          dialog.querySelectorAll<HTMLElement>("button:not(:disabled),input,canvas")
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && shadow.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && shadow.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    canvas.onkeydown = (e) => {
      if (tool === "text" && e.key === "Enter") {
        e.preventDefault();
        textEntry({ x: canvas.width / 3, y: canvas.height / 3 });
      }
    };
    choose(tool);
    render();
    dialog.focus();
  }
  function select(onSelect: (region: QaSelection) => void, onCancel: () => void) {
    const host = document.createElement("div");
    host.id = "ramupod-screenshot-selection";
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;touch-action:none;color-scheme:light";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent =
      base +
      `.surface{position:fixed;inset:0;cursor:crosshair;background:#103e3b12;outline:none}.label{position:fixed;left:20px;top:20px;pointer-events:none;background:#fff;color:#232527;border:1px solid #e5e8e9;box-shadow:0 4px 20px #14252a20;border-radius:9px;padding:8px 11px;font:12px system-ui}.selection{position:fixed;border:1px solid white;outline:1px solid #103e3b;background:transparent;box-shadow:0 0 0 99999px #102c3040;pointer-events:none}.hint{position:fixed;top:18px;left:50%;transform:translateX(-50%);background:white;border-radius:10px;padding:8px 12px;font:12px system-ui;color:#232527;pointer-events:none}`;
    const surface = document.createElement("div");
    surface.className = "surface";
    surface.tabIndex = 0;
    surface.setAttribute("role", "dialog");
    surface.setAttribute(
      "aria-label",
      "Screenshot selection. Click for the viewport or drag to select an area. Escape to exit."
    );
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Click or drag to screenshot";
    const area = document.createElement("div");
    area.className = "selection";
    area.hidden = true;
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Click for full viewport · drag to select · Esc to exit";
    append(surface, label, area, hint);
    append(shadow, style, surface);
    append(document.documentElement, host);
    let start: { x: number; y: number } | null = null,
      done = false;
    const cleanup = () => {
      if (activeSelection === cancel) activeSelection = undefined;
      host.remove();
    };
    const cancel = () => {
      if (done) return;
      done = true;
      cleanup();
      onCancel();
    };
    activeSelection = cancel;
    surface.onpointerdown = (e) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY };
      surface.setPointerCapture(e.pointerId);
    };
    surface.onpointermove = (e) => {
      label.style.left = `${Math.max(8, Math.min(innerWidth - 210, e.clientX + 18))}px`;
      label.style.top = `${Math.max(8, Math.min(innerHeight - 42, e.clientY + 18))}px`;
      if (!start) return;
      const x = Math.min(start.x, e.clientX),
        y = Math.min(start.y, e.clientY),
        w = Math.abs(start.x - e.clientX),
        h = Math.abs(start.y - e.clientY);
      area.hidden = false;
      area.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      label.textContent = `${Math.round(w)} × ${Math.round(h)} · release to capture`;
    };
    const finish = (x: number, y: number, w: number, h: number) => {
      done = true;
      cleanup();
      onSelect({
        x,
        y,
        width: w,
        height: h,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      });
    };
    surface.onpointerup = (e) => {
      if (!start || done) return;
      const x = Math.max(0, Math.min(start.x, e.clientX)),
        y = Math.max(0, Math.min(start.y, e.clientY)),
        w = Math.min(innerWidth - x, Math.abs(start.x - e.clientX)),
        h = Math.min(innerHeight - y, Math.abs(start.y - e.clientY));
      if (w < 5 || h < 5) finish(0, 0, innerWidth, innerHeight);
      else finish(x, y, w, h);
    };
    surface.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        finish(0, 0, innerWidth, innerHeight);
      }
    };
    surface.focus();
    return cancel;
  }
  const notify = (message: string) => {
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647";
    const shadow = host.attachShadow({ mode: "closed" });
    const text = document.createElement("div");
    text.setAttribute("role", "alert");
    text.style.cssText =
      "font:12px/1.6 system-ui;background:#103e3b;color:white;padding:12px 16px;border-radius:10px;max-width:400px";
    text.textContent = message;
    shadow.appendChild(text);
    document.documentElement.appendChild(host);
    setTimeout(() => host.remove(), 6000);
  };
  window.ramupodUI = {
    icon,
    button,
    editor,
    select,
    notify,
    dismiss: () => {
      activeSelection?.();
      activeEditor?.();
    },
  };
})();
