import type { RequestEvidence, Marker } from "./model.ts";
export type Identifier = {
  name: string;
  value: string;
  kind:
    | "server request ID"
    | "request ID candidate"
    | "correlation ID"
    | "trace ID"
    | "span ID"
    | "traceparent";
  source: string;
  note?: string;
};
export function parseTraceparent(
  value: string
): { traceId: string; spanId: string; flags: string } | null {
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(value);
  if (!match || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return null;
  return { traceId: match[1], spanId: match[2], flags: match[3] };
}
export function identifiers(request: RequestEvidence): Identifier[] {
  const result: Identifier[] = [];
  function add(name: string, value: string, source: string) {
    if (!value || value === "[REDACTED]") return;
    const key = name.toLowerCase().replace(/[^a-z]/g, "");
    if (key === "traceparent") {
      const parsed = parseTraceparent(value);
      result.push({
        name,
        value,
        kind: "traceparent",
        source,
        note: parsed
          ? "Valid W3C version 00"
          : "Not parsed: invalid or unsupported traceparent format/version",
      });
      if (parsed)
        result.push(
          {
            name: "trace-id",
            value: parsed.traceId,
            kind: "trace ID",
            source: `${source} → trace-id`,
          },
          {
            name: "parent-id",
            value: parsed.spanId,
            kind: "span ID",
            source: `${source} → parent-id (upstream span, not necessarily the server span)`,
          }
        );
    } else {
      const kind =
        key === "requestid" || key === "xrequestid"
          ? source.startsWith("Response")
            ? "server request ID"
            : "request ID candidate"
          : key === "correlationid" || key === "xcorrelationid"
            ? "correlation ID"
            : key === "traceid" || key === "xtraceid"
              ? "trace ID"
              : key === "spanid" || key === "xspanid"
                ? "span ID"
                : null;
      if (kind)
        result.push({
          name,
          value,
          kind,
          source,
          note: source.startsWith("Request")
            ? "Observed in outgoing data; server adoption is not verified."
            : "Captured identifier field; not verified against a tracing backend.",
        });
    }
  }
  for (const [label, headers] of [
    ["Request headers", request.headers],
    ["Response headers", request.response.headers],
  ] as const)
    headers.forEach((h, i) => add(h.name, h.value, `${label}[${i}].${h.name}`));
  function visit(value: unknown, path: string, depth = 0) {
    if (depth > 15 || result.length >= 200) return;
    if (Array.isArray(value)) {
      value.slice(0, 100).forEach((v, i) => visit(v, `${path}[${i}]`, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [name, v] of Object.entries(value)) {
      const location = `${path}[${JSON.stringify(name)}]`;
      if (typeof v === "string" || typeof v === "number") add(name, String(v), location);
      else visit(v, location, depth + 1);
      if (result.length >= 200) return;
    }
  }
  for (const [label, b] of [
    ["Request JSON body", request.body],
    ["Response JSON body", request.response.body],
  ] as const) {
    if (b.encoding !== "utf8") continue;
    try {
      visit(JSON.parse(b.text), label);
    } catch {}
  }
  return result;
}
export type CandidateRules = {
  slowMs: number;
  businessEnabled: boolean;
  businessPath: string;
  businessValue: string;
};
export const defaultCandidateRules: CandidateRules = {
  slowMs: 1000,
  businessEnabled: false,
  businessPath: "success",
  businessValue: "false",
};
export function candidateReasons(
  request: RequestEvidence,
  rules: CandidateRules
): string[] {
  const result: string[] = [];
  if (request.response.status === 0) result.push("Network failure reported (status 0)");
  else if (request.response.status >= 400)
    result.push(`HTTP ${request.response.status}; may be expected application behavior`);
  if (
    Number.isFinite(rules.slowMs) &&
    rules.slowMs >= 1 &&
    request.durationMs !== null &&
    request.durationMs >= rules.slowMs
  )
    result.push(`Duration ≥ ${rules.slowMs} ms`);
  if (
    rules.businessEnabled &&
    request.response.status === 200 &&
    /^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+){0,9}$/.test(rules.businessPath)
  ) {
    try {
      let value: unknown = JSON.parse(request.response.body.text);
      for (const part of rules.businessPath.split("."))
        value =
          value !== null && typeof value === "object" && Object.hasOwn(value, part)
            ? (value as Record<string, unknown>)[part]
            : undefined;
      const expected: unknown = JSON.parse(rules.businessValue);
      if (["string", "number", "boolean"].includes(typeof expected) || expected === null)
        if (value === expected)
          result.push(
            `Business rule: response JSON ${rules.businessPath} = ${rules.businessValue}`
          );
    } catch {}
  }
  return result;
}
export function aroundMarker(
  requests: RequestEvidence[],
  marker: Marker | undefined,
  beforeSeconds: number,
  afterSeconds: number
) {
  if (!marker) return requests;
  return requests.filter(
    (r) =>
      r.sessionId === marker.sessionId &&
      Date.parse(r.startedAt) >= Date.parse(marker.at) - beforeSeconds * 1000 &&
      Date.parse(r.startedAt) <= Date.parse(marker.at) + afterSeconds * 1000
  );
}
