"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel = "Select option",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  return (
    <div className={`indent-control ${className}`} ref={containerRef}>
      {label && <span className="indent-label">{label}</span>}
      <div className="custom-select">
        <button
          type="button"
          className={`select-trigger ${open ? "is-open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
        >
          <span>{selectedLabel}</span>
          <ChevronDown size={14} className="select-chevron" />
        </button>

        {open && (
          <div className="select-dropdown" role="listbox">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`select-option ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="option-check" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
