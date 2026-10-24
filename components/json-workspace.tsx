"use client";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  Copy,
  FileJson,
  Info,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  Upload,
  WrapText,
} from "lucide-react";
import { JsonErrorInfo, parseJsonError, sampleJson, transformJson } from "@/lib/json";
import { CustomSelect } from "@/components/custom-select";
import { ToolHeader } from "@/components/tool-header";

const indentOptions = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tabs" },
];
export function JsonWorkspace() {
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState(() => transformJson(sampleJson));
  const [indent, setIndent] = useState("2");
  const [error, setError] = useState("");
  const [errorInfo, setErrorInfo] = useState<JsonErrorInfo | null>(null);
  const [notice, setNotice] = useState("Sample JSON is ready to format.");
  const [valid, setValid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("input");
  const [wrap, setWrap] = useState(true);

  const upload = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatRef = useRef<() => void>(() => {});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const jumpToLine = (lineNumber: number) => {
    setTab("input");
    if (textareaRef.current) {
      const lineY = Math.max(0, (lineNumber - 3) * 23);
      textareaRef.current.scrollTo({ top: lineY, behavior: "smooth" });
      textareaRef.current.focus();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = st;
    }
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  function run(mode: "format" | "minify" | "validate") {
    setBusy(true);
    setError("");
    setErrorInfo(null);
    window.setTimeout(() => {
      try {
        const result = transformJson(
          input,
          mode === "minify" ? 0 : indent === "tab" ? "\t" : Number(indent)
        );
        setOutput(result);
        setValid(true);
        setErrorInfo(null);
        setNotice(
          mode === "validate"
            ? "Valid JSON. Everything looks good."
            : mode === "minify"
              ? "JSON minified successfully."
              : "JSON formatted successfully."
        );
        if (mode !== "validate") setTab("output");
      } catch (e) {
        setValid(false);
        const parsed = parseJsonError(input, e);
        setErrorInfo(parsed);
        setError(parsed.message);
        setNotice("");
        setOutput("");
        if (parsed.line && textareaRef.current) {
          const lineY = Math.max(0, (parsed.line - 3) * 23);
          textareaRef.current.scrollTo({ top: lineY, behavior: "smooth" });
        }
      } finally {
        setBusy(false);
      }
    }, 60);
  }

  useEffect(() => {
    formatRef.current = () => run("format");
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formatRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard unavailable. Select the output and copy it manually.");
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([output], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Downloaded formatted.json.");
  }
  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Please choose a JSON file smaller than 2 MB.");
      return;
    }
    try {
      setInput(await file.text());
      setOutput("");
      setValid(false);
      setError("");
      setNotice(`${file.name} loaded. Format to validate.`);
      setTab("input");
    } catch {
      setError("Could not read this file. Please try again.");
    } finally {
      if (upload.current) upload.current.value = "";
    }
  }
  const bytes = new TextEncoder().encode(input).length;
  return (
    <div className="workspace-page page-width">
      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="JSON Formatter" icon={<FileJson size={24} />} />
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <button
            className="button primary"
            onClick={() => run("format")}
            disabled={busy}
          >
            {busy ? <Loader2 className="spin" size={15} /> : <Play size={14} />}
            Format JSON <kbd>⌘ ↵</kbd>
          </button>
          <button className="button" onClick={() => run("minify")} disabled={busy}>
            Minify
          </button>
        </div>
        <CustomSelect
          label="Indent"
          value={indent}
          onChange={setIndent}
          options={indentOptions}
          ariaLabel="Choose indentation format"
        />
      </div>
      <div className="mobile-editor-tabs">
        <button aria-pressed={tab === "input"} onClick={() => setTab("input")}>
          Input
        </button>
        <button aria-pressed={tab === "output"} onClick={() => setTab("output")}>
          Output
        </button>
      </div>
      <div className="editor-layout">
        <section
          className={`editor-pane ${tab === "input" ? "mobile-active" : ""} ${errorInfo?.line ? "has-error" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className={`pane-dot ${errorInfo?.line ? "error-dot" : ""}`} />
              Input <small>JSON</small>
              {errorInfo?.line && (
                <span className="pane-error-pill">
                  Line {errorInfo.line}
                  {errorInfo.column ? `:${errorInfo.column}` : ""}
                </span>
              )}
            </span>
            <div>
              <button
                className="icon-button"
                onClick={() => upload.current?.click()}
                aria-label="Upload JSON file"
                title="Upload JSON file"
              >
                <Upload size={16} />
              </button>
              <input
                ref={upload}
                type="file"
                accept=".json,application/json,text/plain"
                hidden
                onChange={(e) => readFile(e.target.files?.[0])}
              />
              <button
                className="icon-button"
                aria-label="Clear JSON"
                title="Clear JSON"
                onClick={() => {
                  setInput("");
                  setOutput("");
                  setError("");
                  setErrorInfo(null);
                  setValid(false);
                  setNotice("Editor cleared. Paste JSON to begin.");
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="editor-body">
            <div className="line-numbers" ref={lineNumbersRef} aria-hidden="true">
              {input.split("\n").map((_, i) => {
                const isError = errorInfo?.line === i + 1;
                return (
                  <span
                    key={i}
                    className={isError ? "line-error" : ""}
                    title={isError ? `Error on line ${i + 1}` : undefined}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
            <textarea
              ref={textareaRef}
              aria-label="JSON input"
              spellCheck={false}
              value={input}
              placeholder={'{\n  "hello": "world"\n}'}
              onScroll={handleScroll}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
                setErrorInfo(null);
                setValid(false);
                setOutput("");
                setNotice("Input changed. Format to validate.");
              }}
            />
          </div>
          <div className="editor-footer">
            <span>
              {input.split("\n").length} lines <i /> {bytes.toLocaleString()} bytes
            </span>
            <span>UTF-8</span>
          </div>
        </section>
        <section
          className={`editor-pane output-pane ${tab === "output" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className={`pane-dot ${output ? "green" : ""}`} />
              Output {output && <small className="valid-tag">Valid JSON</small>}
            </span>
            <div>
              <button
                className={`icon-button ${wrap ? "toggled" : ""}`}
                aria-label="Toggle output line wrapping"
                aria-pressed={wrap}
                onClick={() => setWrap(!wrap)}
                title="Wrap lines"
              >
                <WrapText size={16} />
              </button>
              <button
                className="icon-button"
                disabled={!output}
                onClick={download}
                aria-label="Download JSON"
                title="Download JSON"
              >
                <ArrowDownToLine size={16} />
              </button>
              <button
                className="small-button copy-button"
                disabled={!output}
                onClick={copy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="editor-body">
            {output ? (
              <>
                <div className="line-numbers" aria-hidden="true">
                  {output.split("\n").map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <pre
                  className={wrap ? "wrap" : ""}
                  tabIndex={0}
                  aria-label="Formatted JSON output"
                >
                  {output
                    .split(
                      /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|\b-?\d+(?:\.\d+)?\b)/g
                    )
                    .map((part, i) => (
                      <span
                        key={i}
                        className={
                          part.startsWith('"')
                            ? part.trimEnd().endsWith(":")
                              ? "syntax-key"
                              : "syntax-string"
                            : /^(true|false|null)$/.test(part)
                              ? "syntax-bool"
                              : /^-?\d/.test(part)
                                ? "syntax-number"
                                : ""
                        }
                      >
                        {part}
                      </span>
                    ))}
                </pre>
              </>
            ) : (
              <div className="output-empty">
                <FileJson size={32} />
                <h3>
                  {error ? "Let’s fix that JSON." : "A little structure goes a long way."}
                </h3>
                <p>
                  {error
                    ? "Check the error below and try again."
                    : "Your formatted JSON will appear here."}
                </p>
              </div>
            )}
          </div>
          <div className="editor-footer">
            <span>
              {output ? `${output.split("\n").length} lines` : "Waiting for input"}
            </span>
            <span>JSON</span>
          </div>
        </section>
      </div>
      {errorInfo ? (
        <div className="feedback-card error" role="alert" aria-live="assertive">
          <div className="error-banner-main">
            <span className="error-icon-chip">
              <AlertCircle size={16} />
            </span>
            <div className="error-banner-text">
              <div className="error-banner-header">
                <strong>{errorInfo.message}</strong>
                {errorInfo.line && (
                  <span className="error-pos-badge">
                    Line {errorInfo.line}
                    {errorInfo.column ? `:${errorInfo.column}` : ""}
                  </span>
                )}
              </div>
              {errorInfo.suggestion && (
                <p className="error-tip-text">{errorInfo.suggestion}</p>
              )}
            </div>
          </div>
          {errorInfo.line && (
            <button
              type="button"
              className="error-jump-btn"
              onClick={() => jumpToLine(errorInfo.line!)}
              aria-label={`Jump to line ${errorInfo.line}`}
            >
              <span>Line {errorInfo.line}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`feedback ${valid ? "success" : ""}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {valid ? <Check size={16} /> : <Info size={16} />}
          <span>{notice || (valid ? "Valid JSON. Everything looks good." : "")}</span>
          {valid && <span className="feedback-right">Ready when you are.</span>}
        </div>
      )}
      <section className="workspace-docs">
        <div>
          <h2>Readable JSON. In seconds.</h2>
          <p>
            Paste your JSON or upload a file, choose your indentation, and hit Format.
            Minify removes whitespace; Validate checks the syntax.
          </p>
        </div>
        <div className="docs-details">
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>Stays on your device</strong>Your JSON is processed in this browser
              and is never sent to a server.
            </span>
          </p>
          <p>
            <Info size={18} />
            <span>
              <strong>A note on numbers</strong>Uses native JavaScript JSON parsing. Very
              large integers may lose precision; encode them as strings to preserve exact
              values.
            </span>
          </p>
          <p>
            <span className="shortcut-key">⌘ ↵</span>
            <span>
              <strong>Keep your hands on the keyboard</strong>Use Cmd/Ctrl + Enter to
              format from anywhere on this page.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
