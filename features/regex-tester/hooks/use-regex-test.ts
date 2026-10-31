"use client";

import { useEffect, useMemo, useState } from "react";
import type { RegexFlags, RegexTestResult } from "../lib/regex";
import { regexFailure, runRegex } from "../lib/run-regex";
import type { RegexRequest } from "../lib/regex-worker";

const pending = regexFailure("Evaluating pattern…");

export function useRegexTest(
  pattern: string,
  flags: RegexFlags,
  testString: string,
  replacement: string
) {
  const request = useMemo(
    () => ({ pattern, flags, testString, replacement }),
    [pattern, flags, testString, replacement]
  );
  const [completed, setCompleted] = useState<{
    request: RegexRequest;
    result: RegexTestResult;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let result: RegexTestResult;
      if (
        pattern.length > 1000 ||
        testString.length > 1_000_000 ||
        replacement.length > 1000
      ) {
        result = regexFailure(
          "Limit patterns/replacements to 1,000 characters and test text to 1,000,000 characters."
        );
      } else {
        try {
          const worker = new Worker(new URL("../lib/regex-worker.ts", import.meta.url), {
            type: "module",
          });
          result = await runRegex(worker, request, controller.signal);
        } catch {
          result = regexFailure(
            "Regex evaluation requires Web Worker support in your browser."
          );
        }
      }
      if (!controller.signal.aborted) setCompleted({ request, result });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [request, pattern, testString, replacement]);

  return completed?.request === request ? completed.result : pending;
}
