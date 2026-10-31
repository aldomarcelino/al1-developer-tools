"use client";
import { useEffect, useMemo, useState } from "react";
import {
  svgLimits,
  type SvgOptions,
  type SvgRequest,
  type SvgResponse,
} from "../lib/options";
export function useSvgOptimizer(
  source: string,
  options: SvgOptions,
  componentName: string
) {
  const request = useMemo<SvgRequest>(
    () => ({ source, options, componentName }),
    [source, options, componentName]
  );
  const [completed, setCompleted] = useState<{
    request: SvgRequest;
    response: SvgResponse;
  }>();
  useEffect(() => {
    if (!source.trim()) return;
    let worker: Worker | undefined, deadline: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const finish = (response: SvgResponse) => {
      clearTimeout(deadline);
      worker?.terminate();
      if (active) setCompleted({ request, response });
    };
    const debounce = setTimeout(() => {
      if (new TextEncoder().encode(source).length > svgLimits.inputBytes) {
        finish({ error: "Keep SVG input within 512 KB." });
        return;
      }
      try {
        worker = new Worker(new URL("../lib/svg-worker.ts", import.meta.url), {
          type: "module",
        });
        deadline = setTimeout(
          () =>
            finish({
              error:
                "SVG processing exceeded 5 seconds. Simplify the SVG or disable path minification.",
            }),
          svgLimits.timeoutMs
        );
        worker.onmessage = (event: MessageEvent<SvgResponse>) => finish(event.data);
        worker.onerror = (event) => {
          event.preventDefault();
          finish({
            error: "Could not run SVG processing. Web Worker support is required.",
          });
        };
        worker.postMessage(request);
      } catch {
        finish({ error: "Web Worker support is required to process SVGs." });
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(debounce);
      clearTimeout(deadline);
      worker?.terminate();
    };
  }, [request, source]);
  const response = completed?.request === request ? completed.response : null;
  return {
    result: response && "result" in response ? response.result : null,
    error: response && "error" in response ? response.error : "",
    pending: !!source.trim() && !response,
  };
}
