"use client";

import { useState } from "react";
import { CalendarDays, Copy, Check } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { ActionButton } from "@/components/ui/action-button";
import { NumberInput } from "@/components/ui/number-input";
import { DatePicker } from "@/components/ui/date-picker";
import { useSnackbar } from "@/hooks/use-snackbar";
import { Snackbar } from "@/components/ui/snackbar";
import { dateDifference, shiftDate } from "../lib/date";
import styles from "@/styles/shared/toolkit.module.css";

export function DateWorkspace() {
  const [mode, setMode] = useState<"difference" | "shift">("difference");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState("7");
  const [inclusive, setInclusive] = useState(false);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const [copied, setCopied] = useState("");
  let error = "",
    output = "";
  let result: ReturnType<typeof dateDifference> | null = null;
  try {
    if (mode === "difference" && start && end) {
      result = dateDifference(start, end, inclusive);
      output = `${result.days} calendar days; ${result.businessDays} business days; ${result.weekendDays} weekend days`;
    } else if (mode === "shift" && start && days.trim()) {
      output = shiftDate(start, Number(days));
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Check your dates.";
  }
  const update = (action: () => void) => {
    action();
    setCopied("");
    dismissSnackbar();
  };
  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader title="Date Calculator" icon={<CalendarDays size={24} />} />
      <div className="workspace-toolbar">
        <SegmentedTabs
          value={mode}
          onChange={(value) => update(() => setMode(value))}
          ariaLabel="Date calculation"
          options={[
            { value: "difference", label: "Date difference" },
            { value: "shift", label: "Add / subtract days" },
          ]}
        />
      </div>
      <div className={styles.layout}>
        <section className={`${styles.panel} ${styles.stack}`} aria-label="Date inputs">
          <h2>{mode === "difference" ? "Compare two dates" : "Find a new date"}</h2>
          <DatePicker
            label="Start date"
            min="0001-01-01"
            max="9999-12-31"
            value={start}
            onChange={(value) => update(() => setStart(value))}
          />
          {mode === "difference" ? (
            <>
              <DatePicker
                label="End date"
                min="0001-01-01"
                max="9999-12-31"
                value={end}
                onChange={(value) => update(() => setEnd(value))}
              />
              <label className={styles.row}>
                <input
                  type="checkbox"
                  checked={inclusive}
                  onChange={(e) => update(() => setInclusive(e.target.checked))}
                />{" "}
                Include both dates
              </label>
            </>
          ) : (
            <label className={styles.field}>
              Days to add or subtract
              <NumberInput
                min={-100000}
                max={100000}
                step={1}
                value={days}
                onChange={(e) => update(() => setDays(e.target.value))}
              />
              <span className={styles.hint}>Use a negative number to subtract days.</span>
            </label>
          )}
          <div className={styles.row}>
            <ActionButton
              onClick={() =>
                update(() => {
                  const today = new Date();
                  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  setStart(date);
                  if (!end) setEnd(date);
                })
              }
            >
              Use today
            </ActionButton>
            <ActionButton
              onClick={() =>
                update(() => {
                  setStart("2026-10-23");
                  setEnd("2026-10-26");
                  setDays("7");
                })
              }
            >
              Try example
            </ActionButton>
          </div>
        </section>
        <section className={`${styles.panel} ${styles.stack}`} aria-label="Date result">
          <h2>{mode === "difference" ? "Your date difference" : "Resulting date"}</h2>
          {output && !error ? (
            <>
              {result ? (
                <>
                  <div>
                    <div className={styles.ratio}>{result.days.toLocaleString()}</div>
                    <p className={styles.hint}>
                      calendar days · {result.weeks} full weeks and {result.remainder}{" "}
                      days{result.days < 0 ? " (reverse range)" : ""}
                    </p>
                  </div>
                  <div className={styles.checkGrid}>
                    <div className={styles.check}>
                      <span>Business days</span>
                      <strong>{result.businessDays.toLocaleString()}</strong>
                    </div>
                    <div className={styles.check}>
                      <span>Weekend days</span>
                      <strong>{result.weekendDays.toLocaleString()}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <strong className={styles.pageNumber}>{output}</strong>
              )}
              <ActionButton
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(output);
                    setCopied(output);
                    showSnackbar("Result copied.");
                  } catch {
                    showSnackbar(
                      "Could not copy. Select the result and copy manually.",
                      "error"
                    );
                  }
                }}
              >
                {copied === output ? <Check size={15} /> : <Copy size={15} />} Copy result
              </ActionButton>
            </>
          ) : (
            <p className={styles.hint}>
              Choose {mode === "difference" ? "two dates" : "a date and a day offset"} to
              see your result.
            </p>
          )}
          {error && (
            <p className={`${styles.hint} ${styles.error}`} role="alert">
              {error}
            </p>
          )}
          <p className={styles.hint}>
            Business days are Monday–Friday; public holidays are not excluded. By default,
            counts run after the earlier date through the later date. “Include both dates”
            also counts the earlier date. Reverse ranges return negative counts. Calendar
            dates are calculated without timezone or daylight-saving shifts.
          </p>
        </section>
      </div>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
