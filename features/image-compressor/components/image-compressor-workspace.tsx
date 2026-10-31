"use client";

import styles from "../styles.module.css";

import { useNotice } from "@/hooks/use-notice";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, Sparkles, FolderOpen, AlertCircle } from "lucide-react";

import { downloadBlob } from "@/lib/browser/download";
import { DropArea } from "@/components/ui/drop-area";
import { ActionButton } from "@/components/ui/action-button";
import { ToolHeader } from "@/components/cummon/tool-header";

import { useImageBatch } from "../hooks/use-image-batch";
import { ImageBatchQueue } from "./image-batch-queue";
import { createSampleImage } from "../lib/sample-image";
import { createZip } from "@/lib/browser/zip";
import type { ExportSettings } from "../lib/batch";
import { ImageExportSettings } from "./image-export-settings";
import { ImageComparison } from "./image-comparison";

export function ImageCompressorWorkspace() {
  const [settings, setSettings] = useState<ExportSettings>({
    format: "image/webp",
    quality: 80,
    scaleMode: "100",
    width: "",
    height: "",
    lockAspectRatio: true,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const [zipping, setZipping] = useState(false);
  const [notice, setNoticeWithTimeout] = useNotice("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batch = useImageBatch(settings);
  const { addFiles } = batch;
  const activeItem =
    batch.items.find((item) => item.id === selectedId && batch.sources[item.id]) ??
    batch.items.find((item) => batch.sources[item.id]);
  const source = activeItem ? batch.sources[activeItem.id] : undefined;
  const result = activeItem ? batch.results[activeItem.id] : undefined;
  const busy = activeItem
    ? batch.statuses[activeItem.id] === "processing" ||
      batch.statuses[activeItem.id] === "queued"
    : batch.busy;
  const error = activeItem ? batch.errors[activeItem.id] || "" : "";

  const downloadAll = async () => {
    setZipping(true);
    try {
      const ready = Object.values(batch.results);
      const files = [];
      for (const output of ready)
        files.push({
          name: output.name,
          bytes: new Uint8Array(await output.blob.arrayBuffer()),
        });
      const archive = createZip(files);
      downloadBlob(
        new Blob([archive], { type: "application/zip" }),
        "ramupod-images.zip"
      );
      setNoticeWithTimeout(`Downloaded ${ready.length} images as ZIP.`);
    } catch (error) {
      setNoticeWithTimeout(
        error instanceof Error
          ? error.message
          : "Could not create ZIP. Download images individually."
      );
    } finally {
      setZipping(false);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  return (
    <div
      className={`workspace-page page-width utility-tool ${styles.scope}`}
      onDragOver={(e) => {
        if (batch.items.length) e.preventDefault();
      }}
      onDrop={(e) => {
        if (batch.items.length) {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <ToolHeader title="Image Compressor & Converter" icon={<ImageIcon size={24} />} />

      {batch.items.length > 0 ? (
        <ImageBatchQueue
          items={batch.items}
          sources={batch.sources}
          results={batch.results}
          statuses={batch.statuses}
          errors={batch.errors}
          selectedId={activeItem?.id}
          busy={batch.busy}
          zipping={zipping}
          onSelect={setSelectedId}
          onAdd={() => fileInputRef.current?.click()}
          onRemove={batch.remove}
          onClear={batch.clear}
          onRetry={batch.retry}
          onDownloadAll={() => void downloadAll()}
        />
      ) : null}
      {batch.notice ? (
        <p className="utility-notice" role="status">
          {batch.notice}
        </p>
      ) : null}
      <DropArea
        variant="stacked"
        className={styles.dropArea}
        hidden={batch.items.length > 0}
        label="Add images to compress"
        inputRef={fileInputRef}
        accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.bmp,.gif"
        multiple
        icon={<Upload size={28} />}
        title="Drop images here, paste from clipboard, or browse"
        description="Fast, lossy & lossless compression directly inside your browser. No data leaves your computer."
        hint={
          <>
            Up to 20 images · 30 MB each · 150 MB total · Or press <kbd>Cmd+V</kbd> /{" "}
            <kbd>Ctrl+V</kbd> anywhere
          </>
        }
        buttonLabel="Browse images"
        buttonIcon={<FolderOpen size={14} />}
        onFiles={addFiles}
        actions={
          <ActionButton
            onClick={async () => {
              const sample = await createSampleImage();
              addFiles([
                sample,
                new File([sample], "sample-mountains.jpg", { type: sample.type }),
                new File([sample], "sample-sunset.jpg", { type: sample.type }),
              ]);
              setNoticeWithTimeout(
                "Three sample images added. Select any image to compare."
              );
            }}
          >
            <Sparkles size={14} />
            Try sample batch
          </ActionButton>
        }
      />
      {batch.items.length > 0 && source ? (
        /* Image Loaded View */
        <>
          <p className="compressor-selected-label">
            Comparing <strong>{source.file.name}</strong>
          </p>

          <ImageExportSettings
            settings={settings}
            onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
            source={source}
            result={result}
            busy={busy}
            error={error}
          />

          <ImageComparison source={source} result={result} busy={busy} error={error} />
        </>
      ) : null}

      {error && (
        <div className="compressor-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <p className="utility-notice" role="status" style={{ marginTop: "16px" }}>
          {notice}
        </p>
      )}
    </div>
  );
}
