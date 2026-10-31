"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Crop,
  Download,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCcw,
  Upload,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatBytes } from "@/lib/format/file-size";
import { downloadBlob } from "@/lib/browser/download";
import {
  imageFilename,
  loadImage,
  validateRasterFile,
  validateDimensions,
  type ImageMime,
} from "@/lib/browser/image-codec";
import {
  centeredArea,
  fitDimensions,
  pairedDimension,
  pixelArea,
  ratioPresets,
  type PercentArea,
} from "../lib/geometry";
import ui from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";
const ImageEditor = dynamic(() => import("./image-editor"), {
  ssr: false,
  loading: () => <p className={ui.hint}>Loading crop editor…</p>,
});
type Source = { file: File; url: string; width: number; height: number };
type Result = { blob: Blob; url: string; name: string; width: number; height: number };
export function ResizerWorkspace() {
  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState<PercentArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [preset, setPreset] = useState("free"),
    [customW, setCustomW] = useState("1"),
    [customH, setCustomH] = useState("1");
  const [width, setWidth] = useState(""),
    [height, setHeight] = useState(""),
    [locked, setLocked] = useState(true);
  const [zoom, setZoom] = useState(100),
    [format, setFormat] = useState<ImageMime>("image/jpeg"),
    [quality, setQuality] = useState(90);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [result, setResult] = useState<Result | null>(null);
  const version = useRef(0),
    loadVersion = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const pendingLoad = loadVersion;
    const pendingExport = version;
    return () => {
      alive.current = false;
      pendingLoad.current++;
      pendingExport.current++;
    };
  }, []);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source]
  );
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result]
  );
  const signature = JSON.stringify([
    source?.url,
    crop,
    width,
    height,
    format,
    quality,
    preset,
    customW,
    customH,
  ]);
  useEffect(() => {
    version.current++;
    setResult(null);
  }, [signature]);
  const customRatio = Number(customW) / Number(customH);
  const validRatioPart = (value: string) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0.01 && number <= 1000;
  };
  const validCustomRatio = validRatioPart(customW) && validRatioPart(customH);
  const aspect =
    preset === "custom"
      ? validCustomRatio
        ? customRatio
        : undefined
      : ratioPresets.find((p) => p.value === preset)?.ratio;
  let dimensionsError = "";
  try {
    if (source) {
      if (!width.trim() || !height.trim())
        throw new Error("Enter width and height in pixels.");
      validateDimensions(Number(width), Number(height));
      if (preset === "custom" && !aspect)
        throw new Error("Enter custom ratio values between 0.01 and 1,000.");
      const selected = pixelArea(crop, source.width, source.height);
      if (selected.width < 1 || selected.height < 1)
        throw new Error("The crop must contain at least one source pixel.");
    }
  } catch (e) {
    dimensionsError = (e as Error).message;
  }
  function setArea(area: PercentArea, image = source) {
    if (area.width <= 0 || area.height <= 0) return;
    setCrop(area);
    if (image && locked) {
      const pixels = pixelArea(area, image.width, image.height),
        fitted = fitDimensions(
          Number(width) || pixels.width,
          ((Number(width) || pixels.width) * pixels.height) / pixels.width
        );
      setWidth(String(fitted.width));
      setHeight(String(fitted.height));
    }
  }
  async function open(file?: File) {
    if (!file) return;
    const run = ++loadVersion.current;
    setLoading(true);
    setError("");
    let url: string | undefined;
    try {
      await validateRasterFile(file);
      url = URL.createObjectURL(file);
      const img = await loadImage(url);
      if (run !== loadVersion.current || !alive.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const next = { file, url, width: img.naturalWidth, height: img.naturalHeight };
      const dims = fitDimensions(next.width, next.height);
      setSource(next);
      setCrop(centeredArea(next.width, next.height));
      setPreset("free");
      setZoom(100);
      setLocked(true);
      setWidth(String(dims.width));
      setHeight(String(dims.height));
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      if (run === loadVersion.current && alive.current)
        setError(e instanceof Error ? e.message : "Could not load this image.");
    } finally {
      if (run === loadVersion.current && alive.current) setLoading(false);
    }
  }
  function changePreset(value: string, ratio?: number) {
    setPreset(value);
    if (source) setArea(centeredArea(source.width, source.height, ratio));
  }
  function dimension(value: string, axis: "width" | "height") {
    if (axis === "width") setWidth(value);
    else setHeight(value);
    if (locked && source) {
      const area = pixelArea(crop, source.width, source.height),
        next = pairedDimension(value, area.width / area.height, axis);
      if (axis === "width") setHeight(next);
      else setWidth(next);
    }
  }
  async function generate() {
    if (!source || busy || dimensionsError) return;
    const run = ++version.current;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { exportCrop } = await import("../lib/export-image");
      const blob = await exportCrop(
        source.url,
        crop,
        Number(width),
        Number(height),
        format,
        quality
      );
      if (run !== version.current || !alive.current) return;
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        name: imageFilename(source.file.name, format),
        width: Number(width),
        height: Number(height),
      });
    } catch (e) {
      if (run === version.current && alive.current)
        setError(e instanceof Error ? e.message : "Could not export this image.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className={`workspace-page page-width ${ui.toolkit} ${styles.scope}`}>
      <ToolHeader title="Image Resizer & Cropper" icon={<Crop size={24} />} />
      <p className={ui.hint}>
        Frame the part you want, choose exact pixel dimensions, and export a fresh image.
      </p>
      <DropArea
        className={ui.section}
        label="Upload image"
        title={source ? "Replace your image" : "Drop an image to start"}
        description="JPG, PNG, WebP · Up to 30 MB and 40 megapixels"
        icon={<Upload size={26} />}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        buttonLabel={source ? "Replace image" : "Choose image"}
        buttonIcon={null}
        loading={loading}
        onFiles={(files) => {
          if (files.length > 1) setError("Choose one image at a time.");
          else void open(files[0]);
        }}
        actions={
          source ? (
            <ActionButton
              onClick={() => {
                loadVersion.current++;
                setLoading(false);
                setSource(null);
                setResult(null);
                setError("");
              }}
            >
              Remove image
            </ActionButton>
          ) : undefined
        }
      />
      {source ? (
        <div className={`${styles.layout} ${ui.section}`}>
          <section className={`${ui.panel} ${ui.stack}`} aria-label="Crop editor">
            <div className={ui.row}>
              <h2>Crop your image</h2>
              <ActionButton
                size="sm"
                iconOnly
                aria-label="Reset crop"
                tooltip="Reset crop"
                onClick={() => {
                  changePreset("free");
                  setZoom(100);
                }}
              >
                <RotateCcw size={16} />
              </ActionButton>
            </div>
            <p className={`${ui.hint} ${styles.filename}`}>
              {source.file.name} · {source.width} × {source.height} px ·{" "}
              {formatBytes(source.file.size)}
            </p>
            <ImageEditor
              url={source.url}
              width={source.width}
              height={source.height}
              crop={{ ...crop, unit: "%" }}
              aspect={aspect}
              zoom={zoom}
              onChange={setArea}
            />
            <p className={ui.hint}>
              Drag the selection or its handles. Tab to a handle and use arrow keys for
              precise adjustments.
            </p>
            <label className={ui.field}>
              Editor zoom · {zoom}%{zoom === 100 ? " · Fit" : ""}
              <input
                type="range"
                min={100}
                max={250}
                step={10}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <p className={ui.hint}>
              At 100%, the entire image fits inside the editor. Zoom in for finer
              adjustments and scroll to pan. Your crop stays attached to the original
              pixels.
            </p>
          </section>
          <section
            className={`${ui.panel} ${ui.stack}`}
            aria-label="Resize and export settings"
          >
            <h2>Size & output</h2>
            <CustomSelect
              label="Crop aspect ratio"
              value={preset}
              onChange={(v) =>
                changePreset(
                  v,
                  v === "custom"
                    ? validCustomRatio
                      ? customRatio
                      : 1
                    : ratioPresets.find((p) => p.value === v)?.ratio
                )
              }
              options={ratioPresets.map((p) => ({ value: p.value, label: p.label }))}
            />
            {preset === "custom" && (
              <div className={ui.row}>
                <label className={ui.field}>
                  Ratio width
                  <input
                    type="number"
                    min={0.01}
                    max={1000}
                    step="any"
                    value={customW}
                    onChange={(e) => {
                      setCustomW(e.target.value);
                      const r = Number(e.target.value) / Number(customH);
                      if (validRatioPart(e.target.value) && validRatioPart(customH))
                        setArea(centeredArea(source.width, source.height, r));
                    }}
                  />
                </label>
                <label className={ui.field}>
                  Ratio height
                  <input
                    type="number"
                    min={0.01}
                    max={1000}
                    step="any"
                    value={customH}
                    onChange={(e) => {
                      setCustomH(e.target.value);
                      const r = Number(customW) / Number(e.target.value);
                      if (validRatioPart(customW) && validRatioPart(e.target.value))
                        setArea(centeredArea(source.width, source.height, r));
                    }}
                  />
                </label>
              </div>
            )}
            <p className={ui.hint}>
              3:4 and 4:6 are aspect ratios, not physical print sizes. Set pixel
              dimensions for your printer’s DPI; for example, 4 × 6 inches at 300 DPI
              needs 1200 × 1800 px. No passport-photo compliance is implied.
            </p>
            <div className={ui.row}>
              <label className={ui.field}>
                Width (px)
                <input
                  type="number"
                  min={1}
                  max={8192}
                  step={1}
                  value={width}
                  onChange={(e) => dimension(e.target.value, "width")}
                />
              </label>
              <label className={ui.field}>
                Height (px)
                <input
                  type="number"
                  min={1}
                  max={8192}
                  step={1}
                  value={height}
                  onChange={(e) => dimension(e.target.value, "height")}
                />
              </label>
            </div>
            <ActionButton
              aria-pressed={locked}
              onClick={() => {
                setLocked(!locked);
                if (!locked) {
                  const a = pixelArea(crop, source.width, source.height);
                  setHeight(pairedDimension(width, a.width / a.height, "width"));
                }
              }}
            >
              {locked ? <LockKeyhole size={15} /> : <LockKeyholeOpen size={15} />}
              {locked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
            </ActionButton>
            <p className={ui.hint}>
              {locked
                ? "Width and height follow the selected crop ratio."
                : "Width and height are independent; the crop will stretch to fit."}{" "}
              Maximum: 8,192 px per side and 16 megapixels.
            </p>
            <CustomSelect
              label="Output format"
              value={format}
              onChange={(v) => setFormat(v as ImageMime)}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WebP" },
              ]}
            />
            <label className={ui.field}>
              Quality · {quality}%
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                disabled={format === "image/png"}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </label>
            <p className={ui.hint}>
              PNG uses lossless encoding and ignores quality. JPG fills transparent areas
              with white. Metadata is not preserved.
            </p>
            {dimensionsError && (
              <p className={`${ui.hint} ${ui.error}`} role="alert">
                {dimensionsError}
              </p>
            )}
            <ActionButton
              variant="primary"
              loading={busy}
              disabled={!!dimensionsError || loading}
              onClick={() => void generate()}
            >
              Generate image
            </ActionButton>
            {result && (
              <div className={styles.result} aria-live="polite">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.url} alt="Exported crop preview" />
                <p className={ui.hint}>
                  {result.width} × {result.height} px · {formatBytes(result.blob.size)} ·{" "}
                  {result.name}
                </p>
                <ActionButton
                  variant="primary"
                  onClick={() => downloadBlob(result.blob, result.name)}
                >
                  <Download size={15} />
                  Download image
                </ActionButton>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className={`${ui.panel} ${ui.section} ${ui.stack}`}>
          <h2>A better fit for every image</h2>
          <p className={ui.hint}>
            Create square thumbnails, social portraits, landscape banners, or a custom
            crop. Start with an image to preview the selection and set your final
            dimensions.
          </p>
        </section>
      )}
      {error && (
        <p role="alert" className={`${ui.notice} ${ui.error}`}>
          {error}
        </p>
      )}
      <p className={`${ui.hint} ${ui.section}`}>
        Your images are processed locally in your browser. They are not uploaded to our
        server.
      </p>
    </div>
  );
}
