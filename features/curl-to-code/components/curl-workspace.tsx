"use client";

import { ActionButton } from "@/components/ui/action-button";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Check,
  Code2,
  Copy,
  Info,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  WrapText,
} from "lucide-react";
import {
  CodeTarget,
  convertCurl,
  sampleCurlCommands,
  TARGET_OPTIONS,
} from "@/features/curl-to-code/lib/curl";
import { CustomSelect, SelectOption } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

const targetSelectOptions: SelectOption[] = TARGET_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

const quickTargets: { value: CodeTarget; label: string }[] = [
  { value: "js-fetch", label: "Fetch" },
  { value: "js-axios", label: "Axios" },
  { value: "ts-fetch", label: "TypeScript" },
  { value: "python-requests", label: "Python" },
  { value: "go-http", label: "Go" },
  { value: "php-curl", label: "PHP" },
];

function highlightCode(code: string) {
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|\b\d+\b|\b(?:import|export|from|const|let|var|function|async|await|return|if|else|try|catch|finally|throw|new|type|interface|class|def|for|in|package|func|err|http|echo|header|print|require|open|with|as)\b|\b(?:true|false|null|undefined|None|True|False|nil)\b|\b(?:GET|POST|PUT|DELETE|PATCH|HEAD)\b)/g;

  const parts = code.split(tokenRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("//") || part.startsWith("#") || part.startsWith("/*")) {
      return (
        <span key={i} className="syntax-comment">
          {part}
        </span>
      );
    }
    if (part.startsWith('"') || part.startsWith("'") || part.startsWith("`")) {
      return (
        <span key={i} className="syntax-string">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={i} className="syntax-number">
          {part}
        </span>
      );
    }
    if (/^(true|false|null|undefined|None|True|False|nil)$/.test(part)) {
      return (
        <span key={i} className="syntax-bool">
          {part}
        </span>
      );
    }
    if (/^(GET|POST|PUT|DELETE|PATCH|HEAD)$/.test(part)) {
      return (
        <span key={i} className="syntax-fn">
          {part}
        </span>
      );
    }
    if (
      /^(import|export|from|const|let|var|function|async|await|return|if|else|try|catch|finally|throw|new|type|interface|class|def|for|in|package|func|err|http|echo|header|print|require|open|with|as)$/.test(
        part
      )
    ) {
      return (
        <span key={i} className="syntax-keyword">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CurlWorkspace() {
  const [curlInput, setCurlInput] = useState(sampleCurlCommands.jsonPost);
  const [target, setTarget] = useState<CodeTarget>("js-fetch");
  const [notice, setNotice] = useState("Sample cURL command converted.");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [wrap, setWrap] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inputLineNumbersRef = useRef<HTMLDivElement>(null);
  const outputPreRef = useRef<HTMLPreElement>(null);
  const outputLineNumbersRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTargetMeta =
    TARGET_OPTIONS.find((t) => t.value === target) || TARGET_OPTIONS[0];

  const setNoticeWithTimeout = (msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setNotice("");
    }, 3500);
  };

  // Convert cURL command in real-time
  const result = useMemo(() => {
    return convertCurl(curlInput, target);
  }, [curlInput, target]);

  // Synchronize scroll on input
  const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (inputLineNumbersRef.current) {
      inputLineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Synchronize scroll on output
  const handleOutputScroll = (e: React.UIEvent<HTMLPreElement>) => {
    if (outputLineNumbersRef.current) {
      outputLineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleCopy = async () => {
    if (!result.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setNoticeWithTimeout(`Copied ${currentTargetMeta.label} code!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy code to clipboard.");
    }
  };

  const handleClear = () => {
    setCurlInput("");
    setNoticeWithTimeout("Editor cleared.");
    if (inputTextareaRef.current) {
      inputTextareaRef.current.focus();
    }
  };

  const handleDownload = () => {
    if (!result.code) return;
    const blob = new Blob([result.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `request${currentTargetMeta.extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setNoticeWithTimeout(`Downloaded "${a.download}".`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNoticeWithTimeout("Please choose a file smaller than 2 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      setCurlInput(text);
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read uploaded file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inputLineCount = curlInput ? curlInput.split("\n").length : 0;
  const outputLineCount = result.code ? result.code.split("\n").length : 0;

  return (
    <div className="workspace-page page-width">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sh,.bash,.txt,.curl"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Tool Header */}
      <ToolHeader title="cURL to Code" icon={<Terminal size={24} />} />

      {/* Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group" style={{ alignItems: "center", flexWrap: "wrap" }}>
          {/* Quick Target Tabs */}
          <SegmentedTabs<CodeTarget>
            value={target}
            onChange={(val) => setTarget(val)}
            options={quickTargets}
          />

          {/* Full Target Dropdown */}
          <CustomSelect
            label="Language"
            value={target}
            onChange={(val) => {
              setTarget(val as CodeTarget);
              const found = TARGET_OPTIONS.find((t) => t.value === val);
              if (found) setNoticeWithTimeout(`Switched target to ${found.label}.`);
            }}
            options={targetSelectOptions}
            ariaLabel="Target Programming Language"
          />
        </div>

        <div className="toolbar-group">
          <ActionButton
            type="button"
            variant="primary"
            onClick={handleDownload}
            disabled={!result.code}
            title={`Download ${currentTargetMeta.extension} file`}
          >
            <Download size={14} />
            <span>Download {currentTargetMeta.extension}</span>
          </ActionButton>
        </div>
      </div>

      {/* Quick Examples Bar */}
      <div className="sample-bar">
        <span className="sample-bar-label">
          <Terminal size={13} />
          Presets:
        </span>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setCurlInput(sampleCurlCommands.jsonPost);
            setNoticeWithTimeout("Loaded JSON POST command.");
          }}
        >
          JSON POST
        </button>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setCurlInput(sampleCurlCommands.getWithQuery);
            setNoticeWithTimeout("Loaded GET Query command.");
          }}
        >
          GET Query
        </button>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setCurlInput(sampleCurlCommands.basicAuthForm);
            setNoticeWithTimeout("Loaded Basic Auth Form command.");
          }}
        >
          Basic Auth
        </button>
      </div>

      {/* Mobile Workspace Tabs */}
      <div className="mobile-editor-tabs">
        <button
          type="button"
          aria-pressed={activeTab === "input"}
          onClick={() => setActiveTab("input")}
        >
          cURL Command ({inputLineCount} lines)
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "output"}
          onClick={() => setActiveTab("output")}
        >
          {currentTargetMeta.label} ({outputLineCount} lines)
        </button>
      </div>

      {/* Dual Editor Panes */}
      <div className="editor-layout" style={{ minHeight: "560px", height: "640px" }}>
        {/* Left Pane: cURL Input */}
        <section
          className={`editor-pane ${activeTab === "input" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot" />
              cURL Command
            </span>
            <div>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => fileInputRef.current?.click()}
                title="Upload cURL command from file"
                aria-label="Upload cURL file"
              >
                <Upload size={16} />
              </ActionButton>
              <ActionButton
                type="button"
                variant="danger"
                size="sm"
                iconOnly
                onClick={handleClear}
                title="Clear input"
                aria-label="Clear input"
              >
                <Trash2 size={16} />
              </ActionButton>
            </div>
          </div>

          <div className="editor-body" style={{ height: "100%", flex: 1 }}>
            <div
              className="line-numbers"
              ref={inputLineNumbersRef}
              aria-hidden="true"
              onWheel={(e) => {
                if (inputTextareaRef.current) {
                  inputTextareaRef.current.scrollTop += e.deltaY;
                }
              }}
            >
              {Array.from({ length: Math.max(1, inputLineCount) }).map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={inputTextareaRef}
              onScroll={handleInputScroll}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder="Paste cURL command here (e.g. curl -X POST https://api.com -H '...' -d '...')..."
              spellCheck={false}
              autoComplete="off"
              aria-label="cURL command input"
            />
          </div>

          <div className="editor-footer">
            <span>
              {curlInput.length} chars <i /> {inputLineCount} lines
            </span>
            <span>Shell Script</span>
          </div>
        </section>

        {/* Right Pane: Generated Code Output */}
        <section
          className={`editor-pane output-pane ${activeTab === "output" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className={`pane-dot ${result.code ? "green" : ""}`} />
              {currentTargetMeta.label}
              {result.parsed && (
                <span
                  className={`method-badge ${result.parsed.method.toLowerCase()}`}
                  style={{ marginLeft: "4px" }}
                >
                  {result.parsed.method}
                </span>
              )}
            </span>
            <div>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => setWrap(!wrap)}
                title="Toggle line wrapping"
                aria-label="Toggle line wrapping"
                aria-pressed={wrap}
              >
                <WrapText size={16} />
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                onClick={handleDownload}
                disabled={!result.code}
                title={`Download ${currentTargetMeta.extension} file`}
                aria-label="Download code file"
              >
                <Download size={16} />
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                success={copied}
                onClick={handleCopy}
                disabled={!result.code}
                title="Copy generated code"
                iconOnly
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </ActionButton>
            </div>
          </div>

          <div className="editor-body" style={{ height: "100%", flex: 1 }}>
            {result.code ? (
              <>
                <div
                  className="line-numbers"
                  ref={outputLineNumbersRef}
                  aria-hidden="true"
                  onWheel={(e) => {
                    if (outputPreRef.current) {
                      outputPreRef.current.scrollTop += e.deltaY;
                    }
                  }}
                >
                  {Array.from({ length: Math.max(1, outputLineCount) }).map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <pre
                  ref={outputPreRef}
                  onScroll={handleOutputScroll}
                  className={wrap ? "wrap" : ""}
                  tabIndex={0}
                  aria-label="Generated code output"
                >
                  {highlightCode(result.code)}
                </pre>
              </>
            ) : (
              <div className="output-empty">
                <Terminal size={32} />
                <h3>Ready to Convert</h3>
                <p>Paste a cURL command on the left to generate equivalent code.</p>
              </div>
            )}
          </div>

          <div className="editor-footer">
            <span>
              {result.code.length} chars <i /> {outputLineCount} lines
            </span>
            <span suppressHydrationWarning>
              {result.parsed ? `${result.parsed.method} request` : "Idle"} <i />{" "}
              {mounted ? `${result.executionTimeMs}ms` : "< 1ms"} <i /> 100% Client-Side
            </span>
          </div>
        </section>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="feedback success">
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Unsupported Options Warning Banner */}
      {result.warnings.length > 0 && (
        <div className="feedback warning">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Note: </strong>
            {result.warnings.join(". ")}.
          </span>
        </div>
      )}

      {/* Parsing Error Alert */}
      {!result.success && result.error && (
        <div className="feedback-card error" role="alert">
          <div className="error-banner-main">
            <span className="error-icon-chip">
              <AlertCircle size={16} />
            </span>
            <div className="error-banner-text">
              <div className="error-banner-header">
                <strong>cURL Parse Notice</strong>
              </div>
              <p className="error-tip-text">{result.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Section */}
      <section className="workspace-docs">
        <div>
          <h2>Production-Ready API Code Generation</h2>
          <p>
            Transform command-line cURL requests into clean, idiomatic HTTP client code
            across modern web, backend, and script languages without ever executing the
            network call.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Code2 size={18} />
            <span>
              <strong>6 Native Target Runtimes</strong>
              Generates idiomatic async/await syntax for JavaScript Fetch, Axios,
              TypeScript, Python Requests, Go net/http, and PHP cURL.
            </span>
          </p>
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Preserved Request Semantics</strong>
              Accurately maps request headers, query parameters, URL-encoded forms, raw
              JSON payloads, and basic authentication credentials.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>Zero-Execution Air-Gapped Security</strong>
              Your private endpoints, secret API keys, and authorization tokens remain
              strictly offline. Parsing happens entirely in your local browser sandbox.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
