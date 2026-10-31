import { FORMAT, VERSION, limits, bytes, type EvidencePackage } from "./model.ts";
export function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${path}: expected an object.`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], path: string) {
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown)
    throw new Error(
      `${path}: unknown field ${unknown}. This format version does not allow hidden extra evidence fields.`
    );
}
export function string(
  value: unknown,
  path: string,
  max = 10000
): asserts value is string {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`${path}: expected text up to ${max} characters.`);
}
function array(value: unknown, path: string, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`${path}: expected a list of at most ${max} items.`);
}
function choice(value: unknown, options: readonly unknown[], path: string) {
  if (!options.includes(value)) throw new Error(`${path}: unsupported value.`);
}
function number(
  value: unknown,
  path: string,
  min = 0,
  max = 1e12
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${path}: invalid number.`);
}
function date(value: unknown, path: string): asserts value is string {
  string(value, path, 50);
  if (!/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error(`${path}: invalid timestamp.`);
}
export function httpUrl(value: unknown, path: string): asserts value is string {
  string(value, path, 16384);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${path}: invalid URL.`);
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error(`${path}: only HTTP(S) URLs are supported.`);
}
export function pairs(value: unknown, path: string, allowHarExtras = false) {
  array(value, path, 200);
  value.forEach((pair, i) => {
    const p = object(pair, `${path}[${i}]`);
    if (!allowHarExtras) exact(p, ["name", "value"], path);
    string(p.name, path, 1024);
    string(p.value, path, 16384);
  });
}
function checkBody(value: unknown, path: string) {
  const b = object(value, path);
  exact(b, ["status", "text", "mimeType", "encoding", "originalBytes", "reason"], path);
  choice(
    b.status,
    ["Captured", "Empty", "Unavailable", "Truncated", "Redacted", "Unsupported"],
    path
  );
  string(b.text, path, limits.bodyBytes);
  if (bytes(b.text) > limits.bodyBytes) throw new Error(`${path}: body exceeds 64 KiB.`);
  string(b.mimeType, path, 256);
  choice(b.encoding, ["utf8", "base64"], path);
  if (b.originalBytes !== null) number(b.originalBytes, path);
  if (b.reason !== null) string(b.reason, path, 1000);
  if (b.status === "Empty" && b.text !== "")
    throw new Error(`${path}: Empty body contains text.`);
}
export function validatePackage(input: unknown): EvidencePackage {
  const p = object(input, "Package");
  exact(p, ["format", "version", "manifest", "session"], "Package");
  if (p.format !== FORMAT)
    throw new Error(
      "Not a Ramupod QA evidence package. Choose a .ramupod.json file or import HAR."
    );
  if (p.version !== VERSION)
    throw new Error(
      `Unsupported evidence format version ${String(p.version)}. This viewer supports version 1.`
    );
  // Also bounds programmatic imports, not just uploaded files.
  if (bytes(JSON.stringify(input)) > limits.importBytes)
    throw new Error("Package exceeds 12 MiB.");
  const s = object(p.session, "Session");
  exact(
    s,
    [
      "id",
      "startedAt",
      "endedAt",
      "timezone",
      "pageUrl",
      "environment",
      "build",
      "browser",
      "platform",
      "tabId",
      "capture",
      "state",
      "notices",
      "requests",
      "markers",
      "attachments",
      "report",
      "redactions",
    ],
    "Session"
  );
  string(s.id, "Session ID", 120);
  if (!s.id) throw new Error("Missing session ID.");
  date(s.startedAt, "Session start");
  if (s.endedAt !== null) {
    date(s.endedAt, "Session end");
    if (Date.parse(s.endedAt) < Date.parse(s.startedAt))
      throw new Error("Session end precedes start.");
  }
  httpUrl(s.pageUrl, "Page URL");
  string(s.timezone, "Timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.timezone });
  } catch {
    throw new Error("Session timezone is not recognized.");
  }
  for (const key of ["environment", "build"]) {
    const item = object(s[key], key);
    exact(item, ["value", "source"], key);
    string(item.value, key, 300);
    choice(item.source, ["manual", "not-provided"], key);
  }
  string(s.browser, "Browser", 2000);
  string(s.platform, "Platform", 200);
  if (s.tabId !== null) number(s.tabId, "Tab ID");
  choice(
    s.capture,
    ["extension-devtools", "extension-debugger", "har-import", "synthetic"],
    "Capture source"
  );
  choice(
    s.state,
    ["idle", "recording", "paused", "stopped", "limit-reached", "error"],
    "Session state"
  );
  array(s.notices, "Notices", 100);
  s.notices.forEach((n) => string(n, "Notice", 2000));
  array(s.requests, "Requests", limits.requests);
  const requestIds = new Set<string>();
  const checkSession = (value: unknown) => {
    if (value !== s.id) throw new Error("Evidence references a different session.");
  };
  s.requests.forEach((value, index) => {
    const r = object(value, `Request ${index + 1}`);
    exact(
      r,
      [
        "id",
        "sessionId",
        "startedAt",
        "method",
        "url",
        "query",
        "headers",
        "body",
        "response",
        "durationMs",
        "timings",
        "completeness",
      ],
      "Request"
    );
    string(r.id, "Request ID", 120);
    if (!r.id || requestIds.has(r.id))
      throw new Error("Missing or duplicate internal request ID.");
    requestIds.add(r.id);
    checkSession(r.sessionId);
    date(r.startedAt, "Request start");
    if (
      Date.parse(r.startedAt) < Date.parse(s.startedAt as string) ||
      (s.endedAt && Date.parse(r.startedAt) > Date.parse(s.endedAt as string))
    )
      throw new Error("Request timestamp is outside this session.");
    string(r.method, "Method", 30);
    if (!/^[A-Z][A-Z0-9-]*$/.test(r.method)) throw new Error("Invalid HTTP method.");
    httpUrl(r.url, "Request URL");
    pairs(r.query, "Query");
    pairs(r.headers, "Request headers");
    checkBody(r.body, "Request body");
    const response = object(r.response, "Response");
    exact(response, ["status", "statusText", "headers", "body"], "Response");
    number(response.status, "HTTP status", 0, 599);
    if (!Number.isInteger(response.status)) throw new Error("Invalid HTTP status.");
    string(response.statusText, "Status text", 300);
    pairs(response.headers, "Response headers");
    checkBody(response.body, "Response body");
    if (r.durationMs !== null) number(r.durationMs, "Duration");
    const timings = object(r.timings, "Timings");
    exact(
      timings,
      ["blocked", "dns", "connect", "send", "wait", "receive", "ssl"],
      "Timings"
    );
    if (Object.keys(timings).length > 20) throw new Error("Too many timing fields.");
    Object.values(timings).forEach((t) => number(t, "Timing", -1));
    array(r.completeness, "Completeness", 20);
    r.completeness.forEach((n) => string(n, "Completeness", 1000));
  });
  array(s.markers, "Markers", limits.markers);
  const markerIds = new Set<string>();
  s.markers.forEach((value) => {
    const m = object(value, "Marker");
    exact(m, ["id", "sessionId", "at", "description", "source"], "Marker");
    string(m.id, "Marker ID", 120);
    if (!m.id || markerIds.has(m.id)) throw new Error("Duplicate marker ID.");
    markerIds.add(m.id);
    checkSession(m.sessionId);
    date(m.at, "Marker time");
    if (
      Date.parse(m.at) < Date.parse(s.startedAt as string) ||
      (s.endedAt && Date.parse(m.at) > Date.parse(s.endedAt as string))
    )
      throw new Error("Marker is outside this session.");
    string(m.description, "Marker description", 2000);
    choice(m.source, ["capture", "navigation", "manual"], "Marker source");
  });
  array(s.attachments, "Screenshots", limits.screenshots);
  const attachmentIds = new Set<string>();
  s.attachments.forEach((value) => {
    const a = object(value, "Attachment");
    exact(a, ["id", "sessionId", "name", "mimeType", "base64", "reviewed"], "Attachment");
    checkSession(a.sessionId);
    string(a.id, "Attachment ID", 120);
    if (!a.id || attachmentIds.has(a.id)) throw new Error("Duplicate attachment ID.");
    attachmentIds.add(a.id);
    string(a.name, "Screenshot name", 120);
    if (/[\/\\\x00]/.test(a.name) || a.name === "." || a.name === "..")
      throw new Error("Screenshot name must not contain paths.");
    choice(a.mimeType, ["image/png", "image/jpeg", "image/webp"], "Screenshot type");
    string(a.base64, "Screenshot data", Math.ceil((limits.screenshotBytes * 4) / 3) + 4);
    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64) ||
      !a.base64 ||
      a.base64.length % 4 !== 0
    )
      throw new Error("Invalid screenshot encoding.");
    const decoded = atob(a.base64);
    if (decoded.length > limits.screenshotBytes)
      throw new Error("Screenshot exceeds 2 MiB.");
    if (
      !(a.mimeType === "image/png"
        ? decoded.startsWith("\x89PNG\r\n\x1a\n")
        : a.mimeType === "image/jpeg"
          ? decoded.startsWith("\xff\xd8\xff")
          : decoded.startsWith("RIFF") && decoded.slice(8, 12) === "WEBP")
    )
      throw new Error("Screenshot signature does not match its type.");
    if (typeof a.reviewed !== "boolean")
      throw new Error("Screenshot review flag missing.");
  });
  array(s.redactions, "Redaction audit", 5000);
  s.redactions.forEach((value) => {
    const a = object(value, "Redaction");
    exact(a, ["location", "reason"], "Redaction");
    string(a.location, "Redaction location", 1000);
    string(a.reason, "Redaction reason", 1000);
  });
  const report = object(s.report, "Report");
  exact(
    report,
    [
      "sessionId",
      "title",
      "description",
      "preconditions",
      "steps",
      "expected",
      "actual",
      "frequency",
      "severity",
      "requestIds",
      "markerIds",
    ],
    "Report"
  );
  checkSession(report.sessionId);
  for (const key of [
    "title",
    "description",
    "preconditions",
    "steps",
    "expected",
    "actual",
    "severity",
  ])
    string(report[key], `Report ${key}`, 10000);
  choice(report.frequency, ["always", "intermittent", "once", "unknown"], "Frequency");
  for (const [key, ids] of [
    ["requestIds", requestIds],
    ["markerIds", markerIds],
  ] as const) {
    array(report[key], key, 250);
    const seen = new Set();
    (report[key] as unknown[]).forEach((id) => {
      string(id, key, 120);
      if (!ids.has(id) || seen.has(id))
        throw new Error(`Invalid or duplicate ${key} reference.`);
      seen.add(id);
    });
  }
  const manifest = object(p.manifest, "Manifest");
  exact(
    manifest,
    [
      "producer",
      "exportedAt",
      "requestCount",
      "markerCount",
      "attachmentCount",
      "redacted",
      "reportMarkdown",
    ],
    "Manifest"
  );
  string(manifest.producer, "Producer", 100);
  date(manifest.exportedAt, "Export time");
  string(manifest.reportMarkdown, "Markdown", limits.importBytes);
  if (typeof manifest.redacted !== "boolean") throw new Error("Missing redaction flag.");
  for (const [key, count] of [
    ["requestCount", s.requests.length],
    ["markerCount", s.markers.length],
    ["attachmentCount", s.attachments.length],
  ] as const)
    if (manifest[key] !== count)
      throw new Error(`Manifest ${key} does not match evidence.`);
  return input as EvidencePackage;
}
