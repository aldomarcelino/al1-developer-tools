"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithRef } from "react";
import { createPortal } from "react-dom";
import { Clock3 } from "lucide-react";
import { ActionButton } from "./action-button";
import styles from "./time-picker.module.css";

export interface TimePickerProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "children" | "min" | "max" | "step"
> {
  label: string;
  /** Local wall-clock time as HH:mm (24-hour), or an empty string. No timezone conversion. */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

/** Typed time entry plus a themed, keyboard-accessible hour/minute popup. */
export function TimePicker({
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
}: TimePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const expanded = open && !props.disabled && !props.readOnly;
  const [hour, minute] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value.split(":")
    : ["00", "00"];
  const description =
    [describedBy, hint ? `${inputId}-hint` : "", error ? `${inputId}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function choose(part: "hour" | "minute", next: string) {
    onChange(part === "hour" ? `${next}:${minute}` : `${hour}:${next}`);
  }
  useEffect(() => {
    if (!expanded) return;
    const element = popup.current;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const height = element?.offsetHeight || 360;
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const up = below < height && above > below;
      setPosition({
        left: Math.max(12, Math.min(rect.right - 280, window.innerWidth - 292)),
        top: up ? Math.max(12, rect.top - height - 8) : rect.bottom + 8,
        maxHeight: Math.max(80, up ? above : below),
      });
    }
    function outside(event: Event) {
      const target = event.target as Node;
      if (!element?.contains(target) && !trigger.current?.contains(target))
        setOpen(false);
    }
    function scroll(event: Event) {
      if (!element?.contains(event.target as Node)) place();
    }
    place();
    const observer = new ResizeObserver(place);
    if (element) observer.observe(element);
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
  const positioned = position !== null;
  useEffect(() => {
    if (!expanded || !positioned) return;
    const element = popup.current;
    const selected = element?.querySelector<HTMLButtonElement>(
      '[role="option"][aria-selected="true"]'
    );
    selected?.focus({ preventScroll: true });
    element
      ?.querySelectorAll<HTMLElement>('[role="option"][aria-selected="true"]')
      .forEach((option) => {
        const list = option.parentElement;
        if (list)
          list.scrollTop =
            option.offsetTop - list.clientHeight / 2 + option.clientHeight / 2;
      });
  }, [expanded, positioned]);

  return (
    <div className={`${styles.field} ${containerClassName}`.trim()}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          {...props}
          id={inputId}
          type="time"
          step={60}
          value={value}
          className={`${styles.input} ${className}`.trim()}
          aria-describedby={description}
          aria-invalid={error ? true : invalid}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (
              !event.defaultPrevented &&
              event.altKey &&
              event.key === "ArrowDown" &&
              !props.readOnly
            ) {
              event.preventDefault();
              setPosition(null);
              setOpen(true);
            }
          }}
        />
        <button
          ref={trigger}
          type="button"
          className={styles.trigger}
          disabled={props.disabled || props.readOnly}
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-controls={expanded ? `${inputId}-popup` : undefined}
          onClick={() => {
            setPosition(null);
            setOpen((current) => !current);
          }}
        >
          <Clock3 size={17} aria-hidden="true" />
        </button>
      </div>
      {expanded &&
        createPortal(
          <div
            ref={popup}
            id={`${inputId}-popup`}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            className={styles.popup}
            style={{ ...position, visibility: position ? "visible" : "hidden" }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
          >
            <div className={styles.heading}>
              <span>Choose time</span>
              <span className={styles.badge}>24-hour</span>
            </div>
            <div className={styles.preview}>
              {hour}
              <span>:</span>
              {minute}
            </div>
            <div className={styles.columns}>
              {(
                [
                  { part: "hour", label: "Hour", values: hours, selected: hour },
                  { part: "minute", label: "Minute", values: minutes, selected: minute },
                ] as const
              ).map((column) => (
                <div key={column.part}>
                  <div
                    className={styles.columnLabel}
                    id={`${inputId}-${column.part}-label`}
                  >
                    {column.label}
                  </div>
                  <div
                    role="listbox"
                    aria-labelledby={`${inputId}-${column.part}-label`}
                    className={styles.options}
                    style={{
                      maxHeight: position
                        ? Math.max(64, Math.min(160, position.maxHeight - 212))
                        : 160,
                    }}
                  >
                    {column.values.map((option, index) => (
                      <button
                        type="button"
                        role="option"
                        key={option}
                        aria-selected={column.selected === option}
                        tabIndex={column.selected === option ? 0 : -1}
                        className={styles.option}
                        onClick={() => choose(column.part, option)}
                        onKeyDown={(event) => {
                          if (
                            !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
                          )
                            return;
                          event.preventDefault();
                          const next =
                            event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? column.values.length - 1
                                : (index +
                                    (event.key === "ArrowDown" ? 1 : -1) +
                                    column.values.length) %
                                  column.values.length;
                          choose(column.part, column.values[next]);
                          const options =
                            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                              '[role="option"]'
                            );
                          options?.[next]?.focus({ preventScroll: true });
                          options?.[next]?.scrollIntoView({ block: "nearest" });
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.footer}>
              <ActionButton
                size="sm"
                variant="ghost"
                disabled={!value}
                onClick={() => {
                  onChange("");
                  close();
                }}
              >
                Clear
              </ActionButton>
              <ActionButton
                size="sm"
                variant="primary"
                onClick={() => {
                  if (!value) onChange(`${hour}:${minute}`);
                  close();
                }}
              >
                Done
              </ActionButton>
            </div>
          </div>,
          document.body
        )}
      {hint ? (
        <p className={styles.hint} id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
