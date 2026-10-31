"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  GripVertical,
  ExternalLink,
} from "lucide-react";
import styles from "../styles.module.css";

type PageProps = {
  id: string;
  index: number;
  pageIndex: number;
  name: string;
  url: string;
  selected: boolean;
  busy: boolean;
  count: number;
  onSelect: (selected: boolean) => void;
  onMove: (direction: number) => void;
};

export function PdfPagePreview({ name, pageIndex }: { name: string; pageIndex: number }) {
  return (
    <div className={styles.preview}>
      <div className={styles.paper}>
        <FileText size={26} strokeWidth={1.3} aria-hidden="true" />
        <strong>{pageIndex + 1}</strong>
        <span>Source page</span>
      </div>
      <span className={styles.fileName} title={name}>
        {name}
      </span>
    </div>
  );
}

export function SortablePdfPage({
  id,
  index,
  pageIndex,
  name,
  url,
  selected,
  busy,
  count,
  onSelect,
  onMove,
}: PageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: busy });

  return (
    <article
      ref={setNodeRef}
      className={styles.page}
      data-selected={selected}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className={styles.cardHeader}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={styles.handle}
          disabled={busy}
          aria-label={`Reorder page ${index + 1}: ${name}, source page ${pageIndex + 1}`}
        >
          <GripVertical size={17} aria-hidden="true" />
        </button>
        <label className={styles.selectPage}>
          <span>Order {index + 1}</span>
          <input
            type="checkbox"
            checked={selected}
            disabled={busy}
            aria-label={`Include source page ${pageIndex + 1} from ${name}`}
            onChange={(event) => onSelect(event.target.checked)}
          />
        </label>
      </div>
      <PdfPagePreview name={name} pageIndex={pageIndex} />
      <div className={styles.cardFooter}>
        <div className={styles.moveButtons}>
          <button
            type="button"
            className={styles.iconButton}
            disabled={busy || index === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move order ${index + 1} earlier`}
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={busy || index === count - 1}
            onClick={() => onMove(1)}
            aria-label={`Move order ${index + 1} later`}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <a
          href={`${url}#page=${pageIndex + 1}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewPage}
          aria-label={`View source page ${pageIndex + 1} from ${name}`}
        >
          View <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
