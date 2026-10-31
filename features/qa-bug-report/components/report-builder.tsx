"use client";
import { useRef, useState } from "react";
import { FileText, Download, ImagePlus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { downloadBlob } from "@/lib/browser/download";
import {
  limits,
  packageSession,
  type Session,
  type Report,
  type Attachment,
} from "../lib/model";
import { validatePackage } from "../lib/validate";
import { exportEvidence, reportMarkdown, curlFor } from "../lib/report";
import { defaultSecretKeys, type RedactionRules } from "../lib/redact";
import { CopyAction, type CopyEvidence } from "./evidence-detail";
import styles from "../styles.module.css";
export function CurlPanel({
  session,
  requestId,
  copy,
}: {
  session: Session;
  requestId: string;
  copy: CopyEvidence;
}) {
  const request = session.requests.find((r) => r.id === requestId);
  if (!request) return null;
  const result = curlFor(request);
  return (
    <div className={styles.block}>
      <div className={styles.blockHeading}>
        <h3>
          cURL <span className={styles.badge}>POSIX shell</span>
        </h3>
        <CopyAction text={result.command ?? ""} label="POSIX cURL" copy={copy} />
      </div>
      {result.command ? (
        <pre className={styles.code} tabIndex={0}>
          {result.command}
        </pre>
      ) : (
        <p className={styles.warning}>
          Body-faithful cURL is not available for this evidence.
        </p>
      )}
      <ul className={styles.notes}>
        {result.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
export function ReportBuilder({
  session,
  onChange,
  rules,
  onRules,
  copy,
  notify,
}: {
  session: Session;
  onChange: (change: Partial<Session>) => void;
  rules: RedactionRules;
  onRules: (rules: RedactionRules) => void;
  copy: CopyEvidence;
  notify: (text: string, error?: boolean) => void;
}) {
  const [tab, setTab] = useState("write");
  const [includeScreenshots, setIncludeScreenshots] = useState(false);
  const [extra, setExtra] = useState(rules.extraKeys.join(", "));
  const imageInput = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<Report>) =>
    onChange({ report: { ...session.report, ...patch } });
  const preview = reportMarkdown(session);
  async function attach(file: File) {
    try {
      if (session.attachments.length >= limits.screenshots)
        throw new Error("Up to two screenshots per session.");
      if (file.size > limits.screenshotBytes)
        throw new Error("Screenshot exceeds 2 MiB.");
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw new Error("Choose a PNG, JPEG, or WebP screenshot.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let text = "";
      for (let i = 0; i < bytes.length; i += 8192)
        text += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        name: file.name.replace(/[/\\\x00]/g, "_").slice(0, 120),
        mimeType: file.type as Attachment["mimeType"],
        base64: btoa(text),
        reviewed: false,
      };
      const attachments = [...session.attachments, attachment];
      validatePackage(packageSession({ ...session, attachments }));
      onChange({ attachments });
      notify(
        "Screenshot added. Review it separately; text redaction does not modify images."
      );
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Could not add screenshot.", true);
    }
  }
  function output(kind: "json" | "markdown" | "copy") {
    try {
      const data = exportEvidence(session, rules, includeScreenshots);
      if (kind === "copy") copy(data.markdown, "Markdown report");
      else
        downloadBlob(
          new Blob([kind === "json" ? data.json : data.markdown], {
            type: kind === "json" ? "application/json" : "text/markdown;charset=utf-8",
          }),
          `qa-${session.id}.${kind === "json" ? "ramupod.json" : "md"}`
        );
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Export failed.", true);
    }
  }
  return (
    <section className={`${styles.panel} ${styles.report}`} aria-label="Report builder">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>THE HANDOFF</span>
          <h2>
            <FileText size={16} /> Bug report
          </h2>
        </div>
        <SegmentedTabs
          size="sm"
          ariaLabel="Report mode"
          value={tab}
          onChange={setTab}
          options={[
            { value: "write", label: "Write" },
            { value: "preview", label: "Preview" },
            { value: "privacy", label: "Privacy review" },
          ]}
        />
      </div>
      {tab === "write" && (
        <>
          <div className={styles.formGrid}>
            <label className={styles.full}>
              Title *
              <input
                value={session.report.title}
                maxLength={10000}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label>
              Environment (manual)
              <input
                value={session.environment.value}
                maxLength={300}
                onChange={(e) =>
                  onChange({
                    environment: {
                      value: e.target.value,
                      source: e.target.value ? "manual" : "not-provided",
                    },
                  })
                }
              />
            </label>
            <label>
              Application build (manual)
              <input
                value={session.build.value}
                maxLength={300}
                onChange={(e) =>
                  onChange({
                    build: {
                      value: e.target.value,
                      source: e.target.value ? "manual" : "not-provided",
                    },
                  })
                }
              />
            </label>
            {(
              [
                ["description", "Description"],
                ["preconditions", "Preconditions"],
                ["steps", "Steps to reproduce"],
                ["expected", "Expected result *"],
                ["actual", "Actual result *"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={key === "steps" || key === "description" ? styles.full : ""}
              >
                {label}
                <textarea
                  rows={key === "steps" ? 4 : 3}
                  value={session.report[key]}
                  maxLength={10000}
                  onChange={(e) => update({ [key]: e.target.value })}
                />
              </label>
            ))}
            <CustomSelect
              layout="stacked"
              label="Frequency"
              value={session.report.frequency}
              onChange={(v) => update({ frequency: v as Report["frequency"] })}
              options={["always", "intermittent", "once", "unknown"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <CustomSelect
              layout="stacked"
              label="Severity (optional)"
              value={session.report.severity}
              onChange={(v) => update({ severity: v })}
              options={[
                { value: "", label: "Not specified" },
                ...["Critical", "High", "Medium", "Low"].map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          </div>
          <h3 className={styles.smallHeading}>
            Attached requests ({session.report.requestIds.length})
          </h3>
          {session.report.requestIds.length ? (
            <ul className={styles.notes}>
              {session.requests
                .filter((r) => session.report.requestIds.includes(r.id))
                .map((r) => (
                  <li key={r.id}>
                    {r.method} {r.url}
                    <br />
                    <code>{r.id}</code>
                  </li>
                ))}
            </ul>
          ) : (
            <p className={styles.hint}>
              Select request checkboxes in the request list to attach technical evidence.
            </p>
          )}
          <div className={styles.blockHeading}>
            <h3 className={styles.smallHeading}>Optional screenshots</h3>
            <ActionButton
              size="sm"
              onClick={() => imageInput.current?.click()}
              disabled={session.attachments.length >= limits.screenshots}
            >
              <ImagePlus size={15} />
              Add screenshot
            </ActionButton>
          </div>
          <input
            ref={imageInput}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void attach(f);
              e.target.value = "";
            }}
          />
          <div className={styles.screenshots}>
            {session.attachments.map((a) => (
              <div className={styles.screenshot} key={a.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Reviewed local raster data must bypass remote image optimization. */}
                <img
                  src={`data:${a.mimeType};base64,${a.base64}`}
                  alt={`Attached screenshot: ${a.name}`}
                />
                <span>{a.name}</span>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={a.reviewed}
                    onChange={(e) =>
                      onChange({
                        attachments: session.attachments.map((item) =>
                          item.id === a.id
                            ? { ...item, reviewed: e.target.checked }
                            : item
                        ),
                      })
                    }
                  />
                  I reviewed this image for sensitive data
                </label>
                <ActionButton
                  iconOnly
                  size="sm"
                  variant="danger"
                  title={`Remove screenshot ${a.name}`}
                  onClick={() =>
                    onChange({
                      attachments: session.attachments.filter((item) => item.id !== a.id),
                    })
                  }
                >
                  <Trash2 size={14} />
                </ActionButton>
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            PNG/JPEG/WebP, up to 2 MiB each. Screenshots are never automatically redacted.
            Remove or edit sensitive images externally before adding them.
          </p>
        </>
      )}
      {tab === "preview" && (
        <>
          <p className={styles.hint}>
            Plain-text Markdown preview. No links, HTML, or remote images execute here.
            Only selected requests are exported; screenshots default to excluded.
          </p>
          <pre className={styles.code} tabIndex={0}>
            {preview}
          </pre>
        </>
      )}
      {tab === "privacy" && (
        <>
          <p className={styles.warning}>
            The view and all copy/export actions use sanitized evidence. Source request
            data remains unchanged in page memory. Redaction is a best-effort aid, not a
            guarantee. Images require separate review.
          </p>
          <p className={styles.hint}>
            Default sensitive key patterns: {defaultSecretKeys.join(", ")}. Also scans
            bearer/JWT and common raw key-value patterns.
          </p>
          <label>
            Additional sensitive key names (comma-separated)
            <input
              value={extra}
              maxLength={1000}
              placeholder="customer_id, account_number"
              onChange={(e) => setExtra(e.target.value)}
            />
          </label>
          <ActionButton
            size="sm"
            onClick={() => {
              const keys = extra
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (
                keys.length > 20 ||
                keys.some((s) => !/^[a-zA-Z0-9_-]{1,80}$/.test(s))
              ) {
                notify(
                  "Use up to 20 simple key names (letters, digits, underscores, hyphens).",
                  true
                );
                return;
              }
              onRules({ extraKeys: keys });
              notify("Redaction rules applied to the sanitized view.");
            }}
          >
            Apply redaction rules
          </ActionButton>
          <h3 className={styles.smallHeading}>
            Redaction summary ({session.redactions.length})
          </h3>
          {session.redactions.length ? (
            <ul className={`${styles.notes} ${styles.audit}`}>
              {session.redactions.map((a, i) => (
                <li key={i}>
                  <code>{a.location}</code> — {a.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>
              No fields matched the active rules. Check evidence manually before sharing.
            </p>
          )}
        </>
      )}
      <div className={styles.exportBar}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={includeScreenshots}
            onChange={(e) => setIncludeScreenshots(e.target.checked)}
          />
          Include reviewed screenshots in package
        </label>
        <div className={styles.inline}>
          <CopyAction text="report" label="Markdown report" copy={() => output("copy")} />
          <ActionButton onClick={() => output("markdown")}>
            <Download size={15} />
            Markdown
          </ActionButton>
          <ActionButton variant="primary" onClick={() => output("json")}>
            <Download size={15} />
            Export evidence package
          </ActionButton>
        </div>
      </div>
      <p className={styles.hint}>
        Export validates title, expected/actual results and selected evidence. The package
        includes a manifest, selected requests, session markers, report, and optionally
        reviewed screenshots. Open it locally in this viewer without an account.
      </p>
    </section>
  );
}
