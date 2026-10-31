"use client";
import { useEffect, useRef, type PointerEvent } from "react";
import type { CompositorInstance } from "../lib/canvas-compositor";
import {
  sourcePoint,
  type DrawingTool,
  type Annotation,
  type Point,
} from "../lib/studio-scene";
import studio from "../studio.module.css";
export function StudioStage({
  compositor,
  mode,
  color,
  stroke,
  text,
  zoomLevel,
  onEdit,
  onNotice,
}: {
  compositor: CompositorInstance;
  mode: DrawingTool;
  color: string;
  stroke: number;
  text: string;
  zoomLevel: number;
  onEdit: () => void;
  onNotice: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    gesture = useRef<Annotation | null>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = compositor.stream;
    void element.play().catch(() => {});
    return () => {
      element.pause();
      element.srcObject = null;
    };
  }, [compositor]);
  useEffect(() => {
    gesture.current = null;
    compositor.editScene((scene) => {
      scene.draft = null;
    });
  }, [mode, compositor]);
  const point = (event: PointerEvent<HTMLDivElement>): Point => {
    const r = event.currentTarget.getBoundingClientRect();
    return sourcePoint(
      { x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height },
      compositor.getView()
    );
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    const p = point(event);
    compositor.editScene((scene) => {
      if (scene.clickHighlights)
        scene.clicks.push({ point: p, at: performance.now(), right: event.button === 2 });
      if (event.button === 2) return;
      if (mode === "zoom") {
        scene.focus = p;
        scene.zoom = zoomLevel === 1 ? 2 : zoomLevel;
        onEdit();
        return;
      }
      if (mode === "spotlight") {
        scene.spotlight = true;
        scene.spotlightPosition = p;
        onEdit();
        return;
      }
      if (mode === "pointer") return;
      if (scene.annotations.length >= 100) {
        onNotice("Up to 100 annotations per scene. Undo or clear some to continue.");
        return;
      }
      if (mode === "text") {
        if (!text.trim()) {
          onNotice("Enter a short text label before placing it on the video.");
          return;
        }
        scene.annotations.push({
          tool: "text",
          points: [p],
          color,
          stroke,
          text: text.trim().slice(0, 120),
        });
        onEdit();
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { tool: mode, points: [p, p], color, stroke };
      scene.draft = gesture.current;
    });
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const p = point(event);
    compositor.editScene((scene) => {
      if (mode === "spotlight") scene.spotlightPosition = p;
      const draft = gesture.current;
      if (!draft) return;
      if (draft.tool === "pen") {
        const last = draft.points[draft.points.length - 1];
        if (draft.points.length < 500 && Math.hypot(last.x - p.x, last.y - p.y) > 0.0015)
          draft.points.push(p);
      } else draft.points[1] = p;
    });
  };
  const up = () => {
    const draft = gesture.current;
    if (!draft) return;
    compositor.editScene((scene) => {
      scene.annotations.push(draft);
    });
    compositor.editScene((scene) => {
      scene.draft = null;
    });
    gesture.current = null;
    onEdit();
  };
  return (
    <div
      className={studio.stage}
      style={{ aspectRatio: `${compositor.canvas.width} / ${compositor.canvas.height}` }}
    >
      <video
        ref={video}
        muted
        autoPlay
        playsInline
        aria-label="Live composed recording preview"
      />
      <div
        className={studio.interaction}
        data-mode={mode}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          gesture.current = null;
          compositor.editScene((scene) => {
            scene.draft = null;
          });
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Annotation surface. Use the keyboard focus controls below as an alternative to clicking."
      />
    </div>
  );
}
