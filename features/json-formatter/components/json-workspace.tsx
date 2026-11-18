"use client";

import { ActionButton } from "@/components/ui/action-button";
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Check,
  Copy,
  FileJson,
  Info,
  Loader2,
  Code2,
  Minimize2,
  Play,
  ShieldCheck,
  Wrench,
  Trash2,
  Upload,
  WrapText,
} from "lucide-react";
import {
  JsonErrorInfo,
  canRepairJson,
  formatTolerantJson,
  parseJsonError,
  repairJson,
  sampleJson,
  transformJson,
  unwrapStringifiedJson,
} from "@/features/json-formatter/lib/json";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
import styles from "@/features/json-formatter/styles.module.css";
import { collectJsonErrors } from "@/features/json-formatter/lib/json-diagnostics";

const indentOptions = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tabs" },
];
export function JsonWorkspace() {
  const modifier = useShortcutModifier();
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState(() => transformJson(sampleJson));
  const [indent, setIndent] = useState("2");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<JsonErrorInfo[]>([]);
  const errorInfo = errors[0] ?? null;
  const errorLines = new Set(errors.flatMap((item) => (item.line ? [item.line] : [])));
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

  const jumpToLine = (lineNumber: number, columnNumber = 1) => {
    setTab("input");
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const lines = input.split("\n");
      const lineStart = lines
        .slice(0, lineNumber - 1)
        .reduce((n, line) => n + line.length + 1, 0);
      const column = Math.min(columnNumber - 1, lines[lineNumber - 1]?.length ?? 0);
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(lineStart + column, lineStart + column);
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
      textarea.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = textarea.scrollTop;
      textarea.scrollIntoView({ block: "nearest" });
    });
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
  function handleAutoFix() {
    try {
      const repaired = repairJson(input);
      setInput(repaired);
      const indentVal = indent === "tab" ? "\t" : Number(indent);
      const result = transformJson(repaired, indentVal);
      setOutput(result);
      setValid(true);
      setErrors([]);
      setError("");
      setNotice("JSON errors repaired and formatted successfully.");
      setTab("output");
    } catch {
      const indentVal = indent === "tab" ? "\t" : Number(indent);
      setOutput(formatTolerantJson(input, indentVal));
    }
  }

  function handleUnescapeInput() {
    const unwrapped = unwrapStringifiedJson(input);
    if (unwrapped) {
      setInput(unwrapped);
      const indentVal = indent === "tab" ? "\t" : Number(indent);
      try {
        const result = transformJson(unwrapped, indentVal);
        setOutput(result);
        setValid(true);
        setErrors([]);
        setError("");
        setNotice("Unescaped stringified JSON to raw JSON.");
      } catch (failure) {
        const diagnostics = collectJsonErrors(unwrapped);
        setErrors(
          diagnostics.length ? diagnostics : [parseJsonError(unwrapped, failure)]
        );
        setValid(false);
        setError("");
        const formatted = formatTolerantJson(unwrapped, indentVal);
        setOutput(formatted);
        setNotice("Unescaped stringified JSON. Formatted with warnings.");
      }
    }
  }

  function run(mode: "format" | "minify" | "validate") {
    setBusy(true);
    setError("");
    setErrors([]);
    window.setTimeout(() => {
      const indentVal = mode === "minify" ? 0 : indent === "tab" ? "\t" : Number(indent);
      const wasStringified = Boolean(unwrapStringifiedJson(input));
      try {
        const result = transformJson(input, indentVal);
        setOutput(result);
        setValid(true);
        setErrors([]);
        setNotice(
          mode === "validate"
            ? "Valid JSON. Everything looks good."
            : wasStringified
              ? mode === "minify"
                ? "Stringified JSON unescaped and minified successfully."
                : "Stringified JSON unescaped and formatted successfully."
              : mode === "minify"
                ? "JSON minified successfully."
                : "JSON formatted successfully."
        );
        if (mode !== "validate") setTab("output");
      } catch (e) {
        setValid(false);
        const source = unwrapStringifiedJson(input) ?? input;
        if (source !== input) setInput(source);
        const diagnostics = collectJsonErrors(source);
        const parsed = diagnostics[0] ?? parseJsonError(source, e);
        setErrors(diagnostics.length ? diagnostics : [parsed]);
        setError(parsed.message);

        if (mode === "validate") {
          setOutput("");
          setNotice("");
        } else {
          const formatted = formatTolerantJson(input, indentVal);
          setOutput(formatted);
          setNotice(
            wasStringified
              ? mode === "minify"
                ? "Stringified JSON unescaped and minified with warnings."
                : "Stringified JSON unescaped and formatted with warnings."
              : mode === "minify"
                ? "JSON minified with syntax warnings. See error below."
                : "JSON formatted with syntax warnings. See error below."
          );
          setTab("output");
        }

        if (parsed.line && textareaRef.current) {
          const lineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight);
          const lineY = Math.max(0, (parsed.line - 3) * lineHeight);
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
      setErrors([]);
      return;
    }
    try {
      setInput(await file.text());
      setOutput("");
      setValid(false);
      setError("");
      setErrors([]);
      setNotice(`${file.name} loaded. Format to validate.`);
      setTab("input");
    } catch {
      setError("Could not read this file. Please try again.");
      setErrors([]);
    } finally {
      if (upload.current) upload.current.value = "";
    }
  }
  const bytes = new TextEncoder().encode(input).length;
  const canRepair = Boolean(errorInfo && input && canRepairJson(input));
  const isStringified = Boolean(input && unwrapStringifiedJson(input));
  return (
    <div className={`workspace-page page-width json-formatter ${styles.workspace}`}>
      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="JSON Formatter" icon={<FileJson size={24} />} />
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <ActionButton variant="primary" onClick={() => run("format")} disabled={busy}>
            {busy ? <Loader2 className="spin" size={15} /> : <Play size={14} />}
            Format JSON <kbd>{modifier} ↵</kbd>
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => run("minify")} disabled={busy}>
            <Minimize2 size={14} />
            Minify
          </ActionButton>
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
                <button
                  type="button"
                  className={styles.errorLocation}
                  onClick={() => jumpToLine(errorInfo.line!, errorInfo.column ?? 1)}
                  aria-label={
                    errors.length > 1
                      ? `${errors.length} errors. Go to first error at line ${errorInfo.line}`
                      : `Go to error at line ${errorInfo.line}${errorInfo.column ? `, column ${errorInfo.column}` : ""}`
                  }
                >
                  {errors.length > 1
                    ? `${errors.length} errors`
                    : `Ln ${errorInfo.line}${errorInfo.column ? `, Col ${errorInfo.column}` : ""}`}
                </button>
              )}
            </span>
            <div>
              {isStringified && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleUnescapeInput}
                  aria-label="Unescape stringified JSON"
                  title="Unescape stringified JSON into editor"
                >
                  <Code2 size={14} />
                  <span>Unescape</span>
                </ActionButton>
              )}
              <ActionButton
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => upload.current?.click()}
                aria-label="Upload JSON file"
                title="Upload JSON file"
              >
                <Upload size={16} />
              </ActionButton>
              <input
                ref={upload}
                type="file"
                accept=".json,application/json,text/plain"
                hidden
                onChange={(e) => readFile(e.target.files?.[0])}
              />
              <ActionButton
                variant="danger"
                size="sm"
                iconOnly
                aria-label="Clear JSON"
                title="Clear JSON"
                onClick={() => {
                  setInput("");
                  setOutput("");
                  setError("");
                  setErrors([]);
                  setValid(false);
                  setNotice("Editor cleared. Paste JSON to begin.");
                }}
              >
                <Trash2 size={16} />
              </ActionButton>
            </div>
          </div>
          <div className="editor-body">
            <div className="line-numbers" ref={lineNumbersRef} aria-hidden="true">
              {input.split("\n").map((_, i) => {
                const isError = errorLines.has(i + 1);
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
              aria-invalid={Boolean(errorInfo)}
              aria-describedby={errorInfo ? "json-error-summary" : undefined}
              spellCheck={false}
              value={input}
              placeholder={'{\n  "hello": "world"\n}'}
              onScroll={handleScroll}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
                setErrors([]);
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
              <span
                className={`pane-dot ${output ? (valid ? "green" : "error-dot") : ""}`}
              />
              Output{" "}
              {output &&
                (valid ? (
                  <small className="valid-tag">Valid JSON</small>
                ) : (
                  <small className={styles.outputWarning}>Syntax warning</small>
                ))}
            </span>
            <div>
              <ActionButton
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Toggle output line wrapping"
                aria-pressed={wrap}
                onClick={() => setWrap(!wrap)}
                title="Wrap lines"
              >
                <WrapText size={16} />
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="sm"
                iconOnly
                disabled={!output}
                onClick={download}
                aria-label="Download JSON"
                title="Download JSON"
              >
                <Download size={16} />
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="sm"
                success={copied}
                title="Copy output"
                disabled={!output}
                onClick={copy}
                iconOnly
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </ActionButton>
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
                      /("(?:\\.|[^"\\])*"\s*:|'(?:\\.|[^'\\])*'\s*:|[a-zA-Z_$][a-zA-Z0-9_$]*\s*:|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/|\b(?:true|false|null|undefined|True|False|None|NaN|Infinity)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g
                    )
                    .map((part, i) => {
                      let syntaxClass = "";
                      if (
                        part.startsWith('"') ||
                        part.startsWith("'") ||
                        /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(part)
                      ) {
                        syntaxClass = part.trimEnd().endsWith(":")
                          ? "syntax-key"
                          : "syntax-string";
                      } else if (
                        /^(true|false|null|undefined|True|False|None|NaN|Infinity)$/.test(
                          part
                        )
                      ) {
                        syntaxClass = "syntax-bool";
                      } else if (/^-?\d/.test(part)) {
                        syntaxClass = "syntax-number";
                      } else if (part.startsWith("//") || part.startsWith("/*")) {
                        syntaxClass = "syntax-comment";
                      }
                      return (
                        <span key={i} className={syntaxClass}>
                          {part}
                        </span>
                      );
                    })}
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
        <div className={styles.errorSummary} id="json-error-summary" role="alert">
          <AlertCircle className={styles.errorIcon} size={17} aria-hidden="true" />
          <div className={styles.errorDetails}>
            <span className={styles.errorLabel}>
              {errors.length === 1 ? "1 syntax error" : `${errors.length} syntax errors`}
            </span>
            <ul className={styles.errorList} aria-label="JSON syntax errors">
              {errors.map((item, index) => (
                <li key={`${item.line}:${item.column}:${index}`}>
                  {item.line ? (
                    <button
                      type="button"
                      className={styles.diagnosticLocation}
                      onClick={() => jumpToLine(item.line!, item.column ?? 1)}
                      aria-label={`Go to error at line ${item.line}, column ${item.column ?? 1}: ${item.message}`}
                    >
                      Ln {item.line}, Col {item.column ?? 1}
                    </button>
                  ) : null}
                  <span>{item.message}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.errorActions}>
            {canRepair && (
              <button
                type="button"
                className={styles.repairButton}
                onClick={handleAutoFix}
                aria-label="Auto-fix JSON errors"
                title="Automatically fix common JSON formatting errors"
              >
                <Wrench size={14} />
                <span>Fix JSON</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`feedback ${valid && !error ? "success" : ""}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {error ? (
            <AlertCircle size={16} />
          ) : valid ? (
            <Check size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>
            {error || notice || (valid ? "Valid JSON. Everything looks good." : "")}
          </span>
          {valid && !error && <span className="feedback-right">Ready when you are.</span>}
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
            <span className="shortcut-key">{modifier} ↵</span>
            <span>
              <strong>Keep your hands on the keyboard</strong>Use {modifier} + Enter to
              format from anywhere on this page.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
