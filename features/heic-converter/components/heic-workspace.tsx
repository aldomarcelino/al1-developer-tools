"use client";
import { useEffect, useRef, useState } from "react";
import { Download, FileImage, Trash2, Upload } from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { downloadBlob } from "@/lib/browser/download";
import { createZip } from "@/lib/browser/zip";
import { formatBytes } from "@/lib/format/file-size";
import { imageFilename, type ImageMime } from "@/lib/browser/image-codec";
import {
  HEIC_MAX_FILES,
  HEIC_MAX_TOTAL_BYTES,
  HEIC_MAX_RESULT_BYTES,
  validateHeicFile,
} from "../lib/validation";
import ui from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";

type Item = {
  id: string;
  file: File;
  status: "queued" | "converting" | "ready" | "error";
  error?: string;
  result?: { blob: Blob; name: string; url: string };
};
export function HeicWorkspace() {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<ImageMime>("image/jpeg");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false),
    [zipping, setZipping] = useState(false);
  const [message, setMessage] = useState("");
  const queue = useRef<Item[]>([]),
    controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const update = (next: Item[]) => {
    queue.current = next;
    setItems(next);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      queue.current.forEach((i) => {
        if (i.result) URL.revokeObjectURL(i.result.url);
      });
    };
  }, []);
  function add(files: File[]) {
    if (controller.current || zipping) return;
    const next = [...queue.current];
    let bytes = next.reduce((n, i) => n + i.file.size, 0),
      skipped = 0;
    for (const file of files) {
      if (next.length >= HEIC_MAX_FILES || bytes + file.size > HEIC_MAX_TOTAL_BYTES) {
        skipped++;
        continue;
      }
      let error: string | undefined;
      try {
        validateHeicFile(file);
      } catch (e) {
        error = (e as Error).message;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        status: error ? "error" : "queued",
        error,
      });
      bytes += file.size;
    }
    update(next);
    setMessage(
      skipped ? `${skipped} file(s) skipped. Limit: 20 files and 100 MB total.` : ""
    );
  }
  function remove(id?: string) {
    const removed = queue.current.filter((i) => !id || i.id === id);
    removed.forEach((i) => {
      if (i.result) URL.revokeObjectURL(i.result.url);
    });
    update(id ? queue.current.filter((i) => i.id !== id) : []);
    setMessage("");
  }
  async function convert() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setMessage("");
    // Start fresh on explicit conversion, keeping every file tied to one settings snapshot.
    queue.current.forEach((i) => {
      if (i.result) URL.revokeObjectURL(i.result.url);
    });
    update(
      queue.current.map((i) => ({
        ...i,
        result: undefined,
        error: undefined,
        status: "queued",
      }))
    );
    const used = new Set<string>();
    let bytes = 0;
    try {
      const { convertHeic } = await import("../lib/convert");
      for (const item of [...queue.current]) {
        if (abort.signal.aborted) break;
        update(
          queue.current.map((i) =>
            i.id === item.id ? { ...i, status: "converting" } : i
          )
        );
        try {
          const blob = await convertHeic(item.file, format, quality, abort.signal);
          if (abort.signal.aborted || !mounted.current) break;
          if (bytes + blob.size > HEIC_MAX_RESULT_BYTES)
            throw new Error("Batch output exceeds 150 MB. Remove some files and retry.");
          bytes += blob.size;
          const result = {
            blob,
            name: imageFilename(item.file.name, format, used),
            url: URL.createObjectURL(blob),
          };
          update(
            queue.current.map((i) =>
              i.id === item.id ? { ...i, status: "ready", result } : i
            )
          );
        } catch (e) {
          if (abort.signal.aborted || !mounted.current) break;
          update(
            queue.current.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error",
                    error: e instanceof Error ? e.message : "Conversion failed.",
                  }
                : i
            )
          );
        }
      }
    } catch {
      if (mounted.current)
        setMessage("Could not load the local decoder. Reload the page and try again.");
    } finally {
      if (mounted.current) {
        update(
          queue.current.map((i) =>
            i.status === "converting" ? { ...i, status: "queued" } : i
          )
        );
        setBusy(false);
      }
      if (controller.current === abort) controller.current = null;
    }
  }
  const results = items.flatMap((i) => (i.result ? [i.result] : []));
  async function downloadAll() {
    setZipping(true);
    setMessage("");
    try {
      if (results.length === 1) downloadBlob(results[0].blob, results[0].name);
      else {
        const files = [];
        for (const r of results)
          files.push({ name: r.name, bytes: new Uint8Array(await r.blob.arrayBuffer()) });
        if (mounted.current)
          downloadBlob(
            new Blob([createZip(files)], { type: "application/zip" }),
            "converted-images.zip"
          );
      }
    } catch {
      if (mounted.current)
        setMessage(
          "Could not create the ZIP. Download files individually or try a smaller batch."
        );
    } finally {
      if (mounted.current) setZipping(false);
    }
  }
  return (
    <div className={`workspace-page page-width ${ui.toolkit} ${styles.scope}`}>
      <ToolHeader title="HEIC to JPG / PNG Converter" icon={<FileImage size={24} />} />
      <p className={ui.hint}>
        Make iPhone and HEIF photos easier to share. Convert one image or a batch,
        entirely on your device.
      </p>
      <DropArea
        className={styles.upload}
        label="Add HEIC images"
        title="Drop HEIC or HEIF photos here"
        description="Up to 20 files · 20 MB per file · 100 MB combined"
        icon={<Upload size={26} />}
        accept=".heic,.heif,image/heic,image/heif"
        multiple
        disabled={busy || zipping}
        buttonLabel="Choose files"
        buttonIcon={null}
        onFiles={add}
      />
      <div className={`${ui.layout} ${styles.content}`}>
        <section
          className={`${ui.panel} ${ui.stack} ${styles.panel}`}
          aria-label="Conversion settings"
        >
          <h2>Conversion settings</h2>
          <CustomSelect
            layout="stacked"
            className={styles.formatSelect}
            label="Output format"
            value={format}
            disabled={busy || zipping}
            onChange={(v) => setFormat(v as ImageMime)}
            options={[
              { value: "image/jpeg", label: "JPG · smaller, easy to share" },
              { value: "image/png", label: "PNG · lossless output" },
            ]}
          />
          <label className={ui.field}>
            JPG quality · {quality}%
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              disabled={format === "image/png" || busy || zipping}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
          </label>
          <p className={ui.hint}>
            PNG is generally larger and ignores JPG quality. Conversion exports the
            primary still image; photo metadata and Live Photo motion are not preserved.
          </p>
          <div className={ui.row}>
            <ActionButton
              variant="primary"
              loading={busy}
              disabled={!items.length || zipping}
              onClick={() => void convert()}
            >
              Convert {items.length > 1 ? `${items.length} files` : "image"}
            </ActionButton>
            {busy && (
              <ActionButton onClick={() => controller.current?.abort()}>
                Stop conversion
              </ActionButton>
            )}
          </div>
          <p className={ui.hint}>
            One file is processed at a time. The decoder does not report a precise
            per-file percentage.
          </p>
        </section>
        <section
          className={`${ui.panel} ${ui.stack} ${styles.panel}`}
          aria-label="File queue"
        >
          <div className={`${ui.row} ${styles.queueHeading}`}>
            <h2>File queue · {items.length}</h2>
            <ActionButton
              size="sm"
              iconOnly
              variant="danger"
              aria-label="Clear all"
              tooltip="Clear all files"
              disabled={!items.length || busy || zipping}
              onClick={() => remove()}
            >
              <Trash2 size={15} />
            </ActionButton>
          </div>
          {!items.length ? (
            <p className={ui.hint}>
              Your selected photos and converted downloads will appear here.
            </p>
          ) : (
            <>
              <p className={ui.hint} role="status">
                {results.length} ready ·{" "}
                {items.filter((i) => i.status === "error").length} failed
                {busy ? " · Converting…" : ""}
              </p>
              <progress
                aria-label="Batch conversion progress"
                max={items.length}
                value={items.filter((i) => ["ready", "error"].includes(i.status)).length}
                className={styles.progress}
              />
            </>
          )}
          <ul className={styles.queue} hidden={!items.length}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.file}>
                  <strong>{item.file.name}</strong>
                  <span>
                    {formatBytes(item.file.size)} ·{" "}
                    {item.status === "converting" ? "Converting…" : item.status}
                  </span>
                </div>
                <ActionButton
                  iconOnly
                  size="sm"
                  aria-label={`Remove ${item.file.name}`}
                  disabled={busy || zipping}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 size={15} />
                </ActionButton>
                {item.error && (
                  <p className={`${ui.hint} ${ui.error} ${styles.full}`} role="alert">
                    {item.error}
                  </p>
                )}
                {item.result && (
                  <div className={`${styles.result} ${styles.full}`}>
                    <span>
                      {item.result.name} · {formatBytes(item.result.blob.size)}
                    </span>
                    <ActionButton
                      size="sm"
                      onClick={() => downloadBlob(item.result!.blob, item.result!.name)}
                    >
                      <Download size={14} />
                      Download
                    </ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!!results.length && (
            <ActionButton
              variant="primary"
              loading={zipping}
              disabled={busy}
              onClick={() => void downloadAll()}
            >
              <Download size={15} />
              {results.length > 1
                ? `Download all (${results.length}) · ZIP`
                : "Download converted image"}
            </ActionButton>
          )}
        </section>
      </div>
      {message && (
        <p role="alert" className={`${ui.notice} ${ui.error}`}>
          {message}
        </p>
      )}
      <p className={`${ui.hint} ${styles.privacy}`}>
        Your files are processed locally in your browser. They are not uploaded to our
        server.
      </p>
    </div>
  );
}
