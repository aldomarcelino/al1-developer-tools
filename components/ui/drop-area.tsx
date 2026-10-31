"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Upload } from "lucide-react";
import { ActionButton, type ActionButtonProps } from "./action-button";
import styles from "./drop-area.module.css";

export type DropAreaProps = {
  title: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: "inline" | "stacked" | "compact";
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  buttonLabel?: string;
  buttonIcon?: ReactNode;
  buttonVariant?: ActionButtonProps["variant"];
  /** Extra controls such as sample, remove, or reset actions. */
  actions?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  label?: string;
  inputLabel?: string;
  /** Keeps an external Add more button connected even when this area is hidden. */
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
};

/** Shared intake UI. File validation and processing remain with the calling feature.
 * All dropped files reach onFiles, including in single-file mode, so callers can
 * explain an invalid multi-file drop instead of silently discarding files.
 */
export function DropArea({
  title,
  description,
  hint,
  icon,
  variant = "inline",
  accept,
  multiple = false,
  onFiles,
  buttonLabel = "Choose files",
  buttonIcon = <Upload size={15} />,
  buttonVariant = "primary",
  actions,
  disabled = false,
  loading = false,
  hidden = false,
  label = "Add files",
  inputLabel,
  inputRef,
  className = "",
}: DropAreaProps) {
  const internalInput = useRef<HTMLInputElement>(null);
  const picker = inputRef ?? internalInput;
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const unavailable = disabled || loading;
  useEffect(() => {
    if (unavailable || hidden) {
      depth.current = 0;
      setDragging(false);
    }
  }, [unavailable, hidden]);
  const choose = () => {
    if (!unavailable) picker.current?.click();
  };
  return (
    <section
      className={`${styles.root} ${styles[variant]} ${className}`.trim()}
      aria-label={label}
      aria-busy={loading || undefined}
      hidden={hidden}
      data-dragging={dragging && !unavailable}
      data-disabled={disabled || loading}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        if (!unavailable) {
          depth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = unavailable ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.stopPropagation();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        // Do not let a page-level drop target process the same files twice.
        event.preventDefault();
        event.stopPropagation();
        depth.current = 0;
        setDragging(false);
        if (!unavailable && event.dataTransfer.files.length)
          onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {/* The surface label opens the same input; the visible button supplies keyboard
          access. Both are siblings of the optional secondary action controls. */}
      <label htmlFor={`${id}-input`} className={styles.surface} aria-hidden="true" />
      <div className={styles.intro}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className={styles.copy}>
          <h2 className={styles.title}>{title}</h2>
          {description ? (
            <p id={`${id}-description`} className={styles.description}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.actions}>
        <ActionButton
          variant={buttonVariant}
          loading={loading}
          disabled={disabled}
          onClick={choose}
          aria-describedby={
            [description ? `${id}-description` : "", hint ? `${id}-hint` : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {buttonIcon}
          {buttonLabel}
        </ActionButton>
        {actions}
      </div>
      {hint ? (
        <div id={`${id}-hint`} className={styles.hint}>
          {hint}
        </div>
      ) : null}
      <input
        id={`${id}-input`}
        ref={picker}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled || loading}
        aria-label={inputLabel ?? buttonLabel}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (!unavailable && files.length) onFiles(files);
        }}
      />
    </section>
  );
}
