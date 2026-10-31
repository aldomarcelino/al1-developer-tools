import type { RegexTestResult } from "./regex.ts";
import type { RegexRequest } from "./regex-worker.ts";

export const regexFailure = (error: string): RegexTestResult => ({
  valid: false,
  error,
  matches: [],
  matchCount: 0,
  executionTimeMs: 0,
});

/** The deadline lives outside the worker so even a blocked exec/replace is stopped. */
export function runRegex(
  worker: Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror">,
  request: RegexRequest,
  signal: AbortSignal,
  timeoutMs = 750
): Promise<RegexTestResult> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: RegexTestResult) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      resolve(result);
    };
    const abort = () => finish(regexFailure("Regex evaluation cancelled."));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<RegexTestResult>) => finish(event.data);
    worker.onerror = () => finish(regexFailure("Could not evaluate this regex."));
    timer = setTimeout(
      () =>
        finish(
          regexFailure(
            "Regex exceeded the time limit. Simplify the pattern or shorten the text."
          )
        ),
      timeoutMs
    );
    try {
      worker.postMessage(request);
    } catch {
      finish(regexFailure("Could not start regex evaluation."));
    }
  });
}
