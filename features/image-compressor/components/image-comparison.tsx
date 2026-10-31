"use client";
/* eslint-disable @next/next/no-img-element -- Previews use local object URLs. */
import { useRef, useState } from "react";
import { LoaderCircle, MoveHorizontal, Minimize2, Maximize2 } from "lucide-react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { formatBytes } from "@/lib/format/file-size";
import type { ImageSource, ImageResult } from "../lib/process-image";
function getFileFormatLabel(file: File): string {
  if (file.type && file.type.includes("/")) {
    const subtype = file.type.split("/")[1];
    if (subtype) return subtype.toUpperCase();
  }
  const match = file.name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase() : "IMG";
}

export function ImageComparison({
  source,
  result,
  busy,
  error,
}: {
  source: ImageSource;
  result?: ImageResult;
  busy: boolean;
  error: string;
}) {
  const [viewMode, setViewMode] = useState<"split" | "side">("side");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const splitRef = useRef<HTMLDivElement>(null);
  const updateSplit = (clientX: number) => {
    if (!splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    setSplitPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <>
      {" "}
      {/* Interactive Preview Comparison Container */}
      <div
        className={`compressor-preview-container ${previewExpanded ? "is-expanded" : ""}`}
      >
        <div className="compressor-preview-header">
          <div className="compressor-preview-heading">
            <h2>Compare images</h2>
            <p id="compressor-compare-help">
              {viewMode === "split"
                ? "Drag the divider: original on the left, result on the right. Use arrow keys when focused."
                : "Check the original and result before downloading."}
            </p>
            {busy && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                <LoaderCircle size={12} className="counter-spinner" />
                Compressing…
              </span>
            )}
          </div>

          {/* View Switcher: Interactive Split Slider vs Side-by-Side */}
          <div className="compressor-preview-actions">
            <SegmentedTabs<"split" | "side">
              size="sm"
              className="compressor-fit-tabs"
              ariaLabel="Image comparison view"
              value={viewMode}
              onChange={(val) => setViewMode(val)}
              options={[
                {
                  value: "split",
                  label: (
                    <span
                      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      <MoveHorizontal size={12} /> Drag to compare
                    </span>
                  ),
                  title: "Draggable before/after split slider",
                },
                {
                  value: "side",
                  label: "Side by side",
                  title: "Two side-by-side viewports",
                },
              ]}
            />
            <button
              type="button"
              className="button compressor-preview-expand"
              aria-label={previewExpanded ? "Standard preview" : "Enlarge preview"}
              title={previewExpanded ? "Standard preview" : "Enlarge preview"}
              aria-pressed={previewExpanded}
              onClick={() => setPreviewExpanded((expanded) => !expanded)}
            >
              {previewExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* View Mode 1: Interactive Draggable Split Viewport */}
        {viewMode === "split" && (
          <div
            ref={splitRef}
            className="compressor-split-viewport"
            role="slider"
            tabIndex={0}
            aria-label="Image comparison divider"
            aria-describedby="compressor-compare-help"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(splitPos)}
            aria-valuetext={`${Math.round(splitPos)}% original image visible`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.focus();
              updateSplit(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) updateSplit(e.clientX);
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              setSplitPos((pos) =>
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 100
                    : Math.max(0, Math.min(100, pos + (e.key === "ArrowLeft" ? -5 : 5)))
              );
            }}
          >
            {/* Background: Result */}
            <img
              src={result ? result.url : source.url}
              alt="Compressed output"
              className="compressor-split-image"
            />

            {/* Overlay: Original Image clipped to split percentage */}
            <div
              className="compressor-split-overlay"
              style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
            >
              <img
                src={source.url}
                alt="Original image"
                className="compressor-split-image"
              />
            </div>

            {/* Draggable Divider Line & Knob */}
            <div className="compressor-split-divider" style={{ left: `${splitPos}%` }}>
              <div className="compressor-split-handle">
                <MoveHorizontal size={14} />
              </div>
            </div>

            {/* Tags on bottom corners */}
            <div className="compressor-badge-left">
              Original · {formatBytes(source.file.size)}
            </div>
            <div className="compressor-badge-right">
              {result
                ? `Result · ${formatBytes(result.blob.size)}`
                : error
                  ? "Could not create result"
                  : "Processing…"}
            </div>
          </div>
        )}

        {/* View Mode 2: Side-by-Side View */}
        {viewMode === "side" && (
          <div className="compressor-side-by-side">
            <div className="compressor-side-card">
              <div className="compressor-side-header">
                <span>Original</span>
                <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                  {formatBytes(source.file.size)}
                </span>
              </div>
              <div className="compressor-side-body">
                <img src={source.url} alt="Original" />
              </div>
              <div className="compressor-side-footer">
                <span>
                  {source.width} × {source.height} px
                </span>
                <span>{getFileFormatLabel(source.file)}</span>
              </div>
            </div>

            <div className="compressor-side-card">
              <div className="compressor-side-header">
                <span>Result</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                  {result ? formatBytes(result.blob.size) : "-"}
                </span>
              </div>
              <div className="compressor-side-body">
                {result ? (
                  <img src={result.url} alt="Compressed" />
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                    {error
                      ? "Could not create result. Check the error and adjust settings."
                      : "Compressing…"}
                  </span>
                )}
              </div>
              <div className="compressor-side-footer">
                <span>{result ? `${result.width} × ${result.height} px` : "-"}</span>
                <span>{result ? result.format.split("/")[1].toUpperCase() : "-"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
