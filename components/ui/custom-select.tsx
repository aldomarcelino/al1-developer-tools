"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  label?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  layout?: "inline" | "stacked" | "side";
  labelPosition?: "side" | "top";
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  className = "",
  disabled = false,
  layout = "inline",
  labelPosition,
}: CustomSelectProps) {
  const isSide = labelPosition === "side" || layout === "side";
  const isStacked = (layout === "stacked" || labelPosition === "top") && !isSide;
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef({ value: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 180,
    maxHeight: 280,
  });
  const expanded = open && !disabled;
  const selected = options.findIndex((option) => option.value === value);
  const name = ariaLabel ?? label ?? "Select option";
  function show(index = selected >= 0 ? selected : 0) {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    search.current = { value: "", time: 0 };
    trigger.current?.focus();
    onChange(option.value);
  }
  useEffect(() => {
    if (!expanded) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const height = Math.min(options.length * 42 + 14, 280);
      const up = below < height && above > below;
      const maxHeight = Math.max(44, Math.min(280, up ? above : below));
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: up
          ? Math.max(8, rect.top - Math.min(height, maxHeight) - 7)
          : rect.bottom + 7,
        width,
        maxHeight,
      });
    }
    function outside(event: Event) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !popup.current?.contains(target))
        setOpen(false);
    }
    function scroll(event: Event) {
      if (!popup.current?.contains(event.target as Node)) place();
    }
    place();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
    };
  }, [expanded, options.length]);
  useEffect(() => {
    if (expanded)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, id]);
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (!enabled.length) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      let index: number;
      if (event.key === "Home") index = enabled[0];
      else if (event.key === "End") index = enabled[enabled.length - 1];
      else {
        const from = enabled.indexOf(expanded ? active : selected);
        index =
          enabled[
            (from + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) %
              enabled.length
          ];
      }
      show(index);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (expanded) choose(active);
      else show();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
    else if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      const query =
        now - search.current.time < 650 ? search.current.value + event.key : event.key;
      search.current = { value: query, time: now };
      const index = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase())
      );
      if (index >= 0) show(index);
    }
  }
  return (
    <div
      className={`indent-control select-control ${isStacked ? "select-stacked" : ""} ${isSide ? "select-side" : ""} ${className}`.trim()}
    >
      {label && (
        <label className="indent-label" htmlFor={`${id}-trigger`}>
          {label}
        </label>
      )}
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        className={`select-trigger${expanded ? " is-open" : ""}`}
        disabled={disabled}
        aria-label={name}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-listbox` : undefined}
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        onKeyDown={keyDown}
        onClick={() => (expanded ? setOpen(false) : show())}
      >
        <span>{options[selected]?.label ?? value}</span>
        <ChevronDown size={16} className="select-chevron" aria-hidden="true" />
      </button>
      {expanded &&
        createPortal(
          <div
            ref={popup}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={name}
            className="select-dropdown"
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={`select-option${option.value === value ? " selected" : ""}${active === index ? " is-active" : ""}${option.disabled ? " is-disabled" : ""}`}
                onPointerMove={() => !option.disabled && setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value ? (
                  <Check size={15} className="option-check" aria-hidden="true" />
                ) : (
                  <span className="select-check-space" />
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
