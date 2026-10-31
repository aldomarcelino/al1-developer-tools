"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./date-picker.module.css";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function parse(value: string) {
  const date = new Date(0);
  const [year, month, day] = value.split("-").map(Number);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}
function iso(date: Date) {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function DatePickerCalendar({
  value,
  min = "0001-01-01",
  max = "9999-12-31",
  onChange,
  onClose,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const valid = (date: string) => date >= min && date <= max;
  const initial =
    value && valid(value) ? value : today() < min ? min : today() > max ? max : today();
  const [focused, setFocused] = useState(initial);
  const [view, setView] = useState(initial.slice(0, 7));
  const grid = useRef<HTMLDivElement>(null);
  const first = parse(`${view}-01`);
  const year = first.getUTCFullYear(),
    month = first.getUTCMonth();
  const last = new Date(first);
  last.setUTCMonth(month + 1, 0);
  const days = last.getUTCDate();
  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, view]);
  function moveMonth(delta: number) {
    const next = new Date(first);
    next.setUTCMonth(month + delta);
    if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
    const end = new Date(next);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    if (iso(end) < min || iso(next) > max) return;
    const date = iso(next) < min ? min : iso(next);
    setView(date.slice(0, 7));
    setFocused(date);
  }
  return (
    <>
      <div className={styles.calendarHeading}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={`${view}-01` <= min}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <div className={styles.monthControls}>
          <select
            aria-label="Month"
            value={month}
            onChange={(event) => {
              const next = `${year.toString().padStart(4, "0")}-${String(Number(event.target.value) + 1).padStart(2, "0")}-01`;
              setView(next.slice(0, 7));
              setFocused(next < min ? min : next > max ? max : next);
            }}
          >
            {months.map((name, index) => (
              <option
                key={name}
                value={index}
                disabled={
                  `${year.toString().padStart(4, "0")}-${String(index + 1).padStart(2, "0")}` <
                    min.slice(0, 7) ||
                  `${year.toString().padStart(4, "0")}-${String(index + 1).padStart(2, "0")}` >
                    max.slice(0, 7)
                }
              >
                {name}
              </option>
            ))}
          </select>
          <input
            aria-label="Year"
            type="number"
            min={Number(min.slice(0, 4))}
            max={Number(max.slice(0, 4))}
            defaultValue={year}
            key={year}
            onBlur={(event) => {
              const nextYear = Number(event.target.value);
              if (
                !Number.isInteger(nextYear) ||
                nextYear < Number(min.slice(0, 4)) ||
                nextYear > Number(max.slice(0, 4))
              ) {
                event.target.value = String(year);
                return;
              }
              const next = `${String(nextYear).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-01`;
              const bounded = next < min ? min : next > max ? max : next;
              setView(bounded.slice(0, 7));
              setFocused(bounded);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={iso(last) >= max}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className={styles.calendarGrid}
        ref={grid}
        role="group"
        aria-label={`${months[month]} ${year}`}
      >
        {Array.from({ length: first.getUTCDay() }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1,
            date = `${view}-${String(day).padStart(2, "0")}`;
          return (
            <button
              type="button"
              key={date}
              data-date={date}
              data-selected={date === value}
              data-today={date === today()}
              aria-label={`${months[month]} ${day}, ${year}`}
              aria-pressed={date === value}
              aria-current={date === today() ? "date" : undefined}
              disabled={!valid(date)}
              tabIndex={date === focused ? 0 : -1}
              onClick={() => {
                onChange(date);
                onClose();
              }}
              onKeyDown={(event) => {
                const offsets: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                  Home: -parse(date).getUTCDay(),
                  End: 6 - parse(date).getUTCDay(),
                };
                if (event.key === "PageUp" || event.key === "PageDown") {
                  event.preventDefault();
                  moveMonth(event.key === "PageUp" ? -1 : 1);
                  return;
                }
                if (!(event.key in offsets)) return;
                event.preventDefault();
                const next = parse(date);
                next.setUTCDate(day + offsets[event.key]);
                const nextDate = iso(next);
                if (valid(nextDate)) {
                  setFocused(nextDate);
                  setView(nextDate.slice(0, 7));
                }
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className={styles.calendarFooter}>
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            onChange("");
            onClose();
          }}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!valid(today())}
          onClick={() => {
            onChange(today());
            onClose();
          }}
        >
          Today
        </button>
      </div>
    </>
  );
}
