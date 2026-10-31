"use client";
import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { downloadBlob } from "@/lib/browser/download";
import type { Body, Pair, RequestEvidence } from "../lib/model";
import { identifiers } from "../lib/correlation";
import styles from "../styles.module.css";
export type CopyEvidence = (text: string, label: string) => void;
export function CopyAction({
  text,
  label,
  copy,
  disabled = false,
}: {
  text: string;
  label: string;
  copy: CopyEvidence;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      iconOnly
      size="sm"
      variant="ghost"
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      disabled={disabled || !text}
      onClick={() => copy(text, label)}
    >
      <Copy size={15} />
    </ActionButton>
  );
}
export function HeaderList({
  items,
  label,
  copy,
}: {
  items: Pair[];
  label: string;
  copy: CopyEvidence;
}) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeading}>
        <h3>{label}</h3>
        <CopyAction
          text={items.map((p) => `${p.name}: ${p.value}`).join("\n")}
          label={label}
          copy={copy}
        />
      </div>
      {items.length ? (
        <dl className={styles.facts}>
          {items.map((h, i) => (
            <div key={i}>
              <dt>{h.name}</dt>
              <dd>{h.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.hint}>Not captured</p>
      )}
    </div>
  );
}
export function BodyPanel({
  value,
  label,
  copy,
  filename,
}: {
  value: Body;
  label: string;
  copy: CopyEvidence;
  filename: string;
}) {
  const [pretty, setPretty] = useState(true);
  let formatted = value.text,
    json = false;
  if (value.text && value.encoding === "utf8") {
    try {
      formatted = JSON.stringify(JSON.parse(value.text), null, 2);
      json = true;
    } catch {}
  }
  const text = pretty && json ? formatted : value.text;
  return (
    <div className={styles.block}>
      <div className={styles.blockHeading}>
        <h3>
          {label} <span className={styles.badge}>{value.status}</span>
        </h3>
        <div className={styles.inline}>
          {json && (
            <SegmentedTabs
              size="sm"
              ariaLabel={`${label} format`}
              value={pretty ? "pretty" : "raw"}
              onChange={(v) => setPretty(v === "pretty")}
              options={[
                { value: "pretty", label: "Pretty" },
                { value: "raw", label: "Raw" },
              ]}
            />
          )}
          <CopyAction text={text} label={label} copy={copy} />
          <ActionButton
            iconOnly
            size="sm"
            variant="ghost"
            title={`Download ${label}`}
            disabled={!text}
            onClick={() =>
              downloadBlob(
                new Blob([value.text], { type: "text/plain;charset=utf-8" }),
                `${filename}.${json ? "json" : "txt"}`
              )
            }
          >
            <Download size={15} />
          </ActionButton>
        </div>
      </div>
      <p className={styles.hint}>
        {value.mimeType || "MIME type not captured"}
        {value.originalBytes !== null
          ? ` · ${value.originalBytes.toLocaleString()} bytes reported`
          : ""}
        {value.reason ? ` · ${value.reason}` : ""}
      </p>
      {text ? (
        <pre className={styles.code} tabIndex={0}>
          {text}
        </pre>
      ) : (
        <p className={styles.emptyBody}>
          {value.status === "Empty"
            ? "Empty body (no content)."
            : "No body content available."}
        </p>
      )}
    </div>
  );
}
export function EvidenceDetail({
  request,
  copy,
  children,
}: {
  request: RequestEvidence;
  copy: CopyEvidence;
  children?: React.ReactNode;
}) {
  const [tab, setTab] = useState("request");
  const ids = identifiers(request);
  return (
    <section className={styles.detail} aria-label="Request evidence">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>REQUEST EVIDENCE</span>
          <h2>
            {request.method}{" "}
            <span className={styles.badge}>
              {request.response.status || "Network failure"}
            </span>
          </h2>
        </div>
        <CopyAction text={request.url} label="request URL" copy={copy} />
      </div>
      <p className={styles.url}>{request.url}</p>
      <p className={styles.hint}>
        Internal ID: {request.id} · {request.startedAt} ·{" "}
        {request.durationMs === null ? "Timing unavailable" : `${request.durationMs} ms`}
      </p>
      <SegmentedTabs
        size="sm"
        ariaLabel="Evidence section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "request", label: "Request" },
          { value: "response", label: "Response" },
        ]}
      />
      {tab === "request" ? (
        <>
          <HeaderList items={request.query} label="Query parameters" copy={copy} />
          <HeaderList items={request.headers} label="Request headers" copy={copy} />
          <BodyPanel
            value={request.body}
            label="Payload"
            filename={`${request.id}-payload`}
            copy={copy}
          />
        </>
      ) : (
        <>
          <HeaderList
            items={request.response.headers}
            label="Response headers"
            copy={copy}
          />
          <BodyPanel
            value={request.response.body}
            label="Response body"
            filename={`${request.id}-response`}
            copy={copy}
          />
          <HeaderList
            items={Object.entries(request.timings).map(([name, value]) => ({
              name,
              value: `${value} ms`,
            }))}
            label="Timings"
            copy={copy}
          />
        </>
      )}
      {request.completeness.length > 0 && (
        <p className={styles.warning}>{request.completeness.join(" ")}</p>
      )}
      <div className={styles.block}>
        <div className={styles.blockHeading}>
          <h3>Captured identifier candidates</h3>
          <CopyAction
            text={ids.map((id) => `${id.kind}: ${id.value} (${id.source})`).join("\n")}
            label="all identifiers"
            copy={copy}
          />
        </div>
        {ids.length ? (
          ids.map((id, i) => (
            <div className={styles.identifier} key={i}>
              <div>
                <span className={styles.badge}>{id.kind}</span>
                <strong>{id.name}</strong>
                <code>{id.value}</code>
                <span className={styles.hint}>
                  {id.source}
                  {id.note ? ` · ${id.note}` : ""}
                </span>
              </div>
              <CopyAction
                text={id.value}
                label={`${id.kind} from ${id.source}`}
                copy={copy}
              />
            </div>
          ))
        ) : (
          <p className={styles.hint}>
            Not captured. The internal tool request ID is not a backend trace or request
            ID.
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
