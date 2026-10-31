"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { DatePickerCalendar } from "./date-picker-calendar";
import styles from "./date-picker.module.css";

export interface DatePickerProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "children"
> {
  label: string;
  /** Calendar date in YYYY-MM-DD format; an empty string clears the selection. */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

/** Date entry with a themed calendar, bounded selection, and keyboard navigation. */
export function DatePicker({
  label,
  value,
  onChange,
  hint,
  error,
  id,
  className = "",
  containerClassName = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: DatePickerProps) {
  const generatedId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 400 });
  const expanded = open && !props.disabled && !props.readOnly;
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const description =
    [describedBy, hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!expanded) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const height = popup.current?.offsetHeight || 350;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const up = below < height && above > below;
      setPosition({
        left: Math.max(12, Math.min(rect.right - 300, window.innerWidth - 312)),
        top: up ? Math.max(12, rect.top - height - 8) : rect.bottom + 8,
        maxHeight: Math.max(100, up ? above : below),
      });
    }
    function outside(event: Event) {
      const target = event.target as Node;
      if (!popup.current?.contains(target) && !trigger.current?.contains(target))
        setOpen(false);
    }
    function scroll(event: Event) {
      if (!popup.current?.contains(event.target as Node)) place();
    }
    place();
    const observer = new ResizeObserver(place);
    if (popup.current) observer.observe(popup.current);
    window.addEventListener("resize", place);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [expanded]);

  return (
    <div className={`${styles.field} ${containerClassName}`.trim()}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          {...props}
          id={inputId}
          type="date"
          className={`${styles.input} ${className}`.trim()}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-describedby={description}
          aria-invalid={error ? true : invalid}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (
              !event.defaultPrevented &&
              event.altKey &&
              event.key === "ArrowDown" &&
              !props.readOnly
            ) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />
        <button
          ref={trigger}
          type="button"
          className={styles.calendarTrigger}
          disabled={props.disabled || props.readOnly}
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-controls={expanded ? `${inputId}-calendar` : undefined}
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarDays size={17} aria-hidden="true" />
        </button>
      </div>
      {expanded &&
        createPortal(
          <div
            id={`${inputId}-calendar`}
            ref={popup}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            className={styles.calendar}
            style={position}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
          >
            <DatePickerCalendar
              value={value}
              min={typeof props.min === "string" ? props.min : undefined}
              max={typeof props.max === "string" ? props.max : undefined}
              onChange={onChange}
              onClose={close}
            />
          </div>,
          document.body
        )}
      {hint && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
