import {
  bytes,
  limits,
  type Session,
  type Pair,
  type Body,
  type Redaction,
} from "./model.ts";
export const REDACTED = "[REDACTED]";
export const defaultSecretKeys = [
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "password",
  "passwd",
  "passcode",
  "secret",
  "token",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "client_secret",
  "session",
  "csrf",
  "email",
  "phone",
  "creditcard",
];
export type RedactionRules = { extraKeys: string[] };
export const defaultRules: RedactionRules = { extraKeys: [] };
export function sanitizeSession(
  source: Session,
  rules: RedactionRules = defaultRules
): Session {
  const result = structuredClone(source);
  const audit: Redaction[] = [...source.redactions];
  const keys = [...defaultSecretKeys, ...rules.extraKeys]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const secret = (name: string) =>
    keys.some((key) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .includes(key)
    );
  function mark(location: string, reason: string) {
    if (
      audit.length < 5000 &&
      !audit.some((a) => a.location === location && a.reason === reason)
    )
      audit.push({ location: location.slice(0, 1000), reason });
  }
  function raw(text: string, path: string): string {
    // Responses often echo a serialized JSON payload inside a string field.
    // Inspect that structure as well, without evaluating or rendering it.
    try {
      const embedded: unknown = JSON.parse(text);
      if (embedded && typeof embedded === "object") {
        const cleaned = json(embedded, `${path}.embedded`);
        if (JSON.stringify(cleaned) !== JSON.stringify(embedded))
          return JSON.stringify(cleaned);
      }
    } catch {}
    let value = text;
    const replace = (pattern: RegExp, replacement: string) => {
      const next = value.replace(pattern, replacement);
      if (next !== value) mark(path, "Secret pattern in text");
      value = next;
    };
    replace(/Bearer\s+(?!\[REDACTED\])[^\s"'<>;,]+/gi, `Bearer ${REDACTED}`);
    replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED);
    replace(
      /((?:password|passwd|secret|token|api[_-]?key|authorization|cookie|email|phone)[\w-]*["']?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s&,;<>]+)/gi,
      `$1"${REDACTED}"`
    );
    // Custom key patterns are literals, never user-supplied regular expressions.
    for (const key of rules.extraKeys.filter((k) => /^[a-zA-Z0-9_-]{1,80}$/.test(k))) {
      replace(
        new RegExp(
          `(${key}["']?\\s*[:=]\\s*)("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|[^\\s&,;<>]+)`,
          "gi"
        ),
        `$1"${REDACTED}"`
      );
    }
    return value;
  }
  function entries(items: Pair[], path: string): Pair[] {
    return items.map((p, i) => {
      const loc = `${path}[${i}].${p.name}`;
      if (secret(p.name)) {
        if (p.value !== REDACTED) mark(loc, "Sensitive field name");
        return { ...p, value: REDACTED };
      }
      return { ...p, value: raw(p.value, loc) };
    });
  }
  function url(text: string, path: string): string {
    try {
      const parsed = new URL(text);
      let changed = false;
      if (parsed.username || parsed.password) {
        parsed.username = REDACTED;
        parsed.password = REDACTED;
        changed = true;
        mark(path, "URL credentials");
      }
      const safePath = raw(parsed.pathname, `${path}.path`);
      if (safePath !== parsed.pathname) {
        parsed.pathname = safePath;
        changed = true;
      }
      const next = Array.from(parsed.searchParams, ([name, value], i) => {
        const v = secret(name) ? REDACTED : raw(value, `${path}.query[${i}]`);
        if (v !== value) {
          changed = true;
          mark(`${path}.query.${name}`, "Sensitive query value");
        }
        return [name, v] as [string, string];
      });
      if (changed) parsed.search = new URLSearchParams(next).toString();
      if (parsed.hash) {
        parsed.hash = "";
        changed = true;
        mark(`${path}.fragment`, "URL fragment omitted");
      }
      return changed ? parsed.href : text;
    } catch {
      return raw(text, path);
    }
  }
  function json(value: unknown, path: string, depth = 0): unknown {
    if (depth > 20) {
      mark(path, "Deep content omitted");
      return REDACTED;
    }
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "string" &&
      secret(value[0])
    ) {
      if (value[1] !== REDACTED) mark(`${path}[1]`, "Sensitive name/value tuple");
      return [value[0], REDACTED];
    }
    if (Array.isArray(value))
      return value.map((v, i) => json(v, `${path}[${i}]`, depth + 1));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => {
          const record = value as Record<string, unknown>;
          if (
            key === "value" &&
            [record.name, record.key].some(
              (name) => typeof name === "string" && secret(name)
            )
          ) {
            if (v !== REDACTED) mark(`${path}.value`, "Sensitive named value");
            return [key, REDACTED];
          }
          if (secret(key)) {
            if (v !== REDACTED) mark(`${path}.${key}`, "Sensitive JSON key");
            return [key, REDACTED];
          }
          return [key, json(v, `${path}.${key}`, depth + 1)];
        })
      );
    return typeof value === "string" ? raw(value, path) : value;
  }
  function content(b: Body, path: string): Body {
    if (!b.text) return b;
    if (b.encoding !== "utf8") {
      mark(path, "Encoded/binary body omitted before sharing");
      return {
        ...b,
        text: "",
        status: "Unsupported",
        reason:
          "Encoded/binary package body omitted. This viewer supports UTF-8 text evidence only.",
      };
    }
    let next: string;
    try {
      next = JSON.stringify(json(JSON.parse(b.text), path));
    } catch {
      if (/x-www-form-urlencoded/i.test(b.mimeType)) {
        next = new URLSearchParams(
          entries(
            Array.from(new URLSearchParams(b.text), ([name, value]) => ({ name, value })),
            path
          ).map((p) => [p.name, p.value])
        ).toString();
      } else next = raw(b.text, path);
    }
    // Only rewrite valid JSON formatting when content actually changed.
    if (
      next !== b.text &&
      (audit.some((a) => a.location.startsWith(path)) || b.status === "Redacted")
    )
      return bytes(next) > limits.bodyBytes
        ? {
            ...b,
            text: "",
            status: "Truncated",
            reason: "Redacted body exceeds 64 KiB; content omitted.",
          }
        : {
            ...b,
            text: next,
            status: "Redacted",
            reason: "Sensitive values redacted. Review before sharing.",
          };
    return b;
  }
  result.pageUrl = url(result.pageUrl, "session.pageUrl");
  result.requests = result.requests.map((r) => ({
    ...r,
    url: url(r.url, `${r.id}.url`),
    query: entries(r.query, `${r.id}.query`),
    headers: entries(r.headers, `${r.id}.request.headers`),
    body: content(r.body, `${r.id}.request.body`),
    completeness: r.completeness.map((note, i) =>
      raw(note, `${r.id}.completeness[${i}]`)
    ),
    response: {
      ...r.response,
      statusText: raw(r.response.statusText, `${r.id}.response.statusText`),
      headers: entries(r.response.headers, `${r.id}.response.headers`),
      body: content(r.response.body, `${r.id}.response.body`),
    },
  }));
  result.markers = result.markers.map((m) => ({
    ...m,
    description: raw(m.description, `${m.id}.description`),
  }));
  for (const key of [
    "title",
    "description",
    "preconditions",
    "steps",
    "expected",
    "actual",
    "severity",
  ] as const)
    result.report[key] = raw(result.report[key], `report.${key}`);
  result.environment.value = raw(result.environment.value, "session.environment");
  result.build.value = raw(result.build.value, "session.build");
  result.notices = result.notices.map((n, i) => raw(n, `session.notices[${i}]`));
  result.browser = raw(result.browser, "session.browser");
  result.platform = raw(result.platform, "session.platform");
  result.redactions = audit.map((item, i) => ({
    location: raw(item.location, `audit[${i}].location`),
    reason: raw(item.reason, `audit[${i}].reason`),
  }));
  return result;
}
