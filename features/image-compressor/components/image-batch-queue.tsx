"use client";
/* eslint-disable @next/next/no-img-element -- Local image previews. */
import { Download, Images, LoaderCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { formatBytes } from "@/lib/format/file-size";
import { downloadBlob } from "@/lib/browser/download";
import type { BatchItem, BatchStatus } from "../hooks/use-image-batch";
import type { ImageSource, ImageResult } from "../lib/process-image";

type Props = {
  items: BatchItem[];
  sources: Record<string, ImageSource>;
  results: Record<string, ImageResult>;
  statuses: Record<string, BatchStatus>;
  errors: Record<string, string>;
  selectedId?: string;
  busy: boolean;
  zipping: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onRetry: () => void;
  onDownloadAll: () => void;
};
export function ImageBatchQueue(props: Props) {
  const { items, sources, results, statuses, errors, selectedId, busy } = props;
  const ready = Object.keys(results).length;
  const failed = Object.keys(errors).length;
  const originalSize = items.reduce(
    (sum, item) => sum + (results[item.id] ? item.file.size : 0),
    0
  );
  const outputSize = Object.values(results).reduce(
    (sum, result) => sum + result.blob.size,
    0
  );
  return (
    <section className="compressor-batch" aria-label="Image queue">
      <div className="compressor-batch-heading">
        <div>
          <h2>
            <Images size={17} /> {items.length} {items.length === 1 ? "image" : "images"}
          </h2>
          <p role="status">
            {busy
              ? `Processing · ${ready + failed} of ${items.length} finished`
              : `${ready} ready${failed ? ` · ${failed} failed` : ""}`}{" "}
            · Settings apply to every image
          </p>
        </div>
        <div className="compressor-batch-actions">
          <ActionButton size="sm" onClick={props.onAdd}>
            <Plus /> Add images
          </ActionButton>
          {failed > 0 && !busy ? (
            <ActionButton size="sm" onClick={props.onRetry}>
              <RotateCcw /> Retry
            </ActionButton>
          ) : null}
          <ActionButton
            size="sm"
            variant="danger"
            iconOnly
            title="Clear image queue"
            onClick={props.onClear}
          >
            <Trash2 />
          </ActionButton>
          <ActionButton
            size="sm"
            variant="primary"
            disabled={busy || !ready || props.zipping}
            onClick={props.onDownloadAll}
          >
            {props.zipping ? <LoaderCircle className="counter-spinner" /> : <Download />}{" "}
            {props.zipping ? "Creating ZIP…" : "Download all (.zip)"}
          </ActionButton>
        </div>
      </div>
      <progress
        className="compressor-batch-progress"
        max={items.length}
        value={ready + failed}
        aria-label="Images processed"
      />
      <div className="compressor-batch-list">
        {items.map((item) => {
          const source = sources[item.id],
            result = results[item.id];
          const status = statuses[item.id] ?? "queued";
          return (
            <div
              key={item.id}
              className={`compressor-batch-row ${selectedId === item.id ? "is-selected" : ""}`}
            >
              <button
                type="button"
                className="compressor-batch-select"
                disabled={!source}
                aria-pressed={selectedId === item.id}
                onClick={() => props.onSelect(item.id)}
              >
                {source ? (
                  <img src={source.url} alt="" />
                ) : (
                  <span className="compressor-batch-placeholder">
                    <Images size={18} />
                  </span>
                )}
                <span className="compressor-batch-name">
                  <strong>{item.file.name}</strong>
                  <span>
                    {formatBytes(item.file.size)}
                    {result
                      ? ` → ${formatBytes(result.blob.size)} · ${result.format.split("/")[1].toUpperCase()}`
                      : ""}
                  </span>
                </span>
              </button>
              <span className={`compressor-batch-status is-${status}`}>
                {status === "processing" ? (
                  <LoaderCircle size={13} className="counter-spinner" />
                ) : null}
                {status === "error"
                  ? errors[item.id]
                  : status === "ready"
                    ? "Ready"
                    : status === "processing"
                      ? "Processing…"
                      : "Queued"}
              </span>
              <div className="compressor-batch-actions">
                <ActionButton
                  size="sm"
                  variant="ghost"
                  iconOnly
                  title={`Download ${item.file.name}`}
                  disabled={!result}
                  onClick={() => result && downloadBlob(result.blob, result.name)}
                >
                  <Download />
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="danger"
                  iconOnly
                  title={`Remove ${item.file.name}`}
                  onClick={() => props.onRemove(item.id)}
                >
                  <Trash2 />
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
      <div className="compressor-batch-summary">
        <span>Click an image to compare its original and result.</span>
        {ready ? (
          <strong>
            {formatBytes(originalSize)} → {formatBytes(outputSize)} · {ready} ready
          </strong>
        ) : null}
      </div>
    </section>
  );
}
