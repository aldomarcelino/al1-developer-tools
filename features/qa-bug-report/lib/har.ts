import {
  body,
  limits,
  newSession,
  packageSession,
  type Body,
  type Pair,
  type RequestEvidence,
} from "./model.ts";
import { httpUrl, object, pairs, string } from "./validate.ts";
export function isTextMime(mime: string) {
  return /^(text\/|application\/(?:[\w.-]+\+)?(?:json|xml)|application\/x-www-form-urlencoded)/i.test(
    mime
  );
}
export function parseHarEntry(
  value: unknown,
  sessionId: string,
  id: string
): RequestEvidence {
  const e = object(value, "HAR entry"),
    req = object(e.request, "HAR request"),
    res = object(e.response, "HAR response"),
    content = object(res.content ?? {}, "HAR content");
  httpUrl(req.url, "HAR request URL");
  string(req.method, "HAR method", 30);
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(req.method))
    throw new Error("HAR request has an invalid method.");
  string(e.startedDateTime, "HAR timestamp", 50);
  const time = Date.parse(e.startedDateTime);
  if (!Number.isFinite(time)) throw new Error("HAR entry has an invalid timestamp.");
  if (
    typeof res.status !== "number" ||
    !Number.isInteger(res.status) ||
    res.status < 0 ||
    res.status > 599
  )
    throw new Error("HAR response status is invalid.");
  pairs(req.headers ?? [], "HAR request headers", true);
  pairs(res.headers ?? [], "HAR response headers", true);
  const headers = ((req.headers ?? []) as Pair[]).map(({ name, value }) => ({
      name,
      value,
    })),
    responseHeaders = ((res.headers ?? []) as Pair[]).map(({ name, value }) => ({
      name,
      value,
    }));
  const post =
    req.postData === undefined ? undefined : object(req.postData, "HAR postData");
  const mime =
    typeof post?.mimeType === "string"
      ? post.mimeType.slice(0, 256)
      : (headers.find((h) => h.name.toLowerCase() === "content-type")?.value ?? "");
  let requestBody: Body;
  if (post && /multipart\//i.test(mime))
    requestBody = body(
      undefined,
      mime,
      "Unsupported",
      "Multipart/binary request bodies are not reconstructed."
    );
  else if (post?.text !== undefined) {
    string(post.text, "HAR payload", limits.importBytes);
    requestBody =
      isTextMime(mime) || !mime
        ? body(post.text, mime)
        : body(undefined, mime, "Unsupported", "Binary request payload is unsupported.");
  } else if (post?.params && /x-www-form-urlencoded/i.test(mime)) {
    pairs(post.params, "HAR form parameters", true);
    requestBody = body(
      new URLSearchParams(
        (post.params as Pair[]).map((p) => [p.name, p.value])
      ).toString(),
      mime
    );
  } else
    requestBody = body(
      undefined,
      mime,
      !post &&
        (req.method === "GET" || req.method === "HEAD") &&
        !(typeof req.bodySize === "number" && req.bodySize > 0)
        ? "Empty"
        : "Unavailable",
      post ? "HAR does not include request body text." : null
    );
  const responseMime =
    typeof content.mimeType === "string"
      ? content.mimeType.slice(0, 256)
      : (responseHeaders.find((h) => h.name.toLowerCase() === "content-type")?.value ??
        "");
  let responseBody: Body;
  if (res.status === 0)
    responseBody = body(
      undefined,
      responseMime,
      "Unavailable",
      "Network failure; no complete response body was captured."
    );
  else if (res.status === 204 || res.status === 304 || req.method === "HEAD")
    responseBody = body(
      "",
      responseMime,
      "Empty",
      "This HTTP response does not include a body."
    );
  else if (/text\/event-stream/i.test(responseMime))
    responseBody = body(
      undefined,
      responseMime,
      "Unsupported",
      "Complete streaming responses are not supported."
    );
  else if (responseMime && !isTextMime(responseMime))
    responseBody = body(
      undefined,
      responseMime,
      "Unsupported",
      "Binary response is not displayed or replayed."
    );
  else if (typeof content.size === "number" && content.size > limits.bodyBytes)
    responseBody = {
      ...body(
        undefined,
        responseMime,
        "Truncated",
        "Body exceeds 64 KiB; content omitted."
      ),
      originalBytes: content.size,
    };
  else if (
    content.text === undefined ||
    (content.text === "" && typeof content.size === "number" && content.size > 0)
  )
    responseBody = {
      ...body(
        undefined,
        responseMime,
        "Unavailable",
        "Response body was not provided by the capture API/HAR."
      ),
      originalBytes:
        typeof content.size === "number" && content.size >= 0 ? content.size : null,
    };
  else {
    string(content.text, "HAR response text", limits.importBytes);
    if (content.encoding && content.encoding !== "base64")
      responseBody = body(
        undefined,
        responseMime,
        "Unsupported",
        "Unsupported HAR body encoding."
      );
    else if (!isTextMime(responseMime) && responseMime)
      responseBody = body(
        undefined,
        responseMime,
        "Unsupported",
        "Binary response is not displayed or replayed."
      );
    else if (content.encoding === "base64") {
      try {
        const binary = atob(content.text);
        responseBody = body(
          new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(binary, (c) => c.charCodeAt(0))
          ),
          responseMime
        );
      } catch {
        responseBody = body(
          undefined,
          responseMime,
          "Unavailable",
          "Invalid base64 or non-UTF-8 response text."
        );
      }
    } else responseBody = body(content.text, responseMime);
  }
  const timings: Record<string, number> = {};
  for (const key of ["blocked", "dns", "connect", "send", "wait", "receive", "ssl"]) {
    const t =
      e.timings && typeof e.timings === "object"
        ? (e.timings as Record<string, unknown>)[key]
        : undefined;
    if (typeof t === "number" && Number.isFinite(t) && t >= -1 && t <= 1e12)
      timings[key] = t;
  }
  return {
    id,
    sessionId,
    startedAt: new Date(time).toISOString(),
    method: req.method.toUpperCase(),
    url: req.url,
    query: Array.from(new URL(req.url).searchParams, ([name, value]) => ({
      name,
      value,
    })),
    headers,
    body: requestBody,
    response: {
      status: res.status,
      statusText: typeof res.statusText === "string" ? res.statusText.slice(0, 300) : "",
      headers: responseHeaders,
      body: responseBody,
    },
    durationMs:
      typeof e.time === "number" &&
      Number.isFinite(e.time) &&
      e.time >= 0 &&
      e.time <= 1e12
        ? e.time
        : null,
    timings,
    completeness: ["Unavailable", "Truncated", "Unsupported"].includes(
      responseBody.status
    )
      ? [responseBody.reason ?? responseBody.status]
      : [],
  };
}
export function importHar(input: unknown) {
  const root = object(input, "HAR"),
    log = object(root.log, "HAR log");
  if (log.version !== "1.2") throw new Error("Only HAR version 1.2 is supported.");
  if (!Array.isArray(log.entries) || !log.entries.length)
    throw new Error("HAR log has no request entries.");
  if (log.entries.length > limits.requests)
    throw new Error(
      `HAR exceeds ${limits.requests} requests. Export a smaller selection.`
    );
  const session = newSession("https://example.invalid/", "har-import");
  session.requests = log.entries.map((e, i) =>
    parseHarEntry(e, session.id, `har-${i + 1}`)
  );
  session.startedAt = new Date(
    Math.min(...session.requests.map((r) => Date.parse(r.startedAt)))
  ).toISOString();
  session.endedAt = new Date(
    Math.max(
      ...session.requests.map((r) => Date.parse(r.startedAt) + (r.durationMs ?? 0))
    )
  ).toISOString();
  session.pageUrl = session.requests[0].url;
  session.state = "stopped";
  session.notices = [
    "Imported HAR: page URL uses the first recorded request, not verified tab metadata. Environment/build were not inferred. No UI markers or console evidence were captured by this import.",
  ];
  return packageSession(session);
}
