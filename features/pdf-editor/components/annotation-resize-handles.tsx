"use client";

import { useRef, type PointerEvent, type KeyboardEvent } from "react";
import {
  resizeAnnotation,
  type PdfAnnotation,
  type ResizeCorner,
} from "../lib/pdf-editor";
import styles from "../styles.module.css";

interface Props {
  annotation: PdfAnnotation;
  dimensions: { width: number; height: number };
  onStart: () => void;
  onPreview: (annotation: PdfAnnotation) => void;
  onCommit: (annotation: PdfAnnotation) => void;
}

export function AnnotationResizeHandles({
  annotation,
  dimensions,
  onStart,
  onPreview,
  onCommit,
}: Props) {
  const gesture = useRef<{
    pointerId: number;
    x: number;
    y: number;
    corner: ResizeCorner;
    original: PdfAnnotation;
    latest: PdfAnnotation;
  } | null>(null);

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    const corner = event.currentTarget.dataset.corner as ResizeCorner;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !dimensions.width || !dimensions.height) return;
    onStart();
    const snapshot = { ...annotation };
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      corner,
      original: snapshot,
      latest: snapshot,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.latest = resizeAnnotation(
      active.original,
      active.corner,
      ((event.clientX - active.x) / dimensions.width) * 100,
      ((event.clientY - active.y) / dimensions.height) * 100,
      (14 / dimensions.width) * 100,
      (14 / dimensions.height) * 100
    );
    onPreview(active.latest);
  };

  const finish = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
    event.stopPropagation();
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (cancel) onPreview(active.original);
    else if (active.latest !== active.original) onCommit(active.latest);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const keyboardResize = (
    event: KeyboardEvent<HTMLButtonElement>,
    corner: ResizeCorner
  ) => {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction || !dimensions.width || !dimensions.height) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    onCommit(
      resizeAnnotation(
        annotation,
        corner,
        ((direction[0] * step) / dimensions.width) * 100,
        ((direction[1] * step) / dimensions.height) * 100,
        (14 / dimensions.width) * 100,
        (14 / dimensions.height) * 100
      )
    );
  };

  return (["nw", "ne", "sw", "se"] as const).map((corner) => (
    <button
      key={corner}
      type="button"
      className={styles.resizeHandle}
      data-corner={corner}
      aria-label={`Resize ${annotation.type} from ${corner.startsWith("n") ? "top" : "bottom"} ${corner.endsWith("w") ? "left" : "right"}`}
      title="Drag to resize. Use arrow keys for precise adjustments."
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
      onKeyDown={(event) => keyboardResize(event, corner)}
    />
  ));
}
