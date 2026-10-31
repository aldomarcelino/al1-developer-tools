export const FORMAT = "ramupod-qa-evidence";
export const VERSION = 1;
export const limits = {
  requests: 250,
  markers: 100,
  bodyBytes: 65536,
  sessionBytes: 4 * 1024 * 1024,
  importBytes: 12 * 1024 * 1024,
  screenshotBytes: 2 * 1024 * 1024,
  screenshots: 2,
  durationMs: 15 * 60 * 1000,
} as const;
export type EvidenceStatus =
  "Captured" | "Empty" | "Unavailable" | "Truncated" | "Redacted" | "Unsupported";
export type Pair = { name: string; value: string };
export type Body = {
  status: EvidenceStatus;
  text: string;
  mimeType: string;
  encoding: "utf8" | "base64";
  originalBytes: number | null;
  reason: string | null;
};
export type RequestEvidence = {
  id: string;
  sessionId: string;
  startedAt: string;
  method: string;
  url: string;
  query: Pair[];
  headers: Pair[];
  body: Body;
  response: { status: number; statusText: string; headers: Pair[]; body: Body };
  durationMs: number | null;
  timings: Record<string, number>;
  completeness: string[];
};
export type Marker = {
  id: string;
  sessionId: string;
  at: string;
  description: string;
  source: "capture" | "navigation" | "manual";
};
export type Attachment = {
  id: string;
  sessionId: string;
  name: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  base64: string;
  reviewed: boolean;
};
export type Report = {
  sessionId: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expected: string;
  actual: string;
  frequency: "always" | "intermittent" | "once" | "unknown";
  severity: string;
  requestIds: string[];
  markerIds: string[];
};
export type Redaction = { location: string; reason: string };
export type Session = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  timezone: string;
  pageUrl: string;
  environment: { value: string; source: "manual" | "not-provided" };
  build: { value: string; source: "manual" | "not-provided" };
  browser: string;
  platform: string;
  tabId: number | null;
  capture: "extension-devtools" | "extension-debugger" | "har-import" | "synthetic";
  state: "idle" | "recording" | "paused" | "stopped" | "limit-reached" | "error";
  notices: string[];
  requests: RequestEvidence[];
  markers: Marker[];
  attachments: Attachment[];
  report: Report;
  redactions: Redaction[];
};
export type EvidencePackage = {
  format: typeof FORMAT;
  version: typeof VERSION;
  manifest: {
    producer: string;
    exportedAt: string;
    requestCount: number;
    markerCount: number;
    attachmentCount: number;
    redacted: boolean;
    reportMarkdown: string;
  };
  session: Session;
};
export const bytes = (text: string) => new TextEncoder().encode(text).length;
export function newSession(
  pageUrl: string,
  capture: Session["capture"],
  at = new Date().toISOString(),
  id = crypto.randomUUID()
): Session {
  return {
    id,
    startedAt: at,
    endedAt: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pageUrl,
    environment: { value: "", source: "not-provided" },
    build: { value: "", source: "not-provided" },
    browser: "",
    platform: "",
    tabId: null,
    capture,
    state: "idle",
    notices: [],
    requests: [],
    markers: [],
    attachments: [],
    redactions: [],
    report: {
      sessionId: id,
      title: "",
      description: "",
      preconditions: "",
      steps: "",
      expected: "",
      actual: "",
      frequency: "unknown",
      severity: "",
      requestIds: [],
      markerIds: [],
    },
  };
}
export function body(
  text: string | undefined,
  mimeType = "",
  status?: EvidenceStatus,
  reason: string | null = null,
  encoding: Body["encoding"] = "utf8"
): Body {
  const size = text === undefined ? null : bytes(text);
  if (size !== null && size > limits.bodyBytes)
    return {
      text: "",
      mimeType,
      status: "Truncated",
      originalBytes: size,
      reason: "Body exceeds 64 KiB; content omitted.",
      encoding,
    };
  return {
    text: text ?? "",
    mimeType,
    encoding,
    originalBytes: size,
    status:
      status ?? (text === undefined ? "Unavailable" : text === "" ? "Empty" : "Captured"),
    reason,
  };
}
export function packageSession(
  session: Session,
  redacted = false,
  markdown = ""
): EvidencePackage {
  return {
    format: FORMAT,
    version: VERSION,
    manifest: {
      producer: "Ramupod QA",
      exportedAt: new Date().toISOString(),
      requestCount: session.requests.length,
      markerCount: session.markers.length,
      attachmentCount: session.attachments.length,
      redacted,
      reportMarkdown: markdown,
    },
    session,
  };
}
