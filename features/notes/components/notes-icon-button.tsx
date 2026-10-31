"use client";
import { useId, useState, type ReactNode } from "react";
export function NotesIconButton({
  label,
  children,
  onClick,
  active,
  disabled = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return (
    <span
      className="notes-action-tip"
      data-dismissed={dismissed}
      onPointerEnter={() => setDismissed(false)}
    >
      <button
        type="button"
        className={`icon-button ${className}`}
        aria-label={label}
        aria-describedby={disabled ? undefined : id}
        aria-pressed={active}
        disabled={disabled}
        onFocus={() => setDismissed(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setDismissed(true);
        }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        {children}
      </button>
      <span className="notes-action-tooltip" role="tooltip" id={id}>
        {label}
      </span>
    </span>
  );
}
