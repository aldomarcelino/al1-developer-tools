import { identifiers } from "./correlation.ts";
import {
  sanitizeSession,
  defaultRules,
  type RedactionRules,
  REDACTED,
} from "./redact.ts";
import {
  packageSession,
  limits,
  bytes,
  type Session,
  type RequestEvidence,
} from "./model.ts";
import { validatePackage } from "./validate.ts";
import { isTextMime } from "./har.ts";
export function posixQuote(value: string): string {
  if (value.includes("\0")) throw new Error("POSIX arguments cannot contain NUL bytes.");
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}
export function curlFor(request: RequestEvidence): {
  command: string | null;
  warnings: string[];
} {
  const warnings = [
    "Target shell: POSIX. Copying never sends a request. Auth/data/backend state may have changed; reproduction is not guaranteed.",
  ];
  const b = request.body;
  if (
    ["Unavailable", "Truncated", "Unsupported"].includes(b.status) ||
    b.encoding !== "utf8" ||
    /multipart/i.test(b.mimeType) ||
    (b.text && b.mimeType && !isTextMime(b.mimeType))
  )
    return {
      command: null,
      warnings: [
        ...warnings,
        `Body-faithful cURL unavailable: ${b.status}. Multipart/binary and missing payloads are not reconstructed.`,
      ],
    };
  if (/[\x00-\x1f\x7f]/.test(request.url) || b.text.includes("\0"))
    return {
      command: null,
      warnings: [
        ...warnings,
        "cURL cannot safely represent control characters in this URL or NUL bytes in the payload.",
      ],
    };
  const blocked = new Set([
    "host",
    "content-length",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "accept-encoding",
  ]);
  for (const h of request.headers)
    if (h.name.toLowerCase() === "connection")
      h.value.split(",").forEach((v) => blocked.add(v.trim().toLowerCase()));
  const parts = [
    "curl --globoff",
    `--request ${posixQuote(request.method)}`,
    `--url ${posixQuote(request.url)}`,
  ];
  for (const h of request.headers) {
    if (
      blocked.has(h.name.toLowerCase()) ||
      !/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(h.name) ||
      /[\r\n\0]/.test(h.value)
    ) {
      warnings.push(`Omitted transport/unsafe header: ${h.name}`);
      continue;
    }
    let value = h.value;
    if (value.includes(REDACTED)) {
      value = value.replaceAll(
        REDACTED,
        `<REPLACE_${h.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}>`
      );
      warnings.push(`Redacted ${h.name}: enter your own authorized value.`);
    }
    parts.push(`--header ${posixQuote(`${h.name}: ${value}`)}`);
  }
  if (b.text) parts.push(`--data-raw ${posixQuote(b.text)}`);
  if (b.status === "Redacted" || request.url.includes("REDACTED"))
    warnings.push(
      "Payload/query contains redaction placeholders; replace them before using this command."
    );
  return {
    command:
      parts.join(
        " \
  "
      ),
    warnings,
  };
}
export function fence(text: string, language = "text"): string {
  const runs = text.match(/`+/g) ?? [];
  const marker = "`".repeat(Math.max(3, ...runs.map((s) => s.length + 1)));
  return `${marker}${language}\n${text}\n${marker}`;
}
export function reportMarkdown(session: Session): string {
  const r = session.report;
  const lines = [
    "# QA bug report",
    "",
    "## Title",
    fence(r.title || "Untitled bug"),
    "",
    "## Session",
    fence(
      `Session ID: ${session.id}\nSource: ${session.capture}\nPage: ${session.pageUrl}\nStarted: ${session.startedAt}\nEnded: ${session.endedAt ?? "Not recorded"}\nTimezone: ${session.timezone}\nEnvironment: ${session.environment.value || "Not provided"} (source: ${session.environment.source})\nBuild: ${session.build.value || "Not provided"} (source: ${session.build.source})\nBrowser: ${session.browser || "Not captured"}\nPlatform: ${session.platform || "Not captured"}`
    ),
    "",
    `Frequency: ${r.frequency} · Severity: ${r.severity || "Not specified"}`,
  ];
  for (const [label, text] of [
    ["Description", r.description],
    ["Preconditions", r.preconditions],
    ["Steps to reproduce", r.steps],
    ["Expected result", r.expected],
    ["Actual result", r.actual],
  ])
    lines.push("", `## ${label}`, fence(text || "Not provided"));
  lines.push("", "## Event markers");
  const markers = session.markers.filter((m) => r.markerIds.includes(m.id));
  lines.push(
    markers.length
      ? fence(
          markers
            .map(
              (m) =>
                `${m.at} [${m.source}] ${m.description} (marker: ${m.id}, session: ${m.sessionId})`
            )
            .join("\n")
        )
      : "Not attached."
  );
  lines.push("", "## Related request evidence");
  const selected = session.requests.filter((q) => r.requestIds.includes(q.id));
  if (!selected.length) lines.push("No requests attached.");
  for (const q of selected) {
    const curl = curlFor(q);
    const ids = identifiers(q);
    lines.push(
      "",
      `### Request ${q.id}`,
      fence(
        `${q.method} ${q.url}\nSession: ${q.sessionId}\nTime: ${q.startedAt}\nHTTP status: ${q.response.status || "Network failure"}\nDuration: ${q.durationMs === null ? "Not captured" : q.durationMs + " ms"}`
      ),
      "",
      "Identifiers (with source):",
      ids.length
        ? fence(
            ids
              .map(
                (id) =>
                  `${id.kind}: ${id.value} — ${id.source}${id.note ? ` (${id.note})` : ""}`
              )
              .join("\n")
          )
        : "Not captured.",
      "",
      `Request body: ${q.body.status}`,
      fence(q.body.text || q.body.reason || "No body content"),
      "",
      `Response body: ${q.response.body.status}`,
      fence(q.response.body.text || q.response.body.reason || "No body content"),
      "",
      "Request headers:",
      fence(q.headers.map((h) => `${h.name}: ${h.value}`).join("\n") || "Not captured"),
      "Response headers:",
      fence(
        q.response.headers.map((h) => `${h.name}: ${h.value}`).join("\n") ||
          "Not captured"
      ),
      "",
      "POSIX cURL:",
      curl.command ? fence(curl.command, "sh") : "Unavailable for this request.",
      fence(curl.warnings.join("\n"))
    );
  }
  lines.push(
    "",
    "## Screenshots",
    session.attachments.length
      ? fence(
          session.attachments
            .map(
              (a) =>
                `${a.name} (${a.mimeType}, attachment ${a.id}, session ${a.sessionId}, ${a.reviewed ? "manually reviewed" : "not reviewed"})`
            )
            .join("\n")
        )
      : "None included.",
    "",
    "## Completeness and privacy",
    "Automatic redaction is not perfect. Screenshots require separate visual review. Evidence candidates are not root-cause findings. cURL may require fresh credentials and matching state.",
    fence(session.notices.join("\n") || "No additional notices."),
    "",
    "## Redaction audit",
    fence(
      session.redactions.map((a) => `${a.location}: ${a.reason}`).join("\n") ||
        "No fields matched the active redaction rules."
    )
  );
  return lines.join("\n");
}
export function exportEvidence(
  source: Session,
  rules: RedactionRules = defaultRules,
  includeScreenshots = false
) {
  const safe = sanitizeSession(source, rules);
  if (
    !safe.report.title.trim() ||
    !safe.report.expected.trim() ||
    !safe.report.actual.trim()
  )
    throw new Error(
      "Add a title, expected result, and actual result before exporting the report."
    );
  if (
    !safe.report.requestIds.length &&
    !(includeScreenshots && safe.attachments.some((a) => a.reviewed))
  )
    throw new Error(
      "Attach at least one relevant request or include a reviewed screenshot before exporting."
    );
  safe.requests = safe.requests.filter((r) => safe.report.requestIds.includes(r.id));
  safe.attachments = includeScreenshots ? safe.attachments.filter((a) => a.reviewed) : [];
  if (includeScreenshots && source.attachments.some((a) => !a.reviewed))
    throw new Error(
      "Review every screenshot before including images, or export without screenshots."
    );
  const output = packageSession(safe, true, reportMarkdown(safe));
  const serialized = JSON.stringify(output, null, 2);
  if (bytes(serialized) > limits.importBytes)
    throw new Error(
      "Export exceeds 12 MiB. Remove screenshots or select fewer requests."
    );
  validatePackage(output);
  return { package: output, json: serialized, markdown: output.manifest.reportMarkdown };
}
