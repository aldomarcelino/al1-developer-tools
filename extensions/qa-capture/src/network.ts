import { CaptureController } from "./capture.ts";
import { bytes, limits } from "../../../features/qa-bug-report/lib/model.ts";
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, max = 65536) =>
  typeof value === "string" ? value.slice(0, max) : "";
const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
function headers(value: unknown) {
  return Object.entries(object(value))
    .slice(0, 200)
    .map(([name, value]) => ({
      name: name.slice(0, 1000),
      value: String(value).slice(0, 16000),
    }));
}
export class NetworkCapture {
  private pending = new Map<
    string,
    { start: number; decoded: number; entry: Record<string, unknown> }
  >();
  private controller: CaptureController;
  private command: (
    method: string,
    params: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  constructor(
    controller: CaptureController,
    command: (
      method: string,
      params: Record<string, unknown>
    ) => Promise<Record<string, unknown>>
  ) {
    this.controller = controller;
    this.command = command;
  }
  clear() {
    this.pending.clear();
  }
  event(method: string, input: unknown) {
    const p = object(input),
      id = text(p.requestId, 200);
    if (!id || this.controller.snapshot()?.state !== "recording") return;
    if (method === "Network.requestWillBeSent") {
      if (this.pending.has(id) && p.redirectResponse)
        this.complete(id, object(p.redirectResponse), number(p.timestamp), true);
      if (this.pending.size >= limits.requests) {
        this.controller.stop("limit-reached", "250 in-flight request limit reached.");
        return;
      }
      const r = object(p.request),
        url = text(r.url, 20000);
      if (!/^https?:\/\//i.test(url)) return;
      const mime =
        headers(r.headers).find((h) => h.name.toLowerCase() === "content-type")?.value ??
        "";
      const data = typeof r.postData === "string" ? r.postData : undefined;
      // Omit over-limit raw data before retaining it. No response re-fetch/replay.
      this.pending.set(id, {
        start: number(p.timestamp),
        decoded: 0,
        entry: {
          startedDateTime: new Date(
            number(p.wallTime, Date.now() / 1000) * 1000
          ).toISOString(),
          time: 0,
          request: {
            method: text(r.method, 30),
            url,
            headers: headers(r.headers),
            queryString: Array.from(new URL(url).searchParams, ([name, value]) => ({
              name,
              value,
            })),
            ...(r.hasPostData || data !== undefined
              ? {
                  postData: {
                    mimeType: mime,
                    ...(data !== undefined && data.length <= limits.bodyBytes
                      ? { text: data }
                      : {}),
                  },
                }
              : {}),
          },
          response: { status: 0, statusText: "", headers: [], content: { mimeType: "" } },
          timings: {},
        },
      });
      this.checkBudget();
    } else if (method === "Network.dataReceived") {
      const job = this.pending.get(id);
      if (job) job.decoded += Math.max(0, number(p.dataLength));
    } else if (method === "Network.responseReceived") {
      const job = this.pending.get(id);
      if (job) job.entry.response = this.response(object(p.response));
      this.checkBudget();
    } else if (method === "Network.loadingFinished")
      this.complete(id, null, number(p.timestamp));
    else if (method === "Network.loadingFailed")
      this.complete(
        id,
        null,
        number(p.timestamp),
        false,
        text(p.errorText, 500) || "Network request failed"
      );
  }
  private checkBudget() {
    const budget = Array.from(this.pending.values()).reduce(
      (sum, job) => sum + bytes(JSON.stringify(job.entry)),
      0
    );
    if (budget > limits.sessionBytes) {
      this.pending.clear();
      this.controller.stop(
        "limit-reached",
        "4 MiB in-flight metadata budget reached. Pending requests omitted."
      );
    }
  }
  private response(r: Record<string, unknown>) {
    return {
      status: number(r.status),
      statusText: text(r.statusText, 500),
      headers: headers(r.headers),
      content: { mimeType: text(r.mimeType, 200) },
      bodySize: -1,
    };
  }
  private complete(
    id: string,
    redirect: Record<string, unknown> | null,
    end: number,
    isRedirect = false,
    failure = ""
  ) {
    const job = this.pending.get(id);
    if (!job) return;
    this.pending.delete(id);
    if (redirect) job.entry.response = this.response(redirect);
    job.entry.time = Math.max(0, (end - job.start) * 1000);
    if (job.decoded > limits.bodyBytes) {
      const response = object(job.entry.response);
      response.content = { ...object(response.content), size: job.decoded };
    }
    if (failure)
      job.entry.response = {
        status: 0,
        statusText: failure,
        headers: [],
        content: { mimeType: "" },
      };
    this.controller.accept(job.entry, (done) => {
      if (failure || isRedirect) {
        throw new Error("Response body unavailable for failed/redirect request");
      }
      void this.command("Network.getResponseBody", { requestId: id })
        .then((r) =>
          done(typeof r.body === "string" ? r.body : "", r.base64Encoded ? "base64" : "")
        )
        .catch(() => {
          /* CaptureController marks timeout, never refetches. */
        });
    });
  }
}
