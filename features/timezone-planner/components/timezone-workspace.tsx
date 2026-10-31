"use client";
import { useEffect, useMemo, useState } from "react";
import { Globe2, Plus, X, Copy, CalendarSearch, Check, Clock3 } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import plannerStyles from "../styles.module.css";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { getZoneOptions, todayInZone, zoneLabel } from "../lib/zones";
import type { ZoneTime } from "../lib/timezone";
import styles from "@/styles/shared/toolkit.module.css";
export function TimezoneWorkspace() {
  const [base, setBase] = useState("Asia/Jakarta"),
    [date, setDate] = useState(""),
    [time, setTime] = useState("09:00");
  const [zones, setZones] = useState(["Europe/London", "America/New_York"]);
  const [addition, setAddition] = useState("Asia/Singapore");
  const [result, setResult] = useState<{
    key: string;
    instant: string;
    times: ZoneTime[];
  } | null>(null);
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null);
  const [notice, setNotice] = useState("");
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const [searching, setSearching] = useState(false);
  const options = useMemo(() => getZoneOptions(), []);
  const comparisons = zones.filter((zone) => zone !== base);
  const displayed = [base, ...comparisons];
  const key = JSON.stringify([date, time, base, displayed]);
  const latest = result?.key === key ? result : null;
  const available = options.filter((option) => !displayed.includes(option.value));
  const nextAddition = available.some((option) => option.value === addition)
    ? addition
    : (available[0]?.value ?? "");
  useEffect(() => {
    setDate(todayInZone("Asia/Jakarta"));
  }, []);
  useEffect(() => {
    let active = true;
    if (!date || !time) return;
    const timer = setTimeout(async () => {
      try {
        const { planZones } = await import("../lib/timezone");
        const result = planZones(date, time, base, JSON.parse(key)[3]);
        if (active) {
          setResult({ key, ...result });
          setFailure(null);
        }
      } catch (error) {
        if (active)
          setFailure({
            key,
            text:
              error instanceof Error ? error.message : "Could not compare these times.",
          });
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, date, time, base]);
  async function find() {
    setSearching(true);
    setNotice("");
    try {
      const { findNextOverlap } = await import("../lib/timezone");
      const slot = findNextOverlap(date, time, base, comparisons);
      if (slot) {
        setDate(slot.date);
        setTime(slot.time);
        setNotice("Selected the next shared 30-minute work slot.");
      } else
        setNotice(
          "No shared 09:00–17:00 weekday slot was found in the next seven days. Try different cities or choose a time manually."
        );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not find a meeting slot."
      );
    } finally {
      setSearching(false);
    }
  }
  const meetingSummary =
    latest?.times
      .map(
        (value) =>
          `${value.zone}: ${value.weekday}, ${value.date} ${value.time} (UTC${value.offset})`
      )
      .join("\n") ?? "";
  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      <ToolHeader title="Timezone Planner" icon={<Globe2 size={24} />} />
      <section
        className={`${styles.panel} ${plannerStyles.controls}`}
        aria-label="Meeting settings"
      >
        <div className={plannerStyles.sectionHeading}>
          <div>
            <h2>Plan a meeting</h2>
            <p className={styles.hint}>
              Set a local time, then see how it fits across your cities.
            </p>
          </div>
          <span className={styles.badge}>
            <Globe2 size={13} aria-hidden="true" /> {displayed.length} / 8 cities
          </span>
        </div>
        <div className={plannerStyles.referenceFields}>
          <CustomSelect
            layout="stacked"
            label="Reference city"
            value={base}
            options={options}
            disabled={searching}
            onChange={(value) => {
              setBase(value);
              setNotice("");
            }}
          />
          <DatePicker
            label="Date"
            value={date}
            min="1900-01-01"
            max="9999-12-31"
            disabled={searching}
            onChange={(value) => {
              setDate(value);
              setNotice("");
            }}
          />
          <TimePicker
            label="Local time"
            value={time}
            disabled={searching}
            onChange={(value) => {
              setTime(value);
              setNotice("");
            }}
          />
        </div>
        <div className={plannerStyles.comparisonRow}>
          <div className={plannerStyles.addCity}>
            <CustomSelect
              layout="stacked"
              label="Add comparison city"
              value={nextAddition}
              options={available}
              disabled={searching || displayed.length >= 8}
              onChange={setAddition}
            />
            <button
              type="button"
              className="button"
              disabled={searching || displayed.length >= 8 || !nextAddition}
              onClick={() => {
                setZones([...comparisons, nextAddition]);
                setNotice("");
              }}
            >
              <Plus size={14} aria-hidden="true" />
              Add city
            </button>
          </div>
          <div className={plannerStyles.overlap}>
            <div>
              <strong>Find a shared work slot</strong>
              <p className={styles.hint}>
                30 minutes · Weekdays, 09:00–17:00 · Next 7 days
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              disabled={!latest || searching || !comparisons.length}
              onClick={find}
            >
              <CalendarSearch size={14} aria-hidden="true" />
              {searching ? "Finding a slot…" : "Find next work overlap"}
            </button>
          </div>
        </div>
        <p className={styles.hint}>
          Times update automatically. Dates and daylight saving rules follow each city’s
          time zone.
        </p>
      </section>
      <div className={styles.section}>
        {failure?.key === key ? (
          <p role="alert" className={`${styles.notice} ${styles.error}`}>
            {failure.text}
          </p>
        ) : latest ? (
          <>
            <div className={styles.cityGrid}>
              {latest.times.map((value, index) => (
                <section
                  className={`${styles.panel} ${styles.stack}`}
                  key={value.zone}
                  aria-label={zoneLabel(value.zone)}
                >
                  <div className={styles.cityHeading}>
                    <h2>
                      {value.zone === "UTC"
                        ? "UTC"
                        : value.zone.split("/").at(-1)!.replaceAll("_", " ")}
                    </h2>
                    {index ? (
                      <button
                        className={styles.iconButton}
                        disabled={searching}
                        aria-label={`Remove ${zoneLabel(value.zone)}`}
                        onClick={() =>
                          setZones(comparisons.filter((zone) => zone !== value.zone))
                        }
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <span className={styles.badge}>Reference</span>
                    )}
                  </div>
                  <strong className={styles.cityTime}>{value.time}</strong>
                  <div>
                    <p className={styles.hint}>
                      {value.weekday}, {value.date}
                    </p>
                    <p className={styles.hint}>
                      UTC{value.offset} · {value.zone}
                    </p>
                  </div>
                  <span className={styles.badge}>
                    {value.dayDifference === 0
                      ? "Same date"
                      : `${Math.abs(value.dayDifference)} day${Math.abs(value.dayDifference) === 1 ? "" : "s"} ${value.dayDifference < 0 ? "earlier" : "later"}`}
                  </span>
                  <p
                    className={`${styles.hint} ${value.inWorkWindow ? styles.pass : ""}`}
                  >
                    {value.inWorkWindow ? "Within work window" : "Outside work window"}
                  </p>
                </section>
              ))}
            </div>
            <section
              className={`${styles.panel} ${styles.section} ${plannerStyles.share}`}
              aria-label="Share meeting times"
            >
              <div className={plannerStyles.sectionHeading}>
                <div>
                  <h2>Share meeting times</h2>
                  <p className={styles.hint}>
                    One summary for all {latest.times.length}{" "}
                    {latest.times.length === 1 ? "city" : "cities"}. Ready to paste into
                    your invite or chat.
                  </p>
                </div>
                <button
                  type="button"
                  className="button primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(meetingSummary);
                      showSnackbar("Meeting times copied to clipboard.");
                    } catch {
                      showSnackbar(
                        "Could not copy meeting times. Select the summary to copy manually.",
                        "error"
                      );
                    }
                  }}
                >
                  {snackbar?.variant === "success" ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                  {snackbar?.variant === "success" ? "Copied!" : "Copy meeting times"}
                </button>
              </div>
              <label className={plannerStyles.summaryLabel}>
                Meeting summary
                <textarea
                  readOnly
                  value={meetingSummary}
                  rows={latest.times.length}
                  spellCheck={false}
                />
              </label>
              <div className={plannerStyles.universalTime}>
                <Clock3 size={14} aria-hidden="true" />
                <span>Universal time (UTC)</span>
                <time dateTime={latest.instant}>
                  {latest.instant.replace("T", " · ").replace(/Z$/, "")}
                </time>
              </div>
            </section>
          </>
        ) : (
          <p className={styles.hint} role="status">
            {date && time
              ? "Comparing times…"
              : "Choose a date and time to compare cities."}
          </p>
        )}
      </div>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
    </div>
  );
}
