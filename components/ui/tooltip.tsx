"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  id: string;
  content: string;
  anchorRef: RefObject<HTMLElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

/** A portaled tooltip stays visible outside clipped editor and queue containers. */
export function Tooltip({
  id,
  content,
  anchorRef,
  onPointerEnter,
  onPointerLeave,
}: TooltipProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !element) return;
    const trigger = anchor.getBoundingClientRect();
    const tip = element.getBoundingClientRect();
    const top = trigger.top - tip.height - 8;
    setPosition({
      left: Math.max(
        8,
        Math.min(
          trigger.left + (trigger.width - tip.width) / 2,
          window.innerWidth - tip.width - 8
        )
      ),
      top:
        top >= 8
          ? top
          : Math.min(trigger.bottom + 8, window.innerHeight - tip.height - 8),
    });
  }, [anchorRef, content, element]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={setElement}
      id={id}
      role="tooltip"
      className="action-tooltip"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {content}
    </div>,
    document.body
  );
}
