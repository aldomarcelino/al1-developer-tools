"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  Upload,
  Sparkles,
  Trash2,
  Search,
  Puzzle,
  FileText,
  ScanSearch,
  Camera,
  Network,
  ArrowRight,
} from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { importEvidence } from "../lib/import";
import { samplePackage } from "../lib/sample";
import { sanitizeSession } from "../lib/redact";
import { limits, type Session } from "../lib/model";
import { CaptureSummary } from "./capture-summary";
import { CaptureGuide } from "./capture-guide";
import { EvidenceDetail } from "./evidence-detail";
import { Timeline } from "./timeline";
import { CurlPanel, ReportBuilder } from "./report-builder";
import {
  aroundMarker,
  candidateReasons,
  defaultCandidateRules,
} from "../lib/correlation";
import styles from "../styles.module.css";
export function QaWorkspace() {
  const [technical, setTechnical] = useState(false);
  const [detailedReport, setDetailedReport] = useState(false);
  const [source, setSource] = useState<Session | null>(null);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMarker, setActiveMarker] = useState("");
  const [before, setBefore] = useState(10);
  const [after, setAfter] = useState(10);
  const [rules, setRules] = useState(defaultCandidateRules);
  const [redactionRules, setRedactionRules] = useState({ extraKeys: [] as string[] });
  const file = useRef<HTMLInputElement>(null),
    revision = useRef(0);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  useEffect(() => {
    const nonce = new URLSearchParams(location.hash.slice(1)).get("qa-capture");
    if (!nonce || !/^[a-f0-9-]{36}$/.test(nonce)) return;
    const version = revision.current;
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.nonce !== nonce
      )
        return;
      if (event.data.type === "ramupod-qa-offer") {
        window.postMessage({ type: "ramupod-qa-ready", nonce }, location.origin);
      }
      if (event.data.type !== "ramupod-qa-package") return;
      try {
        if (revision.current !== version)
          throw new Error(
            "Another session is already open. Download and import the quick capture instead."
          );
        if (event.data.error) throw new Error(String(event.data.error));
        const data = importEvidence(JSON.stringify(event.data.package));
        revision.current++;
        setSource(data.session);
        setSelected(
          data.session.report.requestIds[0] ?? data.session.requests[0]?.id ?? ""
        );
        setTechnical(false);
        setDetailedReport(false);
        setError("");
        window.postMessage({ type: "ramupod-qa-accepted", nonce }, location.origin);
        history.replaceState(null, "", location.pathname + location.search);
        window.removeEventListener("message", receive);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not receive capture.");
      }
    };
    window.addEventListener("message", receive);
    window.postMessage({ type: "ramupod-qa-ready", nonce }, location.origin);
    const timeout = setTimeout(() => {
      window.removeEventListener("message", receive);
    }, 30000);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, []);
  const session = useMemo(
    () => (source ? sanitizeSession(source, redactionRules) : null),
    [source, redactionRules]
  );
  const requests =
    aroundMarker(
      session?.requests ?? [],
      session?.markers.find((m) => m.id === activeMarker),
      before,
      after
    ).filter(
      (r) =>
        `${r.method} ${r.url} ${r.id}`.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "all" ||
          (filter === "marked" && !!session?.report.requestIds.includes(r.id)) ||
          (filter === "errors" &&
            (r.response.status === 0 || r.response.status >= 400)) ||
          (filter === "candidates" && candidateReasons(r, rules).length > 0) ||
          (filter === "incomplete" &&
            [r.body.status, r.response.body.status].some((s) =>
              ["Unavailable", "Truncated", "Unsupported"].includes(s)
            )))
    ) ?? [];
  const current = session?.requests.find((r) => r.id === selected);
  function toggleRequest(id: string) {
    setSource((old) =>
      old && old.requests.some((r) => r.id === id)
        ? {
            ...old,
            report: {
              ...old.report,
              requestIds: old.report.requestIds.includes(id)
                ? old.report.requestIds.filter((value) => value !== id)
                : [...old.report.requestIds, id],
            },
          }
        : old
    );
  }
  async function load(input: File) {
    const version = ++revision.current;
    setLoading(true);
    setError("");
    try {
      if (input.size > limits.importBytes)
        throw new Error("File exceeds 12 MiB. Choose a smaller session.");
      const text = await input.text();
      if (version !== revision.current) return;
      const data = importEvidence(text);
      setSource(data.session);
      setTechnical(data.session.capture !== "extension-debugger");
      setDetailedReport(false);
      setSelected(
        data.session.report.requestIds[0] ?? data.session.requests[0]?.id ?? ""
      );
      setQuery("");
      setFilter("all");
      setActiveMarker("");
      showSnackbar("Evidence loaded locally. Source file remains unchanged.");
    } catch (cause) {
      if (version === revision.current)
        setError(cause instanceof Error ? cause.message : "Could not read evidence.");
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar(`${label} copied.`);
    } catch {
      showSnackbar(
        "Clipboard unavailable. Select the evidence text and copy manually.",
        "error"
      );
    }
  }
  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      <ToolHeader title="QA Bug Capture & Handoff" icon={<Bug size={24} />} />
      <Accordion
        hidden={source?.capture === "extension-debugger"}
        title="Capture a new session with the Chrome extension"
        description="Install the extension, record your test, and bring the evidence here."
        icon={<Puzzle size={18} />}
      >
        <CaptureGuide />
      </Accordion>
      <div className={`${styles.toolbar} ${session ? styles.loadedToolbar : ""}`}>
        {session && (
          <span className={styles.loadedLabel}>
            {session.capture === "synthetic" ? "Synthetic sample" : "Capture loaded"}
            <span>Evidence stays in this page until downloaded</span>
          </span>
        )}
        <ActionButton
          variant={session ? "secondary" : "primary"}
          disabled={loading}
          onClick={() => file.current?.click()}
        >
          <Upload size={15} />
          {loading ? "Reading…" : "Import capture / HAR"}
        </ActionButton>
        <ActionButton
          hidden={!!session}
          onClick={() => {
            revision.current++;
            setLoading(false);
            setSource(samplePackage().session);
            setTechnical(false);
            setDetailedReport(false);
            setSelected("sample-request-2");
            setError("");
            setQuery("");
            setFilter("all");
            setActiveMarker("sample-marker-1");
            showSnackbar("Synthetic sample loaded. No real incident data.");
          }}
        >
          <Sparkles size={15} />
          Try synthetic sample
        </ActionButton>
        {(source || loading) && (
          <ActionButton
            variant="danger"
            disabled={!source && !loading}
            onClick={() => {
              revision.current++;
              setSource(null);
              setSelected("");
              setQuery("");
              setFilter("all");
              setActiveMarker("");
              setRedactionRules({ extraKeys: [] });
              setRules(defaultCandidateRules);
              setLoading(false);
              setError("");
              showSnackbar("Session cleared from this page.");
            }}
          >
            <Trash2 size={15} />
            Clear session
          </ActionButton>
        )}
        <input
          ref={file}
          type="file"
          hidden
          accept=".json,.har,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && (
        <div className={styles.skeleton} role="status">
          Validating local evidence…
        </div>
      )}
      {!session ? (
        <section className={styles.captureEmpty} aria-label="Get started with QA capture">
          <div className={styles.emptyLead}>
            <span className={styles.emptyIcon}>
              <Bug size={25} />
            </span>
            <h2>Bring the evidence. Keep the story clear.</h2>
            <p>
              Finish a test in the extension to open its results here automatically, or
              import a capture to review.
            </p>
          </div>
          <div className={styles.emptyModes}>
            <article>
              <Network size={20} />
              <h3>Test a flow</h3>
              <p>
                Start testing → inspect requests, flag useful evidence, and save
                screenshots → Finish.
              </p>
              <span>
                Results open here · detailed report optional <ArrowRight size={13} />
              </span>
            </article>
            <article>
              <Camera size={20} />
              <h3>Capture a visual issue</h3>
              <p>
                Click or drag an area, annotate the screenshot, then download the PNG.
              </p>
              <span>Standalone screenshots save directly to your device</span>
            </article>
          </div>
          <p className={styles.emptyLocal}>
            Local processing · No upload or automatic replay · Only requests recorded
            during testing are available
          </p>
        </section>
      ) : (
        <>
          <CaptureSummary
            key={session.id}
            onToggleRequest={toggleRequest}
            onReviewImage={(id, reviewed) =>
              setSource((old) =>
                old
                  ? {
                      ...old,
                      attachments: old.attachments.map((image) =>
                        image.id === id ? { ...image, reviewed } : image
                      ),
                    }
                  : old
              )
            }
            notify={(message) => showSnackbar(message, "error")}
            session={session}
            copy={(text, label) => void copy(text, label)}
            inspect={(id) => {
              setSelected(id);
              setQuery("");
              setFilter("all");
              setActiveMarker("");
              setTechnical(true);
              setTimeout(
                () =>
                  document
                    .getElementById("qa-technical")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                0
              );
            }}
            onReport={() => {
              setDetailedReport(true);
              setTimeout(
                () =>
                  document
                    .getElementById("qa-report")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                0
              );
            }}
          />
          <Accordion
            title="Inspect technical evidence"
            description="Review requests, responses, and the event timeline."
            icon={<ScanSearch size={18} />}
            id="qa-technical"
            open={technical}
            onToggle={(event) => setTechnical(event.currentTarget.open)}
          >
            <section className={styles.sessionInfo}>
              <span>
                <strong>Session</strong>
                <code>{session.id}</code>
              </span>
              <span>
                <strong>Source</strong>
                {session.capture}
              </span>
              <span>
                <strong>Time</strong>
                {session.startedAt} · {session.timezone}
              </span>
              <span>
                <strong>Environment</strong>
                {session.environment.value || "Not provided"} (
                {session.environment.source})
              </span>
              <span>
                <strong>Build</strong>
                {session.build.value || "Not provided"} ({session.build.source})
              </span>
            </section>
            <p className={styles.hint}>
              Sanitized view · {session.redactions.length} redaction records · Original
              import stays unchanged in memory. No URLs are fetched.{" "}
              {session.capture === "synthetic"
                ? "Synthetic evidence, not a real incident."
                : ""}
            </p>
            {session.notices.map((note, i) => (
              <p className={styles.warning} key={i}>
                {note}
              </p>
            ))}
            <Timeline
              session={session}
              activeMarker={activeMarker}
              onMarker={setActiveMarker}
              before={before}
              after={after}
              onWindow={(b, a) => {
                setBefore(b);
                setAfter(a);
              }}
              rules={rules}
              onRules={setRules}
              onAttach={(ids) =>
                setSource((old) =>
                  old ? { ...old, report: { ...old.report, markerIds: ids } } : old
                )
              }
              onAdd={(description, offset) => {
                const max =
                  (Date.parse(session.endedAt ?? session.startedAt) -
                    Date.parse(session.startedAt)) /
                  1000;
                if (
                  !Number.isFinite(offset) ||
                  offset < 0 ||
                  offset > max ||
                  session.markers.length >= limits.markers
                ) {
                  showSnackbar(
                    "Choose a marker time within this session (up to 100 markers).",
                    "error"
                  );
                  return;
                }
                const marker = {
                  id: crypto.randomUUID(),
                  sessionId: session.id,
                  at: new Date(
                    Date.parse(session.startedAt) + offset * 1000
                  ).toISOString(),
                  description,
                  source: "manual" as const,
                };
                setSource((old) =>
                  old ? { ...old, markers: [...old.markers, marker] } : old
                );
                setActiveMarker(marker.id);
                showSnackbar("Manual event marker added.");
              }}
            />
            <div className={styles.workspace}>
              <section className={styles.requestList} aria-label="Session requests">
                <div className={styles.panelHeading}>
                  <h2>
                    Requests{" "}
                    <span className={styles.badge}>{session.requests.length}</span>
                  </h2>
                </div>
                <label className={styles.search}>
                  <Search size={15} />
                  <input
                    aria-label="Search requests"
                    placeholder="Search method, URL, internal ID…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <CustomSelect
                  label="Request filter"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "All requests" },
                    { value: "marked", label: "Marked for report" },
                    { value: "errors", label: "HTTP / network errors" },
                    { value: "candidates", label: "Candidates to review" },
                    { value: "incomplete", label: "Incomplete evidence" },
                  ]}
                />
                <div className={styles.requestRows}>
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className={`${styles.requestRow} ${selected === r.id ? styles.selected : ""}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Attach ${r.id} to report`}
                        checked={session.report.requestIds.includes(r.id)}
                        onChange={() => toggleRequest(r.id)}
                      />
                      <button
                        onClick={() => setSelected(r.id)}
                        aria-pressed={selected === r.id}
                      >
                        <span className={styles.requestMeta}>
                          <strong>{r.method}</strong>
                          <span
                            className={
                              r.response.status >= 400 || r.response.status === 0
                                ? styles.statusError
                                : ""
                            }
                          >
                            {r.response.status || "Failed"}
                          </span>
                          <time>{r.startedAt.slice(11, 23)}</time>
                          <span>
                            {r.durationMs === null
                              ? "—"
                              : `${Math.round(r.durationMs)} ms`}
                          </span>
                        </span>
                        <span className={styles.endpoint}>{r.url}</span>
                        <span className={styles.hint}>
                          {r.response.body.status} · {r.id}
                        </span>
                        {candidateReasons(r, rules).length > 0 && (
                          <span className={styles.candidate}>
                            {candidateReasons(r, rules).join(" · ")}
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                  {!requests.length && (
                    <p className={styles.emptyBody}>No matching requests.</p>
                  )}
                </div>
              </section>
              {current ? (
                <EvidenceDetail
                  request={current}
                  copy={(text, label) => void copy(text, label)}
                >
                  <CurlPanel
                    session={session}
                    requestId={current.id}
                    copy={(text, label) => void copy(text, label)}
                  />
                </EvidenceDetail>
              ) : (
                <section className={styles.empty}>
                  <h2>Select a request</h2>
                  <p>Choose evidence to inspect request and response details.</p>
                </section>
              )}
            </div>
          </Accordion>
          <Accordion
            title="Write a detailed report"
            description="Optional · Add context and prepare a handoff for the next engineer."
            icon={<FileText size={18} />}
            id="qa-report"
            open={detailedReport}
            onToggle={(event) => setDetailedReport(event.currentTarget.open)}
          >
            <ReportBuilder
              session={session}
              rules={redactionRules}
              onRules={setRedactionRules}
              copy={(text, label) => void copy(text, label)}
              notify={(text, error) => showSnackbar(text, error ? "error" : "success")}
              onChange={(change) =>
                setSource((old) => (old?.id === session.id ? { ...old, ...change } : old))
              }
            />
          </Accordion>
        </>
      )}
    </div>
  );
}
