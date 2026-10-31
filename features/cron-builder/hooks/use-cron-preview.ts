"use client";
import { useEffect, useState } from "react";
import type { CronPreview } from "../lib/preview";
export function useCronPreview(
  expression: string,
  timezone: string,
  after: string,
  valid: boolean
) {
  const key = JSON.stringify([expression, timezone, after]);
  const [completed, setCompleted] = useState<{
    key: string;
    result?: CronPreview;
    error?: string;
  }>();
  useEffect(() => {
    if (!after || !valid) return;
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      try {
        worker = new Worker(new URL("../lib/cron-worker.ts", import.meta.url), {
          type: "module",
        });
        timeout = setTimeout(() => {
          worker?.terminate();
          setCompleted({
            key,
            error:
              "Preview stopped after 3 seconds. Try a simpler expression or another timezone.",
          });
        }, 3000);
        worker.onmessage = (
          event: MessageEvent<{ result?: CronPreview; error?: string }>
        ) => {
          clearTimeout(timeout);
          worker?.terminate();
          setCompleted({ key, ...event.data });
        };
        worker.onerror = (event) => {
          event.preventDefault();
          clearTimeout(timeout);
          worker?.terminate();
          setCompleted({
            key,
            error:
              "Preview could not run. Refresh and try again; Web Worker support is required.",
          });
        };
        worker.postMessage({ expression, timezone, after });
      } catch {
        setCompleted({
          key,
          error: "Web Worker support is required to preview schedules.",
        });
      }
    }, 180);
    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      worker?.terminate();
    };
  }, [expression, timezone, after, key, valid]);
  return completed?.key === key ? completed : null;
}
