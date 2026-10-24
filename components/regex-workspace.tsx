"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Eye,
  Info,
  PenLine,
  Regex as RegexIcon,
  Replace,
  Sparkles,
} from "lucide-react";
import { flagsToString, patternLibrary, RegexFlags, testRegex } from "@/lib/regex";
import { ToolHeader } from "@/components/tool-header";
import { ClearButton } from "@/components/clear-button";
import { SegmentedTabs } from "@/components/segmented-tabs";

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

export function RegexWorkspace() {
  const [selectedTemplate, setSelectedTemplate] = useState(patternLibrary[0].name);
  const [pattern, setPattern] = useState(patternLibrary[0].pattern);
  const [flags, setFlags] = useState<RegexFlags>(patternLibrary[0].flags);
  const [testString, setTestString] = useState(patternLibrary[0].sampleText);
  const [replaceString, setReplaceString] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "highlight">("highlight");
  const [activeTab, setActiveTab] = useState<"matches" | "replace">("matches");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(
    "Regex Studio ready. Test or select a pattern template."
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const patternInputRef = useRef<HTMLInputElement>(null);

  const flagStr = useMemo(() => flagsToString(flags), [flags]);

  const testResult = useMemo(
    () => testRegex(pattern, flags, testString, replaceString),
    [pattern, flags, testString, replaceString]
  );

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const toggleFlag = (key: keyof RegexFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectTemplate = (tmpl: (typeof patternLibrary)[0]) => {
    setSelectedTemplate(tmpl.name);
    setPattern(tmpl.pattern);
    setFlags(tmpl.flags);
    setTestString(tmpl.sampleText);
    setNoticeWithTimeout(`Loaded "${tmpl.name}" pattern.`);
  };

  const handleInsertToken = (token: string) => {
    if (!patternInputRef.current) {
      setPattern((prev) => prev + token);
      return;
    }
    const start = patternInputRef.current.selectionStart ?? pattern.length;
    const end = patternInputRef.current.selectionEnd ?? pattern.length;
    const updated = pattern.slice(0, start) + token + pattern.slice(end);
    setPattern(updated);
    setTimeout(() => {
      patternInputRef.current?.focus();
      patternInputRef.current?.setSelectionRange(
        start + token.length,
        start + token.length
      );
    }, 10);
  };

  const handleCopyMatches = async () => {
    if (testResult.matches.length === 0) return;
    try {
      const matchTexts = testResult.matches.map((m) => m.text).join("\n");
      await navigator.clipboard.writeText(matchTexts);
      setCopied(true);
      setNoticeWithTimeout("Copied all matched texts.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy matches.");
    }
  };

  const handleCopyReplacement = async () => {
    if (!testResult.replacementOutput) return;
    try {
      await navigator.clipboard.writeText(testResult.replacementOutput);
      setCopied(true);
      setNoticeWithTimeout("Copied replaced string.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy replacement.");
    }
  };

  // Build inline highlighted segments
  const highlightedNodes = useMemo(() => {
    if (!pattern || testResult.matches.length === 0 || !testResult.valid) {
      return [testString];
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    testResult.matches.forEach((m, idx) => {
      // Unmatched segment before
      if (m.index > lastIndex) {
        segments.push(testString.slice(lastIndex, m.index));
      }
      // Matched segment with mark
      segments.push(
        <mark key={idx} title={`Match #${idx + 1} at index ${m.index}`}>
          {m.text}
        </mark>
      );
      lastIndex = m.index + m.length;
    });

    // Remainder
    if (lastIndex < testString.length) {
      segments.push(testString.slice(lastIndex));
    }

    return segments;
  }, [testString, testResult, pattern]);

  const lineCount = testString ? testString.split("\n").length : 0;

  return (
    <div className="workspace-page page-width">
      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Regex Tester" icon={<RegexIcon size={24} />} />

      {/* Quick Pattern Template Chips Bar */}
      <div className="regex-template-chips">
        {patternLibrary.map((tmpl) => (
          <button
            key={tmpl.name}
            type="button"
            className={`regex-chip-btn ${selectedTemplate === tmpl.name ? "active" : ""}`}
            onClick={() => handleSelectTemplate(tmpl)}
            title={tmpl.description}
          >
            {tmpl.name}
          </button>
        ))}
      </div>

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

        <div className={`regex-input-box ${!testResult.valid ? "has-error" : ""}`}>
          <span className="regex-slash">/</span>
          <input
            ref={patternInputRef}
            type="text"
            className="regex-hero-input"
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value.slice(0, 1000));
              setSelectedTemplate("");
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
              onClick={() => toggleFlag("global")}
              title="Global (g) - Find all matches"
            >
              g
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.ignoreCase ? "active" : ""}`}
              onClick={() => toggleFlag("ignoreCase")}
              title="Case-insensitive (i)"
            >
              i
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.multiline ? "active" : ""}`}
              onClick={() => toggleFlag("multiline")}
              title="Multiline (m) - ^ and $ match line boundaries"
            >
              m
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.dotAll ? "active" : ""}`}
              onClick={() => toggleFlag("dotAll")}
              title="DotAll (s) - . matches newline"
            >
              s
            </button>
            <button
              type="button"
              className={`regex-flag-pill ${flags.unicode ? "active" : ""}`}
              onClick={() => toggleFlag("unicode")}
              title="Unicode (u)"
            >
              u
            </button>
          </div>
        </div>

        {!testResult.valid && (
          <div className="regex-error-text">
            <AlertCircle size={14} />
            <span>{testResult.error}</span>
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

      {/* Regex Studio Layout */}
      <div className="regex-studio-layout">
        {/* Panel 1: Test String & Live Visual Highlighter */}
        <div className="regex-pane-card">
          <div className="regex-pane-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="pane-dot" />
              <span>Test String</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Toggle Edit vs Live Highlight Preview */}
              <SegmentedTabs<"highlight" | "edit">
                size="sm"
                value={viewMode}
                onChange={(val) => setViewMode(val)}
                options={[
                  {
                    value: "highlight",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Eye size={12} /> Live Highlight
                      </span>
                    ),
                    title: "View test string with matched segments highlighted",
                  },
                  {
                    value: "edit",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <PenLine size={12} /> Edit Text
                      </span>
                    ),
                    title: "Directly edit text",
                  },
                ]}
              />

              <ClearButton
                size="sm"
                onClick={() => {
                  setTestString("");
                  setNoticeWithTimeout("Cleared test string.");
                }}
                title="Clear test text"
              />
            </div>
          </div>

          <div
            style={{
              minHeight: "200px",
              height: "230px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {viewMode === "edit" ? (
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="Paste or type test string here..."
                spellCheck={false}
                aria-label="Regex test text"
                style={{
                  width: "100%",
                  height: "100%",
                  padding: "16px",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "var(--font-code)",
                  fontSize: "13px",
                  lineHeight: "1.7",
                  resize: "none",
                }}
              />
            ) : (
              <div
                className="regex-highlight-preview"
                onClick={() => setViewMode("edit")}
                title="Click to edit text"
              >
                {highlightedNodes}
              </div>
            )}
          </div>

          <div className="editor-footer">
            <span>
              {testString.length} chars · {lineCount} lines
            </span>
            <span>Test String</span>
          </div>
        </div>

        {/* Panel 2: Match Inspector & Capture Group Matrix */}
        <div className="regex-pane-card">
          <div className="regex-pane-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="pane-dot green" />
              {/* Tab Switcher: Matches vs Replace */}
              <SegmentedTabs<"matches" | "replace">
                size="sm"
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
                options={[
                  {
                    value: "matches",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Code2 size={12} /> Match Inspector
                      </span>
                    ),
                    badge: testResult.matchCount,
                  },
                  {
                    value: "replace",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Replace size={12} /> Substitution (Replace)
                      </span>
                    ),
                  },
                ]}
              />

              {testResult.valid && (
                <span
                  className={`regex-count-pill ${
                    testResult.matchCount > 0 ? "has-matches" : "no-matches"
                  }`}
                >
                  {testResult.matchCount}{" "}
                  {testResult.matchCount === 1 ? "match" : "matches"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeTab === "matches" ? (
                <button
                  type="button"
                  className="button"
                  onClick={handleCopyMatches}
                  disabled={testResult.matches.length === 0}
                  title="Copy all matched text values"
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    minHeight: "28px",
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy Matches"}
                </button>
              ) : (
                <button
                  type="button"
                  className="button primary"
                  onClick={handleCopyReplacement}
                  disabled={!testResult.replacementOutput}
                  title="Copy replaced string"
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    minHeight: "28px",
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy Output"}
                </button>
              )}
            </div>
          </div>

          {/* Replacement input bar when in replace mode */}
          {activeTab === "replace" && (
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--soft)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--muted)",
                }}
              >
                Replacement String:
              </span>
              <input
                type="text"
                value={replaceString}
                onChange={(e) => setReplaceString(e.target.value.slice(0, 1000))}
                maxLength={1000}
                autoComplete="off"
                placeholder="e.g. $1, [REDACTED], or replacement text..."
                spellCheck={false}
                style={{
                  flex: 1,
                  maxWidth: "420px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "7px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontFamily: "var(--font-code)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Content Area */}
          <div
            style={{
              minHeight: "250px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === "matches" ? (
              testResult.matches.length > 0 ? (
                <div className="regex-matches-grid">
                  {testResult.matches.map((match, idx) => (
                    <div key={idx} className="regex-card-item">
                      <div className="regex-card-top">
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>
                          Match #{idx + 1}
                        </span>
                        <span>
                          Index {match.index}..{match.index + match.length} (
                          {match.length} chars)
                        </span>
                      </div>

                      <div>
                        <span className="regex-card-match-val">{match.text}</span>
                      </div>

                      {match.groups.length > 0 && (
                        <div className="regex-groups-flow">
                          {match.groups.map((grp, gIdx) => (
                            <div key={gIdx} className="regex-group-row">
                              <span className="regex-group-tag">
                                {grp.name ? `${grp.name}:` : `Group $${grp.index}:`}
                              </span>
                              <span className="regex-group-content">
                                {grp.value || "(empty)"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="regex-empty-matches">
                  {pattern
                    ? "No matches found in the current test string."
                    : "Enter a regular expression pattern above or click a pattern template."}
                </div>
              )
            ) : (
              <textarea
                value={testResult.replacementOutput || ""}
                readOnly
                placeholder="Replacement preview will appear here..."
                spellCheck={false}
                aria-label="Regex replacement preview"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "250px",
                  padding: "16px",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "var(--font-code)",
                  fontSize: "13px",
                  lineHeight: "1.7",
                  resize: "none",
                }}
              />
            )}
          </div>

          <div className="editor-footer">
            <span suppressHydrationWarning>
              {mounted ? `${testResult.executionTimeMs}ms` : "< 1ms"} execution time ·{" "}
              {testResult.matchCount} total occurrences
            </span>
            <span>{activeTab === "matches" ? "Inspector" : "Replacement"}</span>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {notice && (
        <div className="feedback success">
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Documentation Section (without eyebrow) */}
      <section className="workspace-docs">
        <div>
          <h2>Precision Regular Expression Engine</h2>
          <p>
            Test, debug, and verify complex regex patterns with instant visual feedback,
            capture group isolation, and safe execution entirely inside your browser.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Capture Group Inspector</strong>
              Detailed breakdown of positional ($1, $2) and named (?&lt;name&gt;) groups
              per match with character span offsets.
            </span>
          </p>
          <p>
            <Replace size={18} />
            <span>
              <strong>Real-Time String Replacement</strong>
              Test replacement expressions using standard substitution tokens ($1, $2,
              $&amp;) before applying them in production code.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
