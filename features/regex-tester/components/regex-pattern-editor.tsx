"use client";
import { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { flagsToString, type RegexFlags } from "../lib/regex";
const quickTokens = [
  { label: "\\d", title: "Digit [0-9]" },
  { label: "\\w", title: "Word char [a-zA-Z0-9_]" },
  { label: "\\s", title: "Whitespace" },
  { label: "^", title: "Start of string/line" },
  { label: "$", title: "End of string/line" },
  { label: "+", title: "1 or more times" },
  { label: "*", title: "0 or more times" },
  { label: "?", title: "0 or 1 time (optional)" },
  { label: "[a-z]", title: "Character range" },
  { label: "(?:)", title: "Non-capturing group" },
  { label: "(?<name>)", title: "Named capture group" },
];

export function RegexPatternEditor({
  pattern,
  flags,
  error,
  onPatternChange,
  onToggleFlag,
}: {
  pattern: string;
  flags: RegexFlags;
  error?: string;
  onPatternChange: (pattern: string) => void;
  onToggleFlag: (key: keyof RegexFlags) => void;
}) {
  const patternInputRef = useRef<HTMLInputElement>(null);
  const flagStr = flagsToString(flags);
  const handleInsertToken = (token: string) => {
    if (!patternInputRef.current) {
      onPatternChange(pattern + token);
      return;
    }
    const start = patternInputRef.current.selectionStart ?? pattern.length;
    const end = patternInputRef.current.selectionEnd ?? pattern.length;
    const updated = pattern.slice(0, start) + token + pattern.slice(end);
    onPatternChange(updated);
    setTimeout(() => {
      patternInputRef.current?.focus();
      patternInputRef.current?.setSelectionRange(
        start + token.length,
        start + token.length
      );
    }, 10);
  };

  return (
    <>
      {" "}
      {/* Hero Pattern Card */}
      <div className="regex-hero-card">
        <div className="regex-hero-header">
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: "var(--muted)",
            }}
          >
            REGULAR EXPRESSION PATTERN
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              fontFamily: "var(--font-code)",
            }}
          >
            Flags: /{flagStr}/
          </span>
        </div>

        <div className={`regex-input-box ${Boolean(error) ? "has-error" : ""}`}>
          <span className="regex-slash">/</span>
          <input
            ref={patternInputRef}
            type="text"
            className="regex-hero-input"
            value={pattern}
            onChange={(e) => {
              onPatternChange(e.target.value.slice(0, 1000));
            }}
            maxLength={1000}
            autoComplete="off"
            placeholder="Type regex pattern (e.g. [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})..."
            spellCheck={false}
            aria-label="Regular expression pattern"
          />
          <span className="regex-slash">/</span>

          {/* Interactive Flags Pillbar */}
          <div className="regex-flags-pillbar">
            <button
              type="button"
              className={`regex-flag-pill ${flags.global ? "active" : ""}`}
              onClick={() => onToggleFlag("global")}
              title="Global (g) - Find all matches"
            >
              g
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.ignoreCase ? "active" : ""}`}
              onClick={() => onToggleFlag("ignoreCase")}
              title="Case-insensitive (i)"
            >
              i
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.multiline ? "active" : ""}`}
              onClick={() => onToggleFlag("multiline")}
              title="Multiline (m) - ^ and $ match line boundaries"
            >
              m
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.dotAll ? "active" : ""}`}
              onClick={() => onToggleFlag("dotAll")}
              title="DotAll (s) - . matches newline"
            >
              s
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.unicode ? "active" : ""}`}
              onClick={() => onToggleFlag("unicode")}
              title="Unicode (u)"
            >
              u
            </button>
          </div>
        </div>

        {Boolean(error) && (
          <div className="regex-error-text" role="status">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Cheat-sheet Quick Insertion Chips */}
        <div className="regex-quick-tokens">
          <span className="regex-token-label">Quick tokens:</span>
          {quickTokens.map((t) => (
            <button
              key={t.label}
              type="button"
              className="regex-token-btn"
              onClick={() => handleInsertToken(t.label)}
              title={t.title}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
