/**
 * Lightweight, high-performance client-side Diff computation engine.
 * Computes line-by-line differences using LCS (Longest Common Subsequence).
 * Supports plain text diffs and semantic JSON normalization diffs.
 */

export type DiffChangeType = "unchanged" | "added" | "removed";

export interface DiffLine {
  type: DiffChangeType;
  text: string;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
}

export interface SideBySideRow {
  original?: {
    lineNumber: number;
    text: string;
    type: "unchanged" | "removed" | "empty";
  };
  modified?: {
    lineNumber: number;
    text: string;
    type: "unchanged" | "added" | "empty";
  };
}

export interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
  totalChanges: number;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  normalizeJson?: boolean;
}

export const sampleOriginalText = `Ramupod
Version: 1.0.0
Author: Ramupod

Features:
- Fast client-side utilities
- JSON Formatter & Validator
- Privacy focused
- Offline first architecture

Getting Started:
1. Clone the repository
2. Run npm install
3. Run npm run dev

Thank you for building with us!`;

export const sampleModifiedText = `Ramupod
Version: 2.0.0
Author: Ramupod & Community

Features:
- Fast client-side utilities
- JSON Formatter & Validator
- Markdown Editor with Live Preview
- Text & JSON Diff Viewer
- Privacy focused: 100% in browser
- Offline first architecture

Getting Started:
1. Clone the repository
2. Run npm install
3. Run npm run dev
4. Open http://localhost:3000

Thank you for building thoughtful tools with us!`;

export const sampleOriginalJson = `{
  "name": "ramupod",
  "version": "1.0.0",
  "private": true,
  "settings": {
    "theme": "system",
    "telemetry": false,
    "maxFileSizeMb": 2
  },
  "tools": [
    "json-formatter"
  ]
}`;

export const sampleModifiedJson = `{
  "name": "ramupod",
  "version": "2.0.0",
  "private": true,
  "settings": {
    "theme": "dark",
    "telemetry": false,
    "maxFileSizeMb": 5,
    "experimental": true
  },
  "tools": [
    "json-formatter",
    "markdown-editor",
    "diff-viewer"
  ]
}`;

/**
 * Normalizes JSON string by sorting keys recursively and formatting with 2 spaces.
 * Returns the original string if parsing fails.
 */
export function normalizeJsonString(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    const sortKeys = (obj: unknown): unknown => {
      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }
      if (obj !== null && typeof obj === "object") {
        const record = obj as Record<string, unknown>;
        return Object.keys(record)
          .sort()
          .reduce((acc: Record<string, unknown>, key) => {
            Object.defineProperty(acc, key, {
              value: sortKeys(record[key]),
              enumerable: true,
            });
            return acc;
          }, {});
      }
      return obj;
    };
    return JSON.stringify(sortKeys(parsed), null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * Normalizes line string based on comparison options.
 */
function normalizeLine(line: string, options?: DiffOptions): string {
  let res = line;
  if (options?.ignoreWhitespace) {
    res = res.trim().replace(/\s+/g, " ");
  }
  if (options?.ignoreCase) {
    res = res.toLowerCase();
  }
  return res;
}

/**
 * Computes unified diff lines between original and modified text using LCS.
 */
export function computeUnifiedDiff(
  original: string,
  modified: string,
  options?: DiffOptions
): DiffLine[] {
  if (original.length + modified.length > 2_000_000) {
    throw new Error("Keep combined diff input within 2,000,000 characters.");
  }
  let origText = original;
  let modText = modified;

  if (options?.normalizeJson) {
    origText = normalizeJsonString(origText);
    modText = normalizeJsonString(modText);
  }

  const origLines = origText ? origText.split("\n") : [];
  const modLines = modText ? modText.split("\n") : [];

  const n = origLines.length;
  const m = modLines.length;

  // Bound allocation and CPU before creating the quadratic LCS matrix.
  if (n + m > 10_000 || (n + 1) * (m + 1) > 1_000_000) {
    throw new Error(
      "Comparison is too large. Use fewer lines (at most 1,000,000 comparison cells)."
    );
  }
  const normalizedOriginal = origLines.map((line) => normalizeLine(line, options));
  const normalizedModified = modLines.map((line) => normalizeLine(line, options));

  // Dynamic programming matrix for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const oLine = normalizedOriginal[i - 1];
    for (let j = 1; j <= m; j++) {
      const mLine = normalizedModified[j - 1];
      if (oLine === mLine) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff lines
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizedOriginal[i - 1] === normalizedModified[j - 1]) {
      result.unshift({
        type: "unchanged",
        text: origLines[i - 1],
        originalLineNumber: i,
        modifiedLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "added",
        text: modLines[j - 1],
        modifiedLineNumber: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({
        type: "removed",
        text: origLines[i - 1],
        originalLineNumber: i,
      });
      i--;
    }
  }

  return result;
}

/**
 * Computes side-by-side rows aligning original and modified lines.
 */
export function computeSideBySideDiff(
  original: string,
  modified: string,
  options?: DiffOptions
): SideBySideRow[] {
  return alignDiffRows(computeUnifiedDiff(original, modified, options));
}

/** Derive a second view from an existing diff without repeating the LCS work. */
export function alignDiffRows(unified: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];

  let idx = 0;
  while (idx < unified.length) {
    const item = unified[idx];

    if (item.type === "unchanged") {
      rows.push({
        original: {
          lineNumber: item.originalLineNumber!,
          text: item.text,
          type: "unchanged",
        },
        modified: {
          lineNumber: item.modifiedLineNumber!,
          text: item.text,
          type: "unchanged",
        },
      });
      idx++;
    } else if (item.type === "removed") {
      // Gather contiguous removals and check if contiguous additions follow
      const removals: DiffLine[] = [];
      while (idx < unified.length && unified[idx].type === "removed") {
        removals.push(unified[idx]);
        idx++;
      }
      const additions: DiffLine[] = [];
      while (idx < unified.length && unified[idx].type === "added") {
        additions.push(unified[idx]);
        idx++;
      }

      const maxLen = Math.max(removals.length, additions.length);
      for (let k = 0; k < maxLen; k++) {
        const rem = removals[k];
        const add = additions[k];
        rows.push({
          original: rem
            ? {
                lineNumber: rem.originalLineNumber!,
                text: rem.text,
                type: "removed",
              }
            : {
                lineNumber: 0,
                text: "",
                type: "empty",
              },
          modified: add
            ? {
                lineNumber: add.modifiedLineNumber!,
                text: add.text,
                type: "added",
              }
            : {
                lineNumber: 0,
                text: "",
                type: "empty",
              },
        });
      }
    } else if (item.type === "added") {
      rows.push({
        original: {
          lineNumber: 0,
          text: "",
          type: "empty",
        },
        modified: {
          lineNumber: item.modifiedLineNumber!,
          text: item.text,
          type: "added",
        },
      });
      idx++;
    }
  }

  return rows;
}

/**
 * Calculates diff statistics: additions, deletions, unchanged lines, and total changes.
 */
export function calculateDiffStats(diffLines: DiffLine[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of diffLines) {
    if (line.type === "added") additions++;
    else if (line.type === "removed") deletions++;
    else if (line.type === "unchanged") unchanged++;
  }

  return {
    additions,
    deletions,
    unchanged,
    totalChanges: additions + deletions,
  };
}
