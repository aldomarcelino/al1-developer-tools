"use client";

import React from "react";
import { Trash2 } from "lucide-react";

export interface ClearButtonProps {
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

/**
 * Reusable expandable Clear button.
 * Circular with trash icon at rest; smoothly expands on hover with sliding "Clear" text
 * while preserving application color scheme (light & dark mode).
 */
export function ClearButton({
  onClick,
  title = "Clear",
  ariaLabel,
  className = "",
  label = "Clear",
  disabled = false,
  size = "md",
}: ClearButtonProps) {
  return (
    <button
      type="button"
      className={`clear-button ${size === "sm" ? "size-sm" : ""} ${className}`.trim()}
      data-label={label}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || `${label} input`}
      disabled={disabled}
    >
      <Trash2 className="clear-icon" size={size === "sm" ? 13 : 15} strokeWidth={1.8} />
    </button>
  );
}
