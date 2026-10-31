"use client";
import { useEffect, useRef, useState } from "react";
import { imagePdfLimits, type PdfImage } from "../lib/image-pdf";
import { prepareImage } from "../lib/prepare-image";
export type QueuedImage = PdfImage & { id: string; url: string; sourceBytes: number };

export function usePdfImages() {
  const [images, setImages] = useState<QueuedImage[]>([]);
  const current = useRef<QueuedImage[]>([]);
  const revision = useRef(0);
  const reading = useRef(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(
    () => () => {
      revision.current++;
      for (const image of current.current) URL.revokeObjectURL(image.url);
    },
    []
  );
  function commit(items: QueuedImage[]) {
    current.current = items;
    setImages(items);
  }
  async function add(files: File[]) {
    if (reading.current) return;
    reading.current = true;
    setLoading(true);
    setNotice("");
    const id = revision.current;
    let added = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        if (id !== revision.current) break;
        try {
          if (current.current.length >= imagePdfLimits.files)
            throw new Error("Limit: 20 images.");
          const totalBytes = current.current.reduce(
            (n, image) => n + image.sourceBytes,
            0
          );
          if (totalBytes + file.size > imagePdfLimits.totalBytes)
            throw new Error("Combined files exceed 50 MB.");
          const image = await prepareImage(file);
          if (id !== revision.current) break;
          if (
            current.current.reduce((n, item) => n + item.width * item.height, 0) +
              image.width * image.height >
            imagePdfLimits.totalPixels
          )
            throw new Error("Combined images exceed 64 megapixels.");
          if (
            current.current.reduce((n, item) => n + item.bytes.byteLength, 0) +
              image.bytes.byteLength >
            imagePdfLimits.encodedBytes
          )
            throw new Error("Prepared images exceed 75 MB.");
          const url = URL.createObjectURL(
            new Blob([image.bytes], { type: `image/${image.format}` })
          );
          commit([
            ...current.current,
            { ...image, url, id: crypto.randomUUID(), sourceBytes: file.size },
          ]);
          added++;
        } catch (cause) {
          failures.push(
            `${file.name}: ${cause instanceof Error ? cause.message : "Could not read image."}`
          );
        }
      }
      if (id === revision.current)
        setNotice(
          `${added} image(s) added.${failures.length ? ` ${failures.slice(0, 3).join(" ")}${failures.length > 3 ? ` ${failures.length - 3} more skipped.` : ""}` : ""}`
        );
    } finally {
      reading.current = false;
      if (id === revision.current) setLoading(false);
    }
  }
  function remove(id: string) {
    const image = current.current.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.url);
    commit(current.current.filter((item) => item.id !== id));
  }
  function move(index: number, delta: number) {
    const items = [...current.current];
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    commit(items);
  }
  function clear() {
    revision.current++;
    for (const image of current.current) URL.revokeObjectURL(image.url);
    commit([]);
    setNotice("");
    setLoading(false);
  }
  return { images, loading, notice, add, remove, move, clear };
}
