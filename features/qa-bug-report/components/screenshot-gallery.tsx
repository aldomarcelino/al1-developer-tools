"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Download, Expand, ShieldCheck, X } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { downloadBlob } from "@/lib/browser/download";
import type { Attachment } from "../lib/model";
import styles from "../styles.module.css";
export function ScreenshotGallery({
  images,
  onReview,
  notify,
}: {
  images: Attachment[];
  onReview: (id: string, reviewed: boolean) => void;
  notify: (message: string) => void;
}) {
  const [active, setActive] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images.find((a) => a.id === active);
  const activeImageId = image?.id;
  useEffect(() => {
    const node = dialog.current;
    if (activeImageId && !node?.open) node?.showModal();
    if (!activeImageId) node?.close();
    return () => node?.close();
  }, [activeImageId]);
  function download(a: Attachment) {
    if (!a.reviewed) {
      notify("Review this screenshot before downloading it.");
      return;
    }
    downloadBlob(
      new Blob([Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0))], {
        type: a.mimeType,
      }),
      a.name
    );
  }
  return (
    <section className={styles.gallery} aria-label="Screenshot evidence">
      <div className={styles.sectionLabel}>
        <span>
          <Camera size={16} />
          Screenshots
        </span>
        <span className={styles.badge}>{images.length}</span>
      </div>
      {!images.length ? (
        <div className={styles.noScreenshots}>
          <Camera size={24} />
          <p>No screenshots in this capture.</p>
          <span>
            Images saved during testing appear here. Standalone screenshots download
            directly from the extension.
          </span>
        </div>
      ) : (
        images.map((a, index) => (
          <figure className={styles.galleryCard} key={a.id}>
            <button
              className={styles.imageOpen}
              onClick={() => setActive(a.id)}
              aria-label={`Open screenshot ${index + 1}: ${a.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Evidence is a validated local raster; never request remote image optimization. */}
              <img
                src={`data:${a.mimeType};base64,${a.base64}`}
                alt={`Captured evidence: ${a.name}`}
              />
              <span>
                <Expand size={14} />
                Open preview
              </span>
            </button>
            <figcaption>
              <div>
                <strong>{a.name}</strong>
                <span>{a.reviewed ? "Visually reviewed" : "Needs visual review"}</span>
              </div>
              <ActionButton
                iconOnly
                aria-label={`Download screenshot ${a.name}`}
                tooltip={
                  a.reviewed ? "Download screenshot" : "Review this screenshot first"
                }
                disabled={!a.reviewed}
                onClick={() => download(a)}
              >
                <Download size={15} />
              </ActionButton>
            </figcaption>
          </figure>
        ))
      )}
      {!!images.length && (
        <p className={styles.hint}>
          <ShieldCheck size={13} /> Text redaction does not change image pixels.
        </p>
      )}
      <dialog
        ref={dialog}
        className={styles.imageDialog}
        aria-label="Screenshot preview"
        onCancel={() => setActive("")}
        onClose={() => setActive("")}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setActive("");
          }
        }}
      >
        {image && (
          <>
            <header>
              <div>
                <span className={styles.eyebrow}>SCREENSHOT EVIDENCE</span>
                <h2>{image.name}</h2>
              </div>
              <ActionButton
                iconOnly
                aria-label="Close screenshot preview"
                tooltip={false}
                className={styles.dialogClose}
                onClick={() => setActive("")}
              >
                <X size={18} />
              </ActionButton>
            </header>
            <div className={styles.imageStage}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Local raster evidence stays on-device. */}
              <img
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt={`Full preview: ${image.name}`}
              />
            </div>
            <footer>
              <label>
                <input
                  type="checkbox"
                  checked={image.reviewed}
                  onChange={(event) => onReview(image.id, event.target.checked)}
                />
                I reviewed this screenshot for private information
              </label>
              <ActionButton
                variant="primary"
                disabled={!image.reviewed}
                onClick={() => download(image)}
              >
                <Download size={15} />
                Download image
              </ActionButton>
            </footer>
            <p className={styles.hint}>
              Text redaction does not censor this image. Review or edit sensitive pixels
              before sharing.
            </p>
          </>
        )}
      </dialog>
    </section>
  );
}
