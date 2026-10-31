"use client";
import { useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import type { SvgResult } from "../lib/options";
import styles from "../styles.module.css";
type Background = "checker" | "white" | "black" | "custom";
export function SvgPreview({
  result,
  pending,
}: {
  result: SvgResult | null;
  pending: boolean;
}) {
  const [view, setView] = useState<"original" | "optimized">("optimized");
  const [background, setBackground] = useState<Background>("checker");
  const [custom, setCustom] = useState("#eef3f2");
  const [ink, setInk] = useState("#0e363c");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const svg = result ? result[view] : "";
  const preview = useMemo(() => {
    if (!svg) return "";
    // This is already passive, worker-validated SVG. Never insert its nodes into the page.
    const document = new DOMParser().parseFromString(svg, "image/svg+xml");
    document.documentElement.setAttribute("color", ink);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(document.documentElement))}`;
  }, [svg, ink]);
  const dimensions = result
    ? view === "original"
      ? result.originalDimensions
      : result.optimizedDimensions
    : null;
  function reset() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }
  function scale(delta: number) {
    setZoom((previous) =>
      Math.max(0.25, Math.min(4, Math.round((previous + delta) * 100) / 100))
    );
  }
  return (
    <section className={styles.panel} aria-label="SVG visual preview">
      <div className={styles.sectionHeading}>
        <h2>Live preview</h2>
        <SegmentedTabs
          size="sm"
          ariaLabel="Preview version"
          value={view}
          onChange={(value) => {
            setView(value);
            reset();
          }}
          options={[
            { value: "original", label: "Original" },
            { value: "optimized", label: "Optimized" },
          ]}
        />
      </div>
      <div className={styles.previewSettings}>
        <CustomSelect
          label="Canvas"
          value={background}
          options={[
            { value: "checker", label: "Checkerboard" },
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
            { value: "custom", label: "Custom color" },
          ]}
          onChange={(value) => setBackground(value as Background)}
        />
        {background === "custom" ? (
          <label className={styles.colorControl}>
            Background
            <input
              type="color"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
          </label>
        ) : null}
        <label className={styles.colorControl}>
          Current color
          <input
            type="color"
            value={ink}
            onChange={(event) => setInk(event.target.value)}
          />
        </label>
      </div>
      <div
        className={styles.canvas}
        data-background={background}
        style={{
          backgroundColor:
            background === "white"
              ? "#fff"
              : background === "black"
                ? "#000"
                : background === "custom"
                  ? custom
                  : undefined,
        }}
        role="group"
        aria-label="SVG canvas. Drag to pan, arrow keys to pan, plus or minus to zoom, Home to reset."
        tabIndex={0}
        onPointerDown={(event) => {
          if (!preview || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            originX: pan.x,
            originY: pan.y,
          };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (start)
            setPan({
              x: start.originX + event.clientX - start.x,
              y: start.originY + event.clientY - start.y,
            });
        }}
        onPointerUp={(event) => {
          gesture.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onKeyDown={(event) => {
          if (!preview) return;
          if (
            [
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "+",
              "=",
              "-",
              "Home",
            ].includes(event.key)
          )
            event.preventDefault();
          if (event.key === "Home") reset();
          else if (event.key === "+" || event.key === "=") scale(0.25);
          else if (event.key === "-") scale(-0.25);
          else if (event.key.startsWith("Arrow"))
            setPan((previous) => ({
              x:
                previous.x +
                (event.key === "ArrowLeft" ? -20 : event.key === "ArrowRight" ? 20 : 0),
              y:
                previous.y +
                (event.key === "ArrowUp" ? -20 : event.key === "ArrowDown" ? 20 : 0),
            }));
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- Local SVG data URIs must bypass server image optimization.
          <img
            src={preview}
            alt={`${view === "original" ? "Original" : "Optimized"} SVG artwork`}
            draggable={false}
            className={styles.artwork}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          />
        ) : (
          <p className={styles.hint}>
            {pending ? "Preparing preview…" : "Add an SVG to see its preview."}
          </p>
        )}
      </div>
      <div className={styles.previewFooter}>
        <span className={styles.hint}>Drag to pan</span>
        <div className="flex items-center gap-2">
          <ActionButton
            size="sm"
            iconOnly
            title="Zoom out"
            disabled={!preview || zoom <= 0.25}
            onClick={() => scale(-0.25)}
          >
            <ZoomOut size={15} aria-hidden="true" />
          </ActionButton>
          <span className={styles.zoom}>{Math.round(zoom * 100)}%</span>
          <ActionButton
            size="sm"
            iconOnly
            title="Zoom in"
            disabled={!preview || zoom >= 4}
            onClick={() => scale(0.25)}
          >
            <ZoomIn size={15} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            size="sm"
            iconOnly
            title="Reset zoom and pan"
            disabled={!preview}
            onClick={reset}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </ActionButton>
        </div>
      </div>
      <dl className={styles.inspector}>
        {(["viewBox", "width", "height"] as const).map((key) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{dimensions?.[key] || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
