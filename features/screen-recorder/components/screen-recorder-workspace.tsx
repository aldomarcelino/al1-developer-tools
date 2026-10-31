"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Video,
  ArrowUpRight,
  RectangleHorizontal,
  Circle,
  Type,
  Pencil,
  ChevronRight,
  ScanSearch,
  Flashlight,
  Laptop,
  MonitorPlay,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Accordion } from "@/components/ui/accordion";
import { useScreenRecorder } from "../hooks/use-screen-recorder";
import { useFloatingStudio } from "../hooks/use-floating-studio";
import { AudioSettings } from "./audio-settings";
import { WebcamSettings } from "./webcam-settings";
import { RecordingPreview } from "./recording-preview";
import { StudioStage } from "./studio-stage";
import { StudioToolbar } from "./studio-toolbar";
import type { DrawingTool } from "../lib/studio-scene";
import s from "../studio.module.css";

export function ScreenRecorderWorkspace() {
  const r = useScreenRecorder(),
    floating = useFloatingStudio(r.compositor);
  const [mode, setMode] = useState<DrawingTool>("pointer"),
    [color, setColor] = useState("#facc15"),
    [stroke, setStroke] = useState(4),
    [text, setText] = useState("");
  const [zoomLevel, setZoomLevel] = useState(2),
    [, setRevision] = useState(0),
    [shortcuts, setShortcuts] = useState(true),
    [dock, setDock] = useState("bottom"),
    [notice, setNotice] = useState(""),
    [showBrowserStudio, setShowBrowserStudio] = useState(false);
  const [focusX, setFocusX] = useState(50),
    [focusY, setFocusY] = useState(50);
  const scene = r.compositor?.getScene();
  const update = useCallback(() => setRevision((v) => v + 1), []);
  const chooseMode = useCallback(
    (next: DrawingTool) => {
      setMode(next);
      r.compositor?.editScene((state) => {
        state.draft = null;
      });
    },
    [r.compositor]
  );
  const clear = useCallback(() => {
    if (r.compositor) {
      r.compositor.editScene((state) => {
        state.annotations = [];
        state.draft = null;
      });
      update();
    }
  }, [r.compositor, update]);
  const undo = () => {
    r.compositor?.editScene((state) => {
      state.annotations.pop();
    });
    update();
  };
  const spotlight = useCallback(() => {
    if (r.compositor) {
      r.compositor.editScene((state) => {
        state.spotlight = !state.spotlight;
        setMode(state.spotlight ? "spotlight" : "pointer");
      });
      update();
    }
  }, [r.compositor, update]);
  const exit = useCallback(() => {
    setMode("pointer");
    if (r.compositor) {
      r.compositor.editScene((state) => {
        state.zoom = 1;
        state.focus = { x: 0.5, y: 0.5 };
        state.spotlight = false;
        state.draft = null;
      });
      update();
    }
  }, [r.compositor, update]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "ramupod-recorder-offer") {
        const nonce = event.data.nonce;
        window.postMessage({ type: "ramupod-recorder-ready", nonce }, location.origin);
      }
      if (event.data?.type === "ramupod-recorder-package") {
        const { blobData, duration, extension, mimeType, nonce } = event.data;
        if (blobData) {
          window.postMessage({ type: "ramupod-recorder-accepted", nonce }, location.origin);
          history.replaceState(null, "", location.pathname);
          const raw = Array.isArray(blobData) ? new Uint8Array(blobData) : blobData;
          const blob = new Blob([raw], { type: mimeType || "video/webm" });
          r.importRecording(blob, duration || 0, extension || "webm", mimeType || "video/webm");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [r]);
  const enabled = ["ready", "recording", "paused"].includes(r.status);
  // Each visible document (main studio and optional PiP) gets the same shortcuts.
  useEffect(() => {
    if (!shortcuts || !enabled) return;
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.closest(
          "input, textarea, select, button, [contenteditable='true'], [role='combobox']"
        )
      )
        return;
      const value = event.key.toLowerCase();
      if (value === "escape") {
        event.preventDefault();
        exit();
      } else if (value === "z") {
        event.preventDefault();
        if (mode === "zoom") exit();
        else chooseMode("zoom");
      } else if (value === "d") {
        event.preventDefault();
        chooseMode(mode === "pen" ? "pointer" : "pen");
      } else if (value === "c") {
        event.preventDefault();
        clear();
      } else if (value === "s") {
        event.preventDefault();
        spotlight();
      }
    };
    window.addEventListener("keydown", key);
    floating.target?.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      floating.target?.removeEventListener("keydown", key);
    };
  }, [shortcuts, enabled, mode, exit, chooseMode, clear, spotlight, floating.target]);
  const previousCompositor = useRef(r.compositor);
  useEffect(() => {
    if (previousCompositor.current !== r.compositor) {
      previousCompositor.current = r.compositor;
      setMode("pointer");
      setNotice("");
      setRevision(0);
    }
  }, [r.compositor]);
  const toolbar = (
    <StudioToolbar
      status={r.status}
      duration={r.duration}
      mode={mode}
      onMode={chooseMode}
      clicks={scene?.clickHighlights ?? true}
      onClicks={() => {
        r.compositor?.editScene((state) => {
          state.clickHighlights = !state.clickHighlights;
        });
        update();
      }}
      spotlight={scene?.spotlight ?? false}
      onSpotlight={spotlight}
      onStart={r.beginRecording}
      onPause={r.pauseRecording}
      onResume={r.resumeRecording}
      onStop={r.stopRecording}
      onClear={clear}
      onUndo={undo}
      canFloat={floating.supported && enabled}
      onFloat={() => void floating.open()}
      onDock={() => setDock((v) => (v === "top" ? "bottom" : "top"))}
    />
  );
  const stage = r.compositor ? (
    <StudioStage
      compositor={r.compositor}
      mode={mode}
      color={color}
      stroke={stroke}
      text={text}
      zoomLevel={zoomLevel}
      onEdit={update}
      onNotice={setNotice}
    />
  ) : null;
  return (
    <div className={`workspace-page page-width ${s.scope}`}>
      <ToolHeader title="Interactive Screen Recorder" icon={<Video size={24} />} />
      {r.errorMessage || r.systemAudioNotice || notice || floating.error ? (
        <div className={s.notice} role={r.errorMessage ? "alert" : "status"}>
          {r.errorMessage || notice || floating.error || r.systemAudioNotice}
        </div>
      ) : null}
      {r.previewUrl && (r.status === "completed" || r.status === "error") ? (
        <RecordingPreview
          key={r.previewUrl}
          previewUrl={r.previewUrl}
          duration={r.duration}
          fileSize={r.fileSize}
          mimeType={r.outputMimeType}
          extension={r.fileExtension}
          onDownload={r.downloadRecording}
          onReset={r.resetRecording}
        />
      ) : null}
      {["idle", "error"].includes(r.status) && !r.previewUrl ? (
        <>
          <div className={s.hubGrid}>
            {/* Card 1: Companion Extension (Recommended) */}
            <div className={`${s.hubCard} ${s.featured}`}>
              <div className={s.hubHeader}>
                <div className={s.hubIconWrap}>
                  <Laptop size={22} />
                </div>
                <span className={`${s.hubBadge} ${s.recommended}`}>
                  <Sparkles size={11} style={{ display: "inline", marginRight: 4 }} />
                  Recommended
                </span>
              </div>
              <div className={s.hubBody}>
                <h3>In-Tab Recording (Companion Extension)</h3>
                <p>
                  Record directly on any website with floating dock controls, camera bubble,
                  live screen annotations, and click-to-zoom focus.
                </p>
                <ul className={s.hubSteps}>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>1</span>
                    <span>Click <strong>Ramupod Companion</strong> in your Chrome extensions.</span>
                  </li>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>2</span>
                    <span>Click <strong>Record this tab</strong> with mic & camera.</span>
                  </li>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>3</span>
                    <span>Finish anytime — your video opens right here to preview & download!</span>
                  </li>
                </ul>
              </div>
              <div className={s.hubActions}>
                <a
                  href="/qa-capture/ramupod-qa-capture.zip"
                  download
                  className={s.downloadLink}
                >
                  <Download size={14} />
                  Download Extension (.zip)
                </a>
              </div>
            </div>

            {/* Card 2: In-Browser Canvas Studio */}
            <div className={s.hubCard}>
              <div className={s.hubHeader}>
                <div className={s.hubIconWrap}>
                  <MonitorPlay size={22} />
                </div>
                <span className={s.hubBadge}>No Extension Required</span>
              </div>
              <div className={s.hubBody}>
                <h3>In-Browser Canvas Studio</h3>
                <p>
                  Capture an application tab directly in your browser using standard Web APIs.
                  Ideal for quick captures without installing extensions.
                </p>
                <ul className={s.hubSteps}>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>1</span>
                    <span>Click the setup button below to configure audio & camera.</span>
                  </li>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>2</span>
                    <span>Choose which application tab to share into the canvas.</span>
                  </li>
                  <li className={s.hubStepItem}>
                    <span className={s.hubStepNumber}>3</span>
                    <span>Compose, record, and export directly from your browser.</span>
                  </li>
                </ul>
              </div>
              <div className={s.hubActions}>
                <ActionButton
                  variant={showBrowserStudio ? "secondary" : "primary"}
                  onClick={() => setShowBrowserStudio(!showBrowserStudio)}
                >
                  {showBrowserStudio ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {showBrowserStudio ? "Close In-Browser Studio" : "Open In-Browser Studio"}
                </ActionButton>
              </div>
            </div>
          </div>

          {/* Unfolded Browser Studio Setup Panel */}
          {showBrowserStudio ? (
            <section className={s.panel} aria-label="Recording setup">
              <div className={s.heading}>
                <div>
                  <span className={s.eyebrow}>IN-BROWSER DEMO STUDIO</span>
                  <h2>Configure your browser recording session.</h2>
                </div>
                <span className={s.badge}>720p / 1080p · 30 fps target</span>
              </div>
              <p>
                Choose a separate browser tab to keep studio controls out of the captured
                content. Whole screens and windows are rejected in Studio mode. Desktop Chrome
                and Edge offer the most complete support.
              </p>
              <div className={s.actions}>
                <ActionButton
                  variant="primary"
                  disabled={!r.hasMounted || !r.isBrowserSupported}
                  onClick={() => void r.prepareRecording(false)}
                >
                  <Video size={16} />
                  Choose app tab
                </ActionButton>
                <ActionButton
                  disabled={!r.hasMounted}
                  onClick={() => void r.prepareRecording(true)}
                >
                  Try demo scene
                </ActionButton>
                <CustomSelect
                  label="Recording quality"
                  value={r.quality}
                  onChange={r.setQuality}
                  options={[
                    { value: "1080", label: "Up to 1080p" },
                    { value: "720", label: "Up to 720p · lighter" },
                  ]}
                />
              </div>
              {r.hasMounted && !r.isBrowserSupported ? (
                <p className={s.notice}>
                  Screen capture is unavailable here. Use desktop Chrome/Edge, or explore the
                  real recording pipeline with the labeled synthetic demo scene.
                </p>
              ) : null}
              <Accordion
                title="Audio & camera"
                description="Optional narration, tab audio and webcam overlay"
                variant="inline"
              >
                <div className={s.settings}>
                  <AudioSettings
                    mode={r.audioMode}
                    onChange={r.setAudioMode}
                    systemAudioNotice={r.systemAudioNotice}
                  />
                  <WebcamSettings
                    options={r.webcamOptions}
                    onChange={r.setWebcamOptions}
                    webcamPreviewStream={r.webcamPreviewStream}
                    onTogglePreview={r.toggleWebcamPreview}
                  />
                </div>
              </Accordion>
            </section>
          ) : null}
        </>
      ) : null}
      {r.status === "requesting" ? (
        <section className={s.panel} role="status">
          <h2>Preparing your source…</h2>
          <p>
            Choose an application tab in the native picker. Enable Share audio there if
            needed. Permission dialogs can take a moment.
          </p>
          <ActionButton onClick={r.cancelSetup}>Cancel setup</ActionButton>
        </section>
      ) : null}
      {r.compositor ? (
        <section className={s.panel} aria-label="Interactive recording studio">
          <div className={s.heading}>
            <div>
              <h2>{r.demo ? "Demo scene · synthetic source" : "Live composition"}</h2>
              <p>
                {r.compositor.canvas.width} × {r.compositor.canvas.height} px · Only this
                composed frame is encoded.
              </p>
            </div>
            {r.status === "ready" ? (
              <ActionButton size="sm" onClick={r.cancelSetup}>
                Change source
              </ActionButton>
            ) : null}
          </div>
          <div className={s.note}>
            <strong>Navigate in your app tab. Direct attention here.</strong> Clicks on
            this preview add markers; they do not click through to your application.
            Browser capture does not expose clicks from another tab. Zoom, annotations and
            spotlight placed here are included in the exported video.
          </div>
          {dock === "top" ? <div className={s.dock}>{toolbar}</div> : null}
          {stage}
          {dock === "bottom" ? <div className={s.dock}>{toolbar}</div> : null}
          <div className={s.effectSettings}>
            <CustomSelect
              label="Zoom"
              value={String(scene?.zoom ?? 1)}
              onChange={(v) => {
                if (scene) {
                  r.compositor?.editScene((state) => {
                    state.zoom = Number(v);
                  });
                  setZoomLevel(Number(v) === 1 ? 2 : Number(v));
                  setMode(Number(v) === 1 ? "pointer" : "zoom");
                  update();
                }
              }}
              options={[
                { value: "1", label: "1× · Normal" },
                { value: "1.5", label: "1.5×" },
                { value: "2", label: "2×" },
                { value: "3", label: "3×" },
              ]}
            />
            <span className={s.badge}>
              {mode} mode · {scene?.annotations.length ?? 0} annotations
            </span>
            <ActionButton size="sm" disabled={!enabled} onClick={exit}>
              Reset focus <ChevronRight size={14} />
            </ActionButton>
          </div>
          <Accordion variant="inline" title="Drawing & presentation controls">
            <div className={s.controlsGrid}>
              <div>
                <h3>Annotation tool</h3>
                <div className={s.actions}>
                  {(
                    [
                      { tool: "pen", label: "Pen", icon: <Pencil size={16} /> },
                      { tool: "arrow", label: "Arrow", icon: <ArrowUpRight size={16} /> },
                      {
                        tool: "rectangle",
                        label: "Rectangle",
                        icon: <RectangleHorizontal size={16} />,
                      },
                      { tool: "circle", label: "Circle", icon: <Circle size={16} /> },
                      { tool: "text", label: "Text", icon: <Type size={16} /> },
                    ] as const
                  ).map((t) => (
                    <ActionButton
                      key={t.tool}
                      active={mode === t.tool}
                      disabled={!enabled}
                      onClick={() => chooseMode(t.tool)}
                    >
                      {t.icon}
                      {t.label}
                    </ActionButton>
                  ))}
                </div>
              </div>
              <div>
                <h3>Ink & stroke</h3>
                <div className={s.actions}>
                  {["#facc15", "#fb7185", "#38bdf8", "#ffffff", "#b8e393"].map((v, i) => (
                    <ActionButton
                      key={v}
                      iconOnly
                      aria-label={
                        ["Yellow ink", "Pink ink", "Blue ink", "White ink", "Green ink"][
                          i
                        ]
                      }
                      active={color === v}
                      onClick={() => setColor(v)}
                    >
                      <span className={s.swatch} style={{ background: v }} />
                    </ActionButton>
                  ))}
                  <CustomSelect
                    label="Stroke"
                    value={String(stroke)}
                    onChange={(v) => setStroke(Number(v))}
                    options={[
                      { value: "2", label: "Thin" },
                      { value: "4", label: "Medium" },
                      { value: "8", label: "Bold" },
                    ]}
                  />
                </div>
              </div>
              <label className={s.field}>
                Text label
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={120}
                  placeholder="E.g. Revenue grew 24%"
                />
                <span>
                  Choose Text, then click the preview to place it. Labels stay until
                  cleared.
                </span>
              </label>
              <div className={s.field}>
                <span>Keyboard focus position · source coordinates</span>
                <label>
                  Horizontal {focusX}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focusX}
                    onChange={(e) => setFocusX(Number(e.target.value))}
                  />
                </label>
                <label>
                  Vertical {focusY}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focusY}
                    onChange={(e) => setFocusY(Number(e.target.value))}
                  />
                </label>
                <div className={s.actions}>
                  <ActionButton
                    size="sm"
                    onClick={() => {
                      if (scene) {
                        r.compositor?.editScene((state) => {
                          state.focus = { x: focusX / 100, y: focusY / 100 };
                          state.zoom = zoomLevel;
                        });
                        update();
                      }
                    }}
                  >
                    <ScanSearch size={14} />
                    Focus here
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    onClick={() => {
                      if (scene) {
                        r.compositor?.editScene((state) => {
                          state.spotlightPosition = { x: focusX / 100, y: focusY / 100 };
                          state.spotlight = true;
                        });
                        update();
                      }
                    }}
                  >
                    <Flashlight size={14} />
                    Spotlight here
                  </ActionButton>
                </div>
              </div>
              <label className={s.field}>
                Click marker size
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.25}
                  defaultValue={scene?.clickSize ?? 1}
                  onChange={(e) => {
                    r.compositor?.editScene((state) => {
                      state.clickSize = Number(e.target.value);
                    });
                  }}
                />
              </label>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={shortcuts}
                  onChange={(e) => setShortcuts(e.target.checked)}
                />
                Enable studio shortcuts
              </label>
              <p className={s.help}>
                Z · Zoom mode / D · Pen / C · Clear / S · Spotlight / Esc · Normal view.
                Shortcuts apply only while the studio or floating controls have focus, and
                are ignored while typing.
              </p>
            </div>
          </Accordion>
          <p className={s.help}>
            Keep the studio visible, preferably in a separate window, for smooth capture.{" "}
            {floating.supported
              ? "Open floating studio for an always-on-top preview and controls."
              : "Always-on-top controls require Document Picture-in-Picture, which this browser does not provide."}{" "}
            Effects are local canvas composition, not modifications to the shared
            application.
          </p>
        </section>
      ) : null}
      {["stopping", "processing"].includes(r.status) ? (
        <p className={s.notice} role="status">
          Finalizing the last video chunks. Keep this page open…
        </p>
      ) : null}
      <p className={s.help}>
        Sessions are limited to 30 minutes or approximately 512 MB to bound browser
        memory. Download important recordings before closing this page. Video format is
        selected from the encoders your browser actually supports.
      </p>
      {floating.target && r.compositor
        ? createPortal(
            <div className={s.scope}>
              <h2>Ramupod · {r.demo ? "Demo scene" : "Live demo"}</h2>
              {stage}
              {toolbar}
              <p className={s.help}>
                Select tools here, then mark the composed preview. Navigate the app in its
                original tab.
              </p>
            </div>,
            floating.target.document.body
          )
        : null}
    </div>
  );
}
