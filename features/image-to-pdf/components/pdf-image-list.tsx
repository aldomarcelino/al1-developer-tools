"use client";
/* eslint-disable @next/next/no-img-element -- Local object URLs are never uploaded. */
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import type { QueuedImage } from "../hooks/use-pdf-images";
import { formatBytes } from "@/lib/format/file-size";
import shared from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";

export function PdfImageList({
  images,
  disabled,
  move,
  remove,
}: {
  images: QueuedImage[];
  disabled: boolean;
  move: (index: number, delta: number) => void;
  remove: (id: string) => void;
}) {
  return (
    <ol className={styles.queue} aria-label="PDF page order">
      {images.map((image, index) => (
        <li className={styles.card} key={image.id}>
          <div className={styles.heading}>
            <strong>Page {index + 1}</strong>
            <div className={shared.row}>
              <ActionButton
                size="sm"
                iconOnly
                title={`Move ${image.name} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={14} />
              </ActionButton>
              <ActionButton
                size="sm"
                iconOnly
                title={`Move ${image.name} down`}
                disabled={disabled || index === images.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={14} />
              </ActionButton>
              <ActionButton
                size="sm"
                variant="danger"
                iconOnly
                title={`Remove ${image.name}`}
                disabled={disabled}
                onClick={() => remove(image.id)}
              >
                <Trash2 size={14} />
              </ActionButton>
            </div>
          </div>
          <img
            src={image.url}
            alt={image.name}
            width={image.width}
            height={image.height}
            className={styles.thumbnail}
          />
          <strong className={styles.name} title={image.name}>
            {image.name}
          </strong>
          <p className={shared.hint}>
            {image.width} × {image.height} px · {formatBytes(image.sourceBytes)}
          </p>
        </li>
      ))}
    </ol>
  );
}
