"use client";
import { useState } from "react";
import {
  Copy,
  Download,
  ArrowUpRight,
  Camera,
  Flag,
  Network,
  ShieldCheck,
  FilePenLine,
  Clock3,
} from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Accordion } from "@/components/ui/accordion";
import { downloadBlob } from "@/lib/browser/download";
import { bytes, limits, packageSession, type Session } from "../lib/model";
import { curlFor } from "../lib/report";
import { ScreenshotGallery } from "./screenshot-gallery";
import styles from "../styles.module.css";
export function CaptureSummary({
  session,
  copy,
  inspect,
  onReport,
  notify,
  onToggleRequest,
  onReviewImage,
}: {
  session: Session;
  copy: (text: string, label: string) => void;
  inspect: (id: string) => void;
  onReport: () => void;
  notify: (message: string) => void;
  onToggleRequest: (id: string) => void;
  onReviewImage: (id: string, reviewed: boolean) => void;
}) {
  const errors = session.requests.filter(
      (r) => r.response.status === 0 || r.response.status >= 400
    ),
    marked = session.requests.filter((r) => session.report.requestIds.includes(r.id));
  const [view, setView] = useState(() =>
    marked.length ? "marked" : errors.length ? "errors" : "all"
  );
  const matches =
    view === "marked" ? marked : view === "errors" ? errors : session.requests;
  const duration = session.endedAt
    ? Math.max(
        0,
        Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000)
      )
    : null;
  function download() {
    const safe = {
      ...session,
      attachments: session.attachments.filter((a) => a.reviewed),
    };
    const json = JSON.stringify(packageSession(safe, true), null, 2);
    if (bytes(json) > limits.importBytes) {
      notify(
        "Capture exceeds 12 MiB. Remove screenshots in the detailed report before exporting."
      );
      return;
    }
    downloadBlob(
      new Blob([json], { type: "application/json" }),
      `ramupod-${session.id}.ramupod.json`
    );
  }
  const sourceLabel =
    session.capture === "synthetic"
      ? "SYNTHETIC SAMPLE"
      : session.state === "recording"
        ? "CAPTURE IN PROGRESS"
        : session.state === "paused"
          ? "CAPTURE PAUSED"
          : "SESSION OVERVIEW";
  return (
    <section className={styles.quickSummary} aria-label="Capture summary">
      <header className={styles.summaryHeader}>
        <div>
          <span className={styles.eyebrow}>{sourceLabel}</span>
          <h2>{session.report.title || "Review your capture."}</h2>
          <p>Keep the useful evidence. Add a detailed report when you need one.</p>
        </div>
        <div className={styles.summaryActions}>
          <ActionButton onClick={onReport}>
            <FilePenLine size={15} />
            Add a detailed report
          </ActionButton>
          <ActionButton variant="primary" onClick={download}>
            <Download size={15} />
            Download capture
          </ActionButton>
        </div>
      </header>
      <div className={styles.captureContext}>
        <code>{session.pageUrl}</code>
        <span>
          <Clock3 size={13} />
          {duration === null
            ? "Not finished"
            : duration >= 60
              ? `${Math.floor(duration / 60)}m ${duration % 60}s`
              : `${duration}s`}{" "}
          · {new Date(session.startedAt).toLocaleString()}
        </span>
        {session.environment.value && (
          <span>
            {session.environment.value} <span className={styles.hint}>(manual)</span>
          </span>
        )}
      </div>
      <div className={styles.summaryStats}>
        {[
          {
            icon: <Network size={17} />,
            count: session.requests.length,
            label: "Captured requests",
          },
          { icon: <Flag size={17} />, count: marked.length, label: "Marked for report" },
          {
            icon: <ShieldCheck size={17} />,
            count: errors.length,
            label: "HTTP / network errors",
          },
          {
            icon: <Camera size={17} />,
            count: session.attachments.length,
            label: "Screenshots",
          },
        ].map((item) => (
          <div key={item.label}>
            {item.icon}
            <strong>{item.count}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.reviewGrid}>
        <section className={styles.requestReview} aria-label="Request review">
          <div className={styles.reviewHeading}>
            <div>
              <h3>Request evidence</h3>
              <p>Flags selected in the extension are ready here.</p>
            </div>
            <ActionButton
              size="sm"
              variant="ghost"
              disabled={!session.requests.length}
              onClick={() => inspect(matches[0]?.id ?? session.requests[0]?.id ?? "")}
            >
              Open inspector <ArrowUpRight size={14} />
            </ActionButton>
          </div>
          <SegmentedTabs
            size="sm"
            ariaLabel="Summary request filter"
            value={view}
            onChange={setView}
            options={[
              { value: "marked", label: `Marked (${marked.length})` },
              { value: "errors", label: `HTTP errors (${errors.length})` },
              { value: "all", label: `All (${session.requests.length})` },
            ]}
          />
          <div className={styles.summaryRequestList}>
            {matches.slice(0, 20).map((r) => {
              const selected = session.report.requestIds.includes(r.id),
                curl = curlFor(r);
              let preview = r.response.body.text;
              try {
                preview = JSON.stringify(JSON.parse(preview), null, 2);
              } catch {
                /* Preserve non-JSON as inert text. */
              }
              const shortened = preview.length > 2000;
              preview = preview.slice(0, 2000);
              return (
                <article
                  className={`${styles.summaryRequest} ${selected ? styles.markedRequest : ""}`}
                  key={r.id}
                >
                  <div className={styles.summaryRequestTop}>
                    <span className={styles.methodBadge}>{r.method}</span>
                    <span
                      className={`${styles.badge} ${r.response.status === 0 || r.response.status >= 400 ? styles.errorBadge : ""}`}
                    >
                      {r.response.status || "Failed"}
                    </span>
                    <span className={styles.requestDuration}>
                      {r.durationMs === null
                        ? "No timing"
                        : `${Math.round(r.durationMs)} ms`}
                    </span>
                    <div className={styles.requestActions}>
                      <ActionButton
                        iconOnly
                        aria-label={`Mark request ${r.id}`}
                        aria-pressed={selected}
                        tooltip={
                          selected ? "Remove from report evidence" : "Mark for report"
                        }
                        active={selected}
                        onClick={() => onToggleRequest(r.id)}
                      >
                        <Flag size={15} fill={selected ? "currentColor" : "none"} />
                      </ActionButton>
                      <ActionButton
                        iconOnly
                        aria-label={`Copy cURL for ${r.id}`}
                        tooltip={
                          curl.command
                            ? "Copy cURL · POSIX shell"
                            : "cURL unavailable for this payload"
                        }
                        disabled={!curl.command}
                        onClick={() => curl.command && copy(curl.command, "cURL")}
                      >
                        <Copy size={15} />
                      </ActionButton>
                      <ActionButton size="sm" onClick={() => inspect(r.id)}>
                        Inspect <ArrowUpRight size={14} />
                      </ActionButton>
                    </div>
                  </div>
                  <code className={styles.summaryEndpoint}>{r.url}</code>
                  <Accordion
                    variant="inline"
                    title="Response preview"
                    description={r.response.body.status}
                    className={styles.responsePreview}
                  >
                    <pre className={styles.code} tabIndex={0}>
                      {preview ||
                        r.response.body.reason ||
                        (r.response.body.status === "Empty"
                          ? "Empty response body."
                          : "Response body not captured.")}
                    </pre>
                    {shortened && (
                      <p className={styles.hint}>
                        Preview limited to 2,000 characters. Inspect for the complete
                        captured body.
                      </p>
                    )}
                  </Accordion>
                </article>
              );
            })}
            {!matches.length && (
              <div className={styles.summaryNoRequests}>
                <Flag size={22} />
                <h4>
                  {view === "marked"
                    ? "No requests marked yet"
                    : view === "errors"
                      ? "No HTTP errors captured"
                      : "No completed requests captured"}
                </h4>
                <p>
                  {view === "marked"
                    ? "Open All and flag the requests that belong in your report."
                    : view === "errors"
                      ? "HTTP 200 can still contain a business error. Review the evidence when needed."
                      : "Screenshots can still be used as report evidence."}
                </p>
                {view !== "all" && (
                  <ActionButton size="sm" onClick={() => setView("all")}>
                    View all requests
                  </ActionButton>
                )}
              </div>
            )}
          </div>
          {matches.length > 20 && (
            <p className={styles.hint}>
              Showing 20 of {matches.length} matching requests. Open the inspector to
              search the full session.
            </p>
          )}
          <p className={styles.reviewFootnote}>
            HTTP errors are candidates to review, not confirmed bugs. cURL targets POSIX
            shells and may need fresh credentials or replacement of redacted values.
          </p>
        </section>
        <ScreenshotGallery
          images={session.attachments}
          onReview={onReviewImage}
          notify={notify}
        />
      </div>
      <div className={styles.privacyLine}>
        <ShieldCheck size={15} />
        <span>
          On-device review · {session.redactions.length} redaction records · Downloads
          include reviewed images only. Automatic redaction can miss sensitive data.
        </span>
      </div>
      {session.markers.some((m) => m.source !== "navigation") && (
        <Accordion
          variant="inline"
          title={`Session notes (${session.markers.filter((m) => m.source !== "navigation").length})`}
        >
          <div className={styles.summaryMarkers}>
            {session.markers
              .filter((m) => m.source !== "navigation")
              .map((m) => (
                <p key={m.id}>
                  <time>{new Date(m.at).toLocaleTimeString()}</time>
                  {m.description}
                </p>
              ))}
          </div>
        </Accordion>
      )}
    </section>
  );
}
