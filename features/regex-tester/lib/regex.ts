/**
 * Regular Expression Tester Engine
 * Match extraction, capture group breakdown, and replacement preview.
 * User-supplied patterns MUST run in a terminable worker, never on the UI thread.
 */

export interface RegexMatchGroup {
  name?: string;
  index: number;
  value: string;
}

export interface RegexMatch {
  index: number;
  length: number;
  text: string;
  groups: RegexMatchGroup[];
}

export interface RegexTestResult {
  valid: boolean;
  error?: string;
  matches: RegexMatch[];
  matchCount: number;
  replacementOutput?: string;
  executionTimeMs: number;
}

export interface RegexFlags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
}

export const defaultFlags: RegexFlags = {
  global: true,
  ignoreCase: false,
  multiline: true,
  dotAll: false,
  unicode: true,
};

export function flagsToString(flags: RegexFlags): string {
  let str = "";
  if (flags.global) str += "g";
  if (flags.ignoreCase) str += "i";
  if (flags.multiline) str += "m";
  if (flags.dotAll) str += "s";
  if (flags.unicode) str += "u";
  return str;
}

export function parseFlags(flagStr: string): RegexFlags {
  return {
    global: flagStr.includes("g"),
    ignoreCase: flagStr.includes("i"),
    multiline: flagStr.includes("m"),
    dotAll: flagStr.includes("s"),
    unicode: flagStr.includes("u"),
  };
}

export function testRegex(
  pattern: string,
  flags: RegexFlags,
  testString: string,
  replacement?: string
): RegexTestResult {
  if (!pattern) {
    return {
      valid: true,
      matches: [],
      matchCount: 0,
      replacementOutput: testString,
      executionTimeMs: 0,
    };
  }

  const startTime = performance.now();
  const flagStr = flagsToString(flags);

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flagStr);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message.replace(/^Invalid regular expression:\s*/, "")
        : "Invalid regular expression.";
    return {
      valid: false,
      error: errorMsg,
      matches: [],
      matchCount: 0,
      executionTimeMs: 0,
    };
  }

  const matches: RegexMatch[] = [];
  try {
    if (flags.global) {
      let match: RegExpExecArray | null;
      const maxMatches = 1000; // safety ceiling against infinite loops

      while ((match = regex.exec(testString)) !== null) {
        if (match[0].length === 0) {
          // AdvanceStringIndex: do not split a surrogate pair in Unicode mode.
          const point = testString.codePointAt(regex.lastIndex);
          regex.lastIndex +=
            flags.unicode && point !== undefined && point > 0xffff ? 2 : 1;
        }

        // Bounds extraction work between matches. The worker deadline handles
        // catastrophic backtracking inside a single exec or replacement.
        if (performance.now() - startTime > 250) {
          break;
        }

        const groups: RegexMatchGroup[] = [];
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            groups.push({
              index: i,
              value: match[i] ?? "",
            });
          }
        }
        if (match.groups) {
          for (const [name, val] of Object.entries(match.groups)) {
            const existing = groups.find((g) => g.value === val);
            if (existing) {
              existing.name = name;
            } else {
              groups.push({
                name,
                index: groups.length + 1,
                value: val ?? "",
              });
            }
          }
        }

        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[0],
          groups,
        });

        if (matches.length >= maxMatches) break;
      }
    } else {
      const match = regex.exec(testString);
      if (match) {
        const groups: RegexMatchGroup[] = [];
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            groups.push({
              index: i,
              value: match[i] ?? "",
            });
          }
        }
        if (match.groups) {
          for (const [name, val] of Object.entries(match.groups)) {
            const existing = groups.find((g) => g.value === val);
            if (existing) {
              existing.name = name;
            } else {
              groups.push({
                name,
                index: groups.length + 1,
                value: val ?? "",
              });
            }
          }
        }

        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[0],
          groups,
        });
      }
    }

    let replacementOutput: string | undefined;
    if (replacement !== undefined) {
      // Recreate regex for replace to reset lastIndex
      const replaceRegex = new RegExp(pattern, flagStr);
      replacementOutput = testString.replace(replaceRegex, replacement);
    }

    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    return {
      valid: true,
      matches,
      matchCount: matches.length,
      replacementOutput,
      executionTimeMs,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Error executing regular expression.";
    return {
      valid: false,
      error: errorMsg,
      matches: [],
      matchCount: 0,
      executionTimeMs: 0,
    };
  }
}

// Built-in pattern templates
export interface PatternTemplate {
  name: string;
  pattern: string;
  flags: RegexFlags;
  description: string;
  sampleText: string;
}

export const patternLibrary: PatternTemplate[] = [
  {
    name: "Email Address",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    flags: { ...defaultFlags, ignoreCase: true },
    description: "Standard RFC 5322 compliant email format",
    sampleText:
      "Contact us at support@example.com or admin.tech@company.org. Skip test@com.",
  },
  {
    name: "URL / Web Link",
    pattern:
      "https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    flags: { ...defaultFlags, ignoreCase: true },
    description: "HTTP and HTTPS URLs with domain and optional path/query",
    sampleText:
      "Visit https://developer.tools/docs or http://api.service.io:8080/v1/users?id=42 for info.",
  },
  {
    name: "IPv4 Address",
    pattern:
      "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b",
    flags: { ...defaultFlags },
    description: "Standard dot-decimal IPv4 address (0.0.0.0 to 255.255.255.255)",
    sampleText:
      "Server 1: 192.168.1.1, Gateway: 10.0.0.254, Public: 8.8.8.8. Ignore 999.1.2.3.",
  },
  {
    name: "UUID (v4)",
    pattern:
      "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
    flags: { ...defaultFlags, ignoreCase: true },
    description: "128-bit universally unique identifier version 4",
    sampleText:
      "Generated session id: c9bf9e57-1685-4c89-bafb-ff5af830be8a and ref: 4a2d3e14-9b2f-4122-83b1-a67b45c928e1.",
  },
  {
    name: "Date (YYYY-MM-DD)",
    pattern: "\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b",
    flags: { ...defaultFlags },
    description: "ISO 8601 Date with Year, Month, and Day capture groups",
    sampleText:
      "Deployments scheduled for 2026-10-24, 2026-11-01, and completed on 2025-12-31.",
  },
  {
    name: "Hex Color Code",
    pattern: "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b",
    flags: { ...defaultFlags, ignoreCase: true },
    description: "Hexadecimal color codes (3, 4, 6, or 8 characters)",
    sampleText:
      "Palettes: background #ffffff, brand accent #a4d881, muted #7d886e, and alpha #00000080.",
  },
];
