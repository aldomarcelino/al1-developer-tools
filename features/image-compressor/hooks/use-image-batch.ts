"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_BATCH_BYTES,
  MAX_BATCH_FILES,
  outputDimensions,
  outputFileName,
  type ExportSettings,
} from "../lib/batch";
import {
  readImage,
  convertImage,
  type ImageSource,
  type ImageResult,
} from "../lib/process-image";

export type BatchItem = { id: string; file: File };
export type BatchStatus = "queued" | "processing" | "ready" | "error";
export function useImageBatch(settings: ExportSettings) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [sources, setSources] = useState<Record<string, ImageSource>>({});
  const [results, setResults] = useState<Record<string, ImageResult>>({});
  const [statuses, setStatuses] = useState<Record<string, BatchStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const revision = useRef(0);
  const queueRef = useRef<BatchItem[]>([]);
  const sourceCache = useRef<Record<string, ImageSource>>({});
  const resultCache = useRef<Record<string, ImageResult>>({});
  // A new run waits for cancelled canvas work to finish, keeping decoding sequential.
  const tail = useRef<Promise<void>>(Promise.resolve());
  const { format, quality, scaleMode, width, height, lockAspectRatio } = settings;

  const releaseResults = useCallback(() => {
    for (const value of Object.values(resultCache.current))
      URL.revokeObjectURL(value.url);
    resultCache.current = {};
  }, []);

  const addFiles = useCallback((files: File[]) => {
    let bytes = queueRef.current.reduce((sum, item) => sum + item.file.size, 0);
    const next = [...queueRef.current];
    let skipped = 0;
    for (const file of files) {
      if (next.length >= MAX_BATCH_FILES || bytes + file.size > MAX_BATCH_BYTES) {
        skipped++;
        continue;
      }
      bytes += file.size;
      next.push({ id: crypto.randomUUID(), file });
    }
    if (next.length !== queueRef.current.length) {
      revision.current++;
      queueRef.current = next;
      setItems(next);
    }
    setNotice(
      skipped ? `${skipped} file(s) skipped. Limit: 20 images and 150 MB total.` : ""
    );
  }, []);

  const remove = useCallback((id: string) => {
    revision.current++;
    const next = queueRef.current.filter((item) => item.id !== id);
    queueRef.current = next;
    if (sourceCache.current[id]) URL.revokeObjectURL(sourceCache.current[id].url);
    delete sourceCache.current[id];
    setSources({ ...sourceCache.current });
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    revision.current++;
    queueRef.current = [];
    for (const source of Object.values(sourceCache.current))
      URL.revokeObjectURL(source.url);
    for (const id of Object.keys(sourceCache.current)) delete sourceCache.current[id];
    releaseResults();
    setItems([]);
    setSources({});
    setResults({});
    setErrors({});
    setStatuses({});
    setNotice("");
    setBusy(false);
  }, [releaseResults]);

  useEffect(() => {
    const pendingRevision = revision;
    const id = ++pendingRevision.current;
    releaseResults();
    setResults({});
    setErrors({});
    setStatuses(Object.fromEntries(items.map((item) => [item.id, "queued"])));
    setBusy(items.length > 0);
    const current = () => revision.current === id;
    const timer = setTimeout(() => {
      tail.current = tail.current
        .catch(() => {})
        .then(async () => {
          const usedNames = new Set<string>();
          for (const item of items) {
            if (!current()) return;
            setStatuses((prev) => ({ ...prev, [item.id]: "processing" }));
            try {
              let source = sourceCache.current[item.id];
              if (!source) {
                source = await readImage(item.file);
                if (!current()) {
                  URL.revokeObjectURL(source.url);
                  return;
                }
                sourceCache.current[item.id] = source;
                setSources({ ...sourceCache.current });
              }
              const dimensions = outputDimensions(source.width, source.height, {
                format,
                quality,
                scaleMode,
                width,
                height,
                lockAspectRatio,
              });
              const converted = await convertImage(
                source,
                format,
                quality,
                dimensions.width,
                dimensions.height
              );
              if (!current()) return;
              const outputBytes = Object.values(resultCache.current).reduce(
                (sum, value) => sum + value.blob.size,
                0
              );
              if (outputBytes + converted.blob.size > MAX_BATCH_BYTES)
                throw new Error(
                  "Combined output exceeds 150 MB. Use WebP, resize, or process fewer images."
                );
              const result = {
                ...converted,
                url: URL.createObjectURL(converted.blob),
                name: outputFileName(item.file.name, converted.format, usedNames),
              };
              resultCache.current[item.id] = result;
              setResults({ ...resultCache.current });
              setStatuses((prev) => ({ ...prev, [item.id]: "ready" }));
            } catch (error) {
              if (!current()) return;
              setErrors((prev) => ({
                ...prev,
                [item.id]:
                  error instanceof Error ? error.message : "Could not process image.",
              }));
              setStatuses((prev) => ({ ...prev, [item.id]: "error" }));
            }
            // Let the browser paint progress and respond to settings/cancel between images.
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          if (current()) setBusy(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      pendingRevision.current++;
    };
  }, [
    items,
    format,
    quality,
    scaleMode,
    width,
    height,
    lockAspectRatio,
    retry,
    releaseResults,
  ]);

  useEffect(() => {
    const sourceResources = sourceCache.current;
    const pendingRevision = revision;
    return () => {
      pendingRevision.current++;
      for (const value of Object.values(sourceResources)) URL.revokeObjectURL(value.url);
      releaseResults();
    };
  }, [releaseResults]);

  return {
    items,
    sources,
    results,
    statuses,
    errors,
    notice,
    busy,
    addFiles,
    remove,
    clear,
    retry: () => setRetry((n) => n + 1),
  };
}
