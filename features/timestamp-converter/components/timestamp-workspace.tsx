"use client";

import styles from "../styles.module.css";

import { useNotice } from "@/hooks/use-notice";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Globe,
  Info,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  parseDateStringToTimestamp,
  parseTimestamp,
  TimestampUnit,
} from "@/features/timestamp-converter/lib/timestamp";
import { ToolHeader } from "@/components/cummon/tool-header";
import { CustomSelect } from "@/components/ui/custom-select";

export function TimestampWorkspace() {
  const [nowSec, setNowSec] = useState<number | null>(null);
  const [clockPaused, setClockPaused] = useState(false);
  const [resetTurns, setResetTurns] = useState(0);

  // Card 1: Timestamp to Date state
  const [tsInput, setTsInput] = useState("");
  const [unitMode, setUnitMode] = useState<"auto" | TimestampUnit>("auto");

  // Card 2: Date to Timestamp state
  const [dateInput, setDateInput] = useState("");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNoticeWithTimeout] = useNotice(
    "Timestamp Converter ready. Live epoch active."
  );

  // The cached server render cannot know the browser's current time or timezone.
  // Initialize both conversions from the same instant after hydration.
  useEffect(() => {
    const now = new Date();
    const seconds = Math.floor(now.getTime() / 1000);
    setNowSec(seconds);
    setTsInput(String(seconds));
    setDateInput(now.toISOString());
  }, []);

  // Live clock ticker
  useEffect(() => {
    if (clockPaused) return;
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [clockPaused]);

  const handleCopy = async (text: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setNoticeWithTimeout(`Copied ${key} to clipboard.`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy value.");
    }
  };

  // Convert Timestamp -> Date
  const tsResult = useMemo(() => {
    const forced = unitMode === "auto" ? undefined : unitMode;
    return parseTimestamp(tsInput, forced);
  }, [tsInput, unitMode]);

  // Convert Date -> Timestamp
  const dateResult = useMemo(() => {
    return parseDateStringToTimestamp(dateInput);
  }, [dateInput]);

  // Relative Jump helper
  const handleJump = (offsetSeconds: number) => {
    const current = Number(tsInput) || Math.floor(Date.now() / 1000);
    const updated = current + offsetSeconds;
    setTsInput(String(updated));
    setNoticeWithTimeout("Applied relative time offset.");
  };

  const handleSetNow = () => {
    setResetTurns((turns) => turns + 1);
    const now = new Date();
    const currentNow = Math.floor(now.getTime() / 1000);
    setTsInput(String(currentNow));
    setDateInput(now.toISOString());
    setNoticeWithTimeout("Reset inputs to current time.");
  };

  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Timestamp Converter" icon={<Clock size={24} />} />

      {/* Hero Live Epoch Card */}
      <div className="timestamp-live-clock-card">
        <div className="timestamp-live-clock-left">
          <span className="timestamp-pulsing-dot" />
          <div>
            <div className="timestamp-live-subtext">CURRENT UNIX EPOCH TIME</div>
            <div className="timestamp-live-value">{nowSec ?? "-"}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="button"
            onClick={() => setClockPaused(!clockPaused)}
          >
            {clockPaused ? <Play size={14} /> : <Pause size={14} />}
            {clockPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={nowSec === null}
            onClick={() => handleCopy(String(nowSec), "current epoch")}
          >
            {copiedKey === "current epoch" ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === "current epoch" ? "Copied!" : "Copy Epoch"}
          </button>
        </div>
      </div>

      {/* Quick Relative Jump Pills */}
      <div className="timestamp-jump-pills">
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            marginRight: "4px",
          }}
        >
          QUICK JUMP:
        </span>
        <button type="button" className="timestamp-jump-pill" onClick={handleSetNow}>
          Now
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(3600)}
        >
          +1 Hour
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(86400)}
        >
          +1 Day
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(604800)}
        >
          +1 Week
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(2592000)}
        >
          +1 Month
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(31536000)}
        >
          +1 Year
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(-3600)}
        >
          -1 Hour
        </button>
        <button
          type="button"
          className="timestamp-jump-pill"
          onClick={() => handleJump(-86400)}
        >
          -1 Day
        </button>
      </div>

      {/* Two Column Converter Grid */}
      <div className="timestamp-converter-grid">
        {/* Card 1: Timestamp to Date */}
        <div className="timestamp-card">
          <div className="timestamp-card-header">
            <span>Timestamp → Human Date</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CustomSelect
                label="Unit"
                value={unitMode}
                onChange={(val) => setUnitMode(val as "auto" | TimestampUnit)}
                options={[
                  { value: "auto", label: "Auto Detect" },
                  { value: "seconds", label: "Seconds (s)" },
                  { value: "milliseconds", label: "Milliseconds (ms)" },
                ]}
              />
            </div>
          </div>

          <div className="timestamp-card-body">
            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                ENTER UNIX TIMESTAMP
              </label>
              <input
                type="text"
                className="timestamp-big-input"
                value={tsInput}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9.-]/g, "").slice(0, 24);
                  setTsInput(sanitized);
                }}
                maxLength={24}
                autoComplete="off"
                placeholder="e.g. 1792825437 or 1792825437000..."
                spellCheck={false}
              />
            </div>

            {tsResult.valid ? (
              <div className="timestamp-results-list">
                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    <Globe size={13} />
                    GMT / UTC
                  </span>
                  <span className="timestamp-result-val">
                    {tsResult.utcString}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() => handleCopy(tsResult.utcString, "UTC")}
                      title="Copy UTC string"
                    >
                      {copiedKey === "UTC" ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    <Clock size={13} />
                    Local Time ({tsResult.timezoneOffset})
                  </span>
                  <span className="timestamp-result-val">
                    {tsResult.localString}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() => handleCopy(tsResult.localString, "Local Time")}
                      title="Copy local string"
                    >
                      {copiedKey === "Local Time" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    <Zap size={13} />
                    ISO 8601
                  </span>
                  <span className="timestamp-result-val">
                    {tsResult.iso8601}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() => handleCopy(tsResult.iso8601, "ISO 8601")}
                      title="Copy ISO 8601"
                    >
                      {copiedKey === "ISO 8601" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    <Calendar size={13} />
                    Relative Time
                  </span>
                  <span
                    className="timestamp-result-val"
                    style={{ fontWeight: 600, color: "var(--accent)" }}
                  >
                    {tsResult.relativeTime}
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">Calendar Details</span>
                  <span className="timestamp-result-val">
                    {tsResult.dayOfWeek} · Day {tsResult.dayOfYear} of year · Week{" "}
                    {tsResult.weekNumber}
                    {tsResult.isLeapYear ? " · Leap Year" : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: "#ef4444", fontSize: "12px", padding: "12px 0" }}>
                {tsResult.error}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Date to Timestamp */}
        <div className="timestamp-card">
          <div className="timestamp-card-header">
            <span>Human Date → Timestamp</span>
            <button
              type="button"
              className="button"
              onClick={handleSetNow}

              style={{ padding: "4px 10px", fontSize: "11px", minHeight: "26px" }}
            >
              <span
                className="timestamp-reset-icon"
                style={{ transform: `rotate(${-360 * resetTurns}deg)` }}
                aria-hidden="true"
              >
                <RotateCcw size={12} />
              </span>
              Reset
            </button>
          </div>

          <div className="timestamp-card-body">
            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                ENTER DATE & TIME (ISO / LOCAL)
              </label>
              <input
                type="text"
                className="timestamp-big-input"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value.slice(0, 64))}
                maxLength={64}
                autoComplete="off"
                placeholder="YYYY-MM-DD HH:mm:ss or ISO 8601 string..."
                spellCheck={false}
              />
            </div>

            {dateResult.valid ? (
              <div className="timestamp-results-list">
                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    Epoch Seconds (10 digits)
                  </span>
                  <span className="timestamp-result-val" style={{ fontWeight: 700 }}>
                    {dateResult.unixSeconds}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() =>
                        handleCopy(String(dateResult.unixSeconds), "Epoch Seconds")
                      }
                      title="Copy seconds"
                    >
                      {copiedKey === "Epoch Seconds" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">
                    Epoch Milliseconds (13 digits)
                  </span>
                  <span className="timestamp-result-val">
                    {dateResult.unixMilliseconds}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() =>
                        handleCopy(
                          String(dateResult.unixMilliseconds),
                          "Epoch Milliseconds"
                        )
                      }
                      title="Copy milliseconds"
                    >
                      {copiedKey === "Epoch Milliseconds" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">ISO 8601 Normalized</span>
                  <span className="timestamp-result-val">
                    {dateResult.iso8601}
                    <button
                      type="button"
                      className="timestamp-copy-inline-btn"
                      onClick={() => handleCopy(dateResult.iso8601, "Normalized ISO")}
                      title="Copy ISO string"
                    >
                      {copiedKey === "Normalized ISO" ? (
                        <Check size={12} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </span>
                </div>

                <div className="timestamp-result-row">
                  <span className="timestamp-result-label">Relative</span>
                  <span
                    className="timestamp-result-val"
                    style={{ fontWeight: 600, color: "var(--accent)" }}
                  >
                    {dateResult.relativeTime}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: "#ef4444", fontSize: "12px", padding: "12px 0" }}>
                {dateResult.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {notice && (
        <div role="status" className="feedback success" style={{ marginTop: "18px" }}>
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Documentation Section (without eyebrow) */}
      <section className="workspace-docs" style={{ marginTop: "24px" }}>
        <div>
          <h2>Precision Unix Epoch & ISO 8601 Conversion</h2>
          <p>
            Convert effortlessly between Unix timestamps (seconds, milliseconds,
            microseconds) and human-readable dates across local and UTC timezones.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Auto-Detection Engine</strong>
              Automatically identifies whether your input is in seconds (10 digits),
              milliseconds (13 digits), or higher precision timestamps.
            </span>
          </p>
          <p>
            <Clock size={18} />
            <span>
              <strong>100% Client-Side Timekeeping</strong>
              Runs locally in your browser with zero latency and full timezone integrity
              without sending your data to external servers.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
