/* eslint-disable @next/next/no-img-element -- Local object URLs are rendered in-browser. */
"use client";

import { useState } from "react";
import { Download, Check, Copy } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { formatFileSize, type RenderedPage } from "../lib/pdf-to-image";
import styles from "../pdf-to-image.module.css";

interface PagePreviewCardProps {
  page: RenderedPage;
  onDownload: (page: RenderedPage) => void;
}

export function PagePreviewCard({ page, onDownload }: PagePreviewCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return;
    }

    try {
      let blobToCopy = page.blob;
      if (page.blob.type !== "image/png") {
        const img = new Image();
        img.src = page.previewUrl;
        await new Promise((res) => {
          img.onload = res;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/png")
          );
          if (pngBlob) blobToCopy = pngBlob;
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [blobToCopy.type]: blobToCopy }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard copying fails
    }
  }

  return (
    <div className={styles.pageCard}>
      <div className={styles.cardTop}>
        <span className={styles.pageBadge}>Page {page.pageNumber}</span>
        <span className={styles.cardDimensions}>
          {page.width} x {page.height}
        </span>
      </div>

      <div className={styles.thumbWrapper}>
        <img
          src={page.previewUrl}
          alt={`Page ${page.pageNumber}`}
          className={styles.thumbImg}
          loading="lazy"
        />
      </div>

      <div className={styles.cardBottom}>
        <span className={styles.cardSize}>{formatFileSize(page.size)}</span>

        <div className={styles.actionsGroup}>
          {typeof ClipboardItem !== "undefined" && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title={copied ? "Copied image to clipboard" : "Copy image"}
              aria-label={`Copy page ${page.pageNumber}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </ActionButton>
          )}

          <ActionButton
            variant="primary"
            size="sm"
            onClick={() => onDownload(page)}
            title={`Download ${page.filename}`}
            aria-label={`Download page ${page.pageNumber}`}
          >
            <Download size={14} />
            Download
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
