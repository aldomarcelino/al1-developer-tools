"use client";
import {
  CircleDot,
  Play,
  Pause,
  Square,
  MousePointer2,
  ScanSearch,
  Pencil,
  Flashlight,
  MousePointerClick,
  Undo2,
  Trash2,
  PictureInPicture2,
  ArrowUpDown,
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import type { RecordingStatus } from "../hooks/use-screen-recorder";
import type { DrawingTool } from "../lib/studio-scene";
import { formatDuration } from "../lib/format-time";
import s from "../studio.module.css";
export function StudioToolbar({
  status,
  duration,
  mode,
  onMode,
  clicks,
  onClicks,
  spotlight,
  onSpotlight,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
  onUndo,
  canFloat,
  onFloat,
  onDock,
}: {
  status: RecordingStatus;
  duration: number;
  mode: DrawingTool;
  onMode: (mode: DrawingTool) => void;
  clicks: boolean;
  onClicks: () => void;
  spotlight: boolean;
  onSpotlight: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  onUndo: () => void;
  canFloat?: boolean;
  onFloat?: () => void;
  onDock?: () => void;
}) {
  const active = status === "recording" || status === "paused",
    enabled = active || status === "ready";
  return (
    <div className={s.toolbar} role="group" aria-label="Recording studio controls">
      <div className={s.recordStatus}>
        <CircleDot size={15} className={status === "recording" ? s.rec : s.muted} />
        <strong>{status === "ready" ? "READY" : status.toUpperCase()}</strong>
        <time>{formatDuration(duration)}</time>
      </div>
      <div className={s.actions}>
        {status === "ready" ? (
          <ActionButton variant="primary" onClick={onStart}>
            <CircleDot size={15} />
            Start recording
          </ActionButton>
        ) : null}
        {active ? (
          <>
            <ActionButton
              iconOnly
              aria-label={status === "paused" ? "Resume recording" : "Pause recording"}
              onClick={status === "paused" ? onResume : onPause}
            >
              {status === "paused" ? <Play size={16} /> : <Pause size={16} />}
            </ActionButton>
            <ActionButton variant="primary" onClick={onStop}>
              <Square size={15} />
              Stop
            </ActionButton>
          </>
        ) : null}
        <span className={s.separator} />
        <ActionButton
          iconOnly
          aria-label="Click marker mode"
          active={mode === "pointer"}
          disabled={!enabled}
          onClick={() => onMode("pointer")}
        >
          <MousePointer2 size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Zoom and focus mode"
          active={mode === "zoom"}
          disabled={!enabled}
          onClick={() => onMode("zoom")}
        >
          <ScanSearch size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Pen drawing mode"
          active={mode === "pen"}
          disabled={!enabled}
          onClick={() => onMode("pen")}
        >
          <Pencil size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Toggle spotlight"
          active={spotlight}
          disabled={!enabled}
          onClick={onSpotlight}
        >
          <Flashlight size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Toggle click highlights"
          active={clicks}
          disabled={!enabled}
          onClick={onClicks}
        >
          <MousePointerClick size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Undo annotation"
          disabled={!enabled}
          onClick={onUndo}
        >
          <Undo2 size={16} />
        </ActionButton>
        <ActionButton
          iconOnly
          aria-label="Clear annotations"
          disabled={!enabled}
          onClick={onClear}
        >
          <Trash2 size={16} />
        </ActionButton>
        {canFloat ? (
          <ActionButton iconOnly aria-label="Open floating studio" onClick={onFloat}>
            <PictureInPicture2 size={16} />
          </ActionButton>
        ) : null}
        {onDock ? (
          <ActionButton iconOnly aria-label="Move recording toolbar" onClick={onDock}>
            <ArrowUpDown size={16} />
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}
