"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import styles from "./searchable-select.module.css";

export interface SearchableSelectOption<Value extends string = string> {
  value: Value;
  label: string;
  group?: string;
  keywords?: readonly string[];
  disabled?: boolean;
}

export interface SearchableSelectProps<Value extends string = string> {
  value: Value;
  onChange: (value: Value) => void;
  options: readonly SearchableSelectOption<Value>[];
  ariaLabel: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect<Value extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  searchLabel = `Search ${ariaLabel.toLowerCase()}`,
  searchPlaceholder = "Search options…",
  placeholder = "Select an option",
  emptyMessage = "No matching options.",
  disabled = false,
  className = "",
}: SearchableSelectProps<Value>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Value | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const expanded = open && !disabled;
  const terms = query.toLowerCase().trim().split(/\s+/);
  const matches = options.filter((option) => {
    const text = [option.label, option.group, ...(option.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const enabled = matches.filter((option) => !option.disabled);
  const activeOption = enabled.find((option) => option.value === active) ?? enabled[0];
  const groups = [...new Set(matches.map((option) => option.group))];
  const optionId = (option: SearchableSelectOption<Value>) =>
    `${id}-option-${options.indexOf(option)}`;
  const positioned = position !== null;

  function show() {
    if (disabled) return;
    setQuery("");
    setActive(value);
    setPosition(null);
    setOpen(true);
  }
  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  function choose(option: SearchableSelectOption<Value>) {
    if (option.disabled) return;
    close(true);
    onChange(option.value);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) choose(activeOption);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = enabled.findIndex((option) => option === activeOption);
      const next =
        enabled[
          (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length
        ];
      if (next) setActive(next.value);
    }
  }

  useEffect(() => {
    if (!expanded) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 18;
      const above = rect.top - 18;
      const desiredHeight = Math.min(popup.current?.scrollHeight ?? 360, 360);
      const up = below < desiredHeight && above > below;
      const maxHeight = Math.max(60, Math.min(360, up ? above : below));
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: up
          ? Math.max(12, rect.top - Math.min(desiredHeight, maxHeight) - 6)
          : rect.bottom + 6,
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
    const observer = new ResizeObserver(place);
    if (popup.current) observer.observe(popup.current);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded && positioned) input.current?.focus();
  }, [expanded, positioned]);

  const activeId = activeOption ? optionId(activeOption) : undefined;
  useEffect(() => {
    if (expanded && positioned && activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [expanded, positioned, activeId]);

  return (
    <div className={`${styles.root} ${className}`}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-popup` : undefined}
        onClick={() => (expanded ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          } else if (event.key === "Escape") close();
        }}
      >
        <span>
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {expanded &&
        createPortal(
          <div
            ref={popup}
            id={`${id}-popup`}
            role="dialog"
            aria-label={ariaLabel}
            className={styles.popup}
            style={{ ...position, visibility: positioned ? "visible" : "hidden" }}
          >
            <label className={styles.search}>
              <Search size={15} aria-hidden="true" />
              <input
                ref={input}
                className={styles.searchInput}
                type="search"
                role="combobox"
                aria-label={searchLabel}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={`${id}-listbox`}
                aria-activedescendant={activeId}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(null);
                }}
                onKeyDown={keyDown}
              />
            </label>
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-label={ariaLabel}
              className={styles.options}
            >
              {groups.map((group) => (
                <div
                  key={group ?? "ungrouped"}
                  role="group"
                  aria-label={group ?? "Options"}
                >
                  {group && <p className={styles.group}>{group}</p>}
                  {matches
                    .filter((option) => option.group === group)
                    .map((option) => (
                      <div
                        key={option.value}
                        id={optionId(option)}
                        role="option"
                        aria-selected={option.value === value}
                        aria-disabled={option.disabled || undefined}
                        className={styles.option}
                        data-active={option === activeOption || undefined}
                        onPointerMove={() => !option.disabled && setActive(option.value)}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => choose(option)}
                      >
                        <span>{option.label}</span>
                        {option.value === value && <Check size={14} aria-hidden="true" />}
                      </div>
                    ))}
                </div>
              ))}
            </div>
            {!matches.length && (
              <p className={styles.empty} role="status">
                {emptyMessage}
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
