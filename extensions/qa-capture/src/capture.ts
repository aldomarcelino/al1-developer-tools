import {
  newSession,
  packageSession,
  body,
  bytes,
  limits,
  type Session,
  type Attachment,
} from "../../../features/qa-bug-report/lib/model.ts";
import { parseHarEntry, isTextMime } from "../../../features/qa-bug-report/lib/har.ts";
import { sanitizeSession } from "../../../features/qa-bug-report/lib/redact.ts";
import { httpUrl } from "../../../features/qa-bug-report/lib/validate.ts";
export type CaptureMeta = {
  url: string;
  userAgent: string;
  platform: string;
  tabId: number;
  environment: string;
  build: string;
};
export type ContentReader = (done: (content: string, encoding: string) => void) => void;
export class CaptureController {
  private session: Session | null = null;
  private generation = 0;
  private deadline: ReturnType<typeof setTimeout> | undefined;
  private pending = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; cancel: () => void }
  >();
  private changed: (session: Session | null) => void;
  constructor(changed: (session: Session | null) => void = () => {}) {
    this.changed = changed;
  }
  snapshot() {
    return this.session ? structuredClone(this.session) : null;
  }
  private emit() {
    this.changed(this.snapshot());
  }
  recover(session: Session) {
    this.clear();
    this.session = sanitizeSession(session);
    this.session.state = "stopped";
    this.session.endedAt ??= new Date().toISOString();
    this.session.notices.push(
      session.capture === "extension-debugger"
        ? "Recovered local quick capture after the extension worker restarted. Recording is stopped; the latest unsaved events may be absent."
        : "Recovered local snapshot after DevTools reopened. Recording is stopped; the latest unsaved events may be absent."
    );
    this.emit();
  }
  start(meta: CaptureMeta, capture: Session["capture"] = "extension-devtools") {
    httpUrl(meta.url, "Inspected page");
    if (meta.environment.length > 300 || meta.build.length > 300)
      throw new Error("Environment and build must each be at most 300 characters.");
    this.clear();
    this.session = newSession(meta.url, capture);
    this.session.tabId = meta.tabId;
    this.session.browser = meta.userAgent.slice(0, 2000);
    this.session.platform = meta.platform.slice(0, 200);
    this.session.environment = {
      value: meta.environment,
      source: meta.environment ? "manual" : "not-provided",
    };
    this.session.build = {
      value: meta.build,
      source: meta.build ? "manual" : "not-provided",
    };
    this.session.state = "recording";
    this.session.notices =
      capture === "extension-debugger"
        ? [
            "Quick capture uses Chrome debugger for this tab only. Earlier/pending requests, cross-process frames, worker internals, WebSocket frames and full streams are not captured. Opening DevTools or another debugger can stop recording. Screenshots need separate visual review.",
          ]
        : [
            "DevTools capture only. Earlier requests, requests still unfinished at Stop, complete streams, WebSocket frames, console, and service-worker internals are not captured. Capture continues while this panel is hidden and DevTools remains open.",
          ];
    this.deadline = setTimeout(
      () =>
        this.stop(
          "limit-reached",
          "15-minute capture duration reached. Recording stopped."
        ),
      limits.durationMs
    );
    this.session = sanitizeSession(this.session);
    this.emit();
  }
  stop(
    state: "stopped" | "paused" | "limit-reached" | "error" = "stopped",
    notice = "Recording stopped. Requests whose body retrieval was pending are marked Unavailable."
  ) {
    if (!this.session || !["recording", "paused"].includes(this.session.state)) return;
    this.generation++;
    clearTimeout(this.deadline);
    for (const job of this.pending.values()) {
      clearTimeout(job.timer);
      job.cancel();
    }
    this.pending.clear();
    this.session.state = state;
    this.session.endedAt = state === "paused" ? null : new Date().toISOString();
    if (this.session.notices.length < 100) this.session.notices.push(notice);
    this.emit();
  }
  pause() {
    this.stop(
      "paused",
      "Capture paused. Requests during the pause are not captured; pending response bodies are unavailable."
    );
  }
  resume() {
    if (this.session?.state !== "paused") throw new Error("This capture is not paused.");
    const remaining =
      limits.durationMs - (Date.now() - Date.parse(this.session.startedAt));
    if (remaining <= 0) {
      this.stop("limit-reached", "15-minute session duration reached.");
      return;
    }
    this.session.state = "recording";
    this.session.endedAt = null;
    this.deadline = setTimeout(
      () => this.stop("limit-reached", "15-minute session duration reached."),
      remaining
    );
    this.emit();
  }
  clear() {
    this.generation++;
    clearTimeout(this.deadline);
    for (const job of this.pending.values()) clearTimeout(job.timer);
    this.pending.clear();
    this.session = null;
    this.emit();
  }
  mark(description: string, source: "capture" | "navigation" = "capture") {
    const s = this.session;
    if (!s || !["recording", "paused"].includes(s.state))
      throw new Error("Start capture before adding a marker.");
    if (s.markers.length >= limits.markers) throw new Error("100-marker limit reached.");
    if (!description.trim()) throw new Error("Describe the event briefly.");
    s.markers.push({
      id: crypto.randomUUID(),
      sessionId: s.id,
      at: new Date().toISOString(),
      description: description.slice(0, 2000),
      source,
    });
    this.session = sanitizeSession(s);
    this.emit();
  }
  navigate(url: string) {
    if (this.session?.state !== "recording") return;
    try {
      httpUrl(url, "Navigation URL");
      this.mark(`Navigated to ${url}`, "navigation");
    } catch {
      this.stop(
        "error",
        "Navigation left the supported HTTP(S) scope or marker limit was reached. Recording stopped."
      );
    }
  }
  accept(entry: unknown, readContent: ContentReader) {
    const s = this.session;
    if (!s || s.state !== "recording") return;
    if (Date.now() - Date.parse(s.startedAt) >= limits.durationMs) {
      this.stop("limit-reached", "15-minute capture limit reached.");
      return;
    }
    if (s.requests.length >= limits.requests) {
      this.stop(
        "limit-reached",
        "250-request limit reached. Additional requests were not captured."
      );
      return;
    }
    let request;
    try {
      request = parseHarEntry(entry, s.id, crypto.randomUUID());
    } catch {
      if (s.notices.length < 100)
        s.notices.push(
          "A request event could not be parsed or used an unsupported URL. It was not captured."
        );
      this.emit();
      return;
    }
    // onRequestFinished may describe a request that started before Start.
    if (
      Date.parse(request.startedAt) < Date.parse(s.startedAt) ||
      Date.parse(request.startedAt) > Date.now() + 1000
    )
      return;
    const requestId = request.id;
    const proposed = sanitizeSession({ ...s, requests: [...s.requests, request] });
    if (bytes(JSON.stringify(proposed)) > limits.sessionBytes) {
      this.stop(
        "limit-reached",
        "4 MiB session budget reached. Further evidence was not captured."
      );
      return;
    }
    this.session = proposed;
    request = this.session.requests[this.session.requests.length - 1];
    const mime = request.response.body.mimeType;
    if (
      request.method === "HEAD" ||
      [204, 304].includes(request.response.status) ||
      request.response.body.status === "Truncated" ||
      /event-stream|multipart/i.test(mime) ||
      (mime && !isTextMime(mime))
    ) {
      this.emit();
      return;
    }
    const generation = this.generation;
    const sessionId = this.session.id;
    const declaredSize = request.response.body.originalBytes;
    const update = (
      content: string | undefined,
      encoding = "",
      reason: string | null = null
    ) => {
      if (
        generation !== this.generation ||
        this.session?.id !== sessionId ||
        this.session.state !== "recording"
      )
        return;
      const target = this.session.requests.find((r) => r.id === requestId);
      if (!target) return;
      const job = this.pending.get(requestId);
      if (job) clearTimeout(job.timer);
      this.pending.delete(requestId);
      let next = body(
        content,
        mime,
        content === undefined ? "Unavailable" : undefined,
        reason
      );
      if (content !== undefined && encoding === "base64") {
        if (content.length > (limits.bodyBytes * 4) / 3 + 4)
          next = body("x".repeat(limits.bodyBytes + 1), mime);
        else
          try {
            next = body(
              new TextDecoder("utf-8", { fatal: true }).decode(
                Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
              ),
              mime
            );
          } catch {
            next = body(
              undefined,
              mime,
              "Unsupported",
              "Body is binary or has invalid base64 encoding."
            );
          }
      } else if (encoding && encoding !== "utf8")
        next = body(
          undefined,
          mime,
          "Unsupported",
          "Unsupported response body encoding."
        );
      if (content === "" && (target.response.status === 0 || declaredSize !== 0))
        next = body(
          undefined,
          mime,
          "Unavailable",
          target.response.status === 0
            ? "Network failure; response body unavailable."
            : "Chrome returned no body text; a genuinely empty response could not be confirmed."
        );
      const candidate = sanitizeSession({
        ...this.session,
        requests: this.session.requests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                response: { ...r.response, body: next },
                completeness: next.reason ? [next.reason] : [],
              }
            : r
        ),
      });
      if (bytes(JSON.stringify(candidate)) > limits.sessionBytes) {
        target.response.body = body(
          undefined,
          mime,
          "Truncated",
          "Session body budget exceeded."
        );
        this.stop(
          "limit-reached",
          "4 MiB session budget reached while collecting response body."
        );
        return;
      }
      this.session = candidate;
      this.emit();
    };
    this.pending.set(requestId, {
      timer: setTimeout(
        () => update(undefined, "", "Response body retrieval timed out after 3 seconds."),
        3000
      ),
      cancel: () => {
        const target = this.session?.requests.find((r) => r.id === requestId);
        if (target)
          target.response.body = body(
            undefined,
            mime,
            "Unavailable",
            "Capture stopped before response body retrieval completed."
          );
      },
    });
    this.emit();
    try {
      readContent((text, encoding) =>
        update(typeof text === "string" ? text : undefined, encoding)
      );
    } catch {
      update(undefined, "", "Capture API could not provide this response body.");
    }
  }
  toggleRequest(id: string) {
    const s = this.session;
    if (!s || !s.requests.some((r) => r.id === id))
      throw new Error("Request not found in this capture.");
    const selected = !s.report.requestIds.includes(id);
    s.report.requestIds = selected
      ? [...s.report.requestIds, id]
      : s.report.requestIds.filter((value) => value !== id);
    this.emit();
    return selected;
  }
  attach(image: Attachment) {
    const s = this.session;
    if (!s || image.sessionId !== s.id || s.attachments.length >= limits.screenshots)
      throw new Error("Choose this session and keep at most two screenshots.");
    if ((image.base64.length * 3) / 4 > limits.screenshotBytes)
      throw new Error("Screenshot exceeds 2 MiB. Try a smaller viewport.");
    if (
      bytes(JSON.stringify({ ...s, attachments: [...s.attachments, image] })) >
      limits.sessionBytes
    )
      throw new Error(
        "4 MiB capture budget reached. Finish this capture or try a smaller screenshot."
      );
    s.attachments.push(image);
    this.emit();
  }
  export() {
    if (!this.session) throw new Error("There is no session to export.");
    return packageSession(sanitizeSession(this.session), true);
  }
}
