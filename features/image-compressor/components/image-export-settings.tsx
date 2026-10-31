"use client";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  LoaderCircle,
  Lock,
  Unlock,
} from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { downloadBlob } from "@/lib/browser/download";
import { formatBytes } from "@/lib/format/file-size";
import type { ImageSource, ImageResult } from "../lib/process-image";
import type { ImageFormat } from "../lib/image-tools";
import type { ExportSettings } from "../lib/batch";
export function ImageExportSettings({
  settings,
  onChange,
  source,
  result,
  busy,
  error,
}: {
  settings: ExportSettings;
  onChange: (patch: Partial<ExportSettings>) => void;
  source: ImageSource;
  result?: ImageResult;
  busy: boolean;
  error: string;
}) {
  const {
    format,
    quality,
    scaleMode,
    width: customWidth,
    height: customHeight,
    lockAspectRatio,
  } = settings;
  const setFormat = (format: ImageFormat) => onChange({ format });
  const setQuality = (quality: number) => onChange({ quality });
  const setScaleMode = (scaleMode: ExportSettings["scaleMode"]) =>
    onChange({ scaleMode });
  const setCustomWidth = (width: string) => onChange({ width });
  const setCustomHeight = (height: string) => onChange({ height });
  const setLockAspectRatio = (lockAspectRatio: boolean) => onChange({ lockAspectRatio });
  // Custom dimension change helpers (with aspect ratio lock)
  const handleWidthChange = (val: string) => {
    setCustomWidth(val);
    if (lockAspectRatio && source && Number(val) > 0) {
      const ratio = source.height / source.width;
      setCustomHeight(String(Math.round(Number(val) * ratio)));
    }
  };

  const handleHeightChange = (val: string) => {
    setCustomHeight(val);
    if (lockAspectRatio && source && Number(val) > 0) {
      const ratio = source.width / source.height;
      setCustomWidth(String(Math.round(Number(val) * ratio)));
    }
  };

  const savingsPct =
    source && result ? (1 - result.blob.size / source.file.size) * 100 : 0;
  const sizeDifference = source && result ? source.file.size - result.blob.size : 0;

  return (
    <>
      {" "}
      {/* Controls Card */}
      <div className="compressor-controls-card">
        <div className="compressor-settings-heading">
          <h2>Export settings</h2>
          <span>Changes apply to all images automatically</span>
        </div>
        <div className="compressor-controls-grid">
          {/* Col 1: Format Selector */}
          <div className="compressor-control-col">
            <div className="compressor-control-label">
              <span>Output format</span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {format === "image/webp"
                  ? "Recommended"
                  : format === "image/png"
                    ? "Lossless"
                    : "Photo"}
              </span>
            </div>

            <SegmentedTabs<ImageFormat>
              className="compressor-fit-tabs"
              ariaLabel="Output format"
              value={format}
              onChange={(val) => setFormat(val)}
              options={[
                {
                  value: "image/webp",
                  label: "WebP",
                  title: "Best compression for web",
                },
                {
                  value: "image/jpeg",
                  label: "JPG",
                  title: "Standard photographic format",
                },
                {
                  value: "image/png",
                  label: "PNG",
                  title: "Lossless with transparency",
                },
              ]}
            />
            <p className="compressor-control-help">
              {format === "image/webp"
                ? "Small files, with transparency support."
                : format === "image/png"
                  ? "Preserves detail and transparency. May be larger."
                  : "Great for photos. Transparency becomes white."}
            </p>
          </div>

          {/* Col 2: Quality Slider & Presets */}
          <div className="compressor-control-col">
            <div className="compressor-control-label">
              <span>Quality</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                {format === "image/png" ? "Lossless (100%)" : `${quality}%`}
              </span>
            </div>

            <div className="compressor-slider-wrap">
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={format === "image/png"}
                onChange={(e) => setQuality(Number(e.target.value))}
                aria-label="Quality percentage"
              />

              <div className="compressor-presets">
                {[
                  { label: "Max (90%)", val: 90 },
                  { label: "Balanced (80%)", val: 80 },
                  { label: "Compact (65%)", val: 65 },
                  { label: "Small (50%)", val: 50 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={format === "image/png"}
                    className={`compressor-preset-btn ${quality === p.val && format !== "image/png" ? "active" : ""}`}
                    aria-pressed={quality === p.val && format !== "image/png"}
                    onClick={() => setQuality(p.val)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Col 3: Resize / Scale */}
          <div className="compressor-control-col">
            <div className="compressor-control-label">
              <span>Resize</span>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {scaleMode !== "custom" ? `${scaleMode}%` : "Custom"}
              </span>
            </div>

            <div className="compressor-presets" style={{ marginBottom: "6px" }}>
              {[
                { label: "100%", val: "100" as const },
                { label: "75%", val: "75" as const },
                { label: "50%", val: "50" as const },
                { label: "Custom", val: "custom" as const },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  className={`compressor-preset-btn ${scaleMode === s.val ? "active" : ""}`}
                  aria-pressed={scaleMode === s.val}
                  onClick={() => {
                    setScaleMode(s.val);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {scaleMode === "custom" && (
              <div className="compressor-dimension-row">
                <div className="compressor-input-unit">
                  <NumberInput
                    min={1}
                    max={12000}
                    aria-label="Width in pixels"
                    placeholder="Width"
                    value={customWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    title="Target width in pixels"
                  />
                </div>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>×</span>
                <div className="compressor-input-unit">
                  <NumberInput
                    min={1}
                    max={12000}
                    aria-label="Height in pixels"
                    placeholder="Height"
                    value={customHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    title="Target height in pixels"
                  />
                </div>
                <button
                  type="button"
                  className={`compressor-lock-btn ${lockAspectRatio ? "locked" : ""}`}
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  aria-pressed={lockAspectRatio}
                  aria-label="Lock aspect ratio"
                  title={
                    lockAspectRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"
                  }
                >
                  {lockAspectRatio ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
            )}
            {scaleMode === "custom" ? (
              <p className="compressor-control-help">
                {lockAspectRatio
                  ? "Fit each image inside these bounds, preserving its aspect ratio."
                  : "Use these exact dimensions for every image."}
              </p>
            ) : null}
          </div>
        </div>
        <div className="compressor-export-footer" aria-busy={busy}>
          <div className="compressor-export-summary" role="status" aria-live="polite">
            {busy ? (
              <>
                <LoaderCircle size={18} className="counter-spinner" />
                <span>Preparing your image…</span>
              </>
            ) : result ? (
              <>
                <div className="compressor-size-stat">
                  <span>Original</span>
                  <strong>{formatBytes(source.file.size)}</strong>
                </div>
                <ArrowRight
                  size={16}
                  className="compressor-size-arrow"
                  aria-hidden="true"
                />
                <div className="compressor-size-stat">
                  <span>Result · {result.format.split("/")[1].toUpperCase()}</span>
                  <strong
                    className={`compressor-result-value ${sizeDifference > 0 ? "is-reduced" : sizeDifference < 0 ? "is-increased" : ""}`}
                  >
                    {formatBytes(result.blob.size)}
                    {sizeDifference > 0 ? (
                      <ArrowDownRight size={18} aria-label="File size decreased" />
                    ) : sizeDifference < 0 ? (
                      <ArrowUpRight size={18} aria-label="File size increased" />
                    ) : null}
                  </strong>
                </div>
                <div className="compressor-size-detail">
                  <strong>
                    {sizeDifference > 0
                      ? `${formatBytes(sizeDifference)} saved · ${savingsPct.toFixed(1)}%`
                      : sizeDifference < 0
                        ? `${formatBytes(-sizeDifference)} added · ${Math.abs(savingsPct).toFixed(1)}%`
                        : "Same file size"}
                  </strong>
                  <span>
                    {sizeDifference < 0
                      ? "Try WebP or a lower quality for a smaller file."
                      : `${result.width} × ${result.height} px · Ready to download`}
                  </span>
                </div>
              </>
            ) : (
              <span>
                {error ? "Adjust your settings to try again." : "Preparing your image…"}
              </span>
            )}
          </div>
          <button
            type="button"
            className="button primary compressor-download"
            disabled={busy || !result}
            onClick={() => result && downloadBlob(result.blob, result.name)}
          >
            <Download size={15} /> Download image
          </button>
        </div>
      </div>
    </>
  );
}
