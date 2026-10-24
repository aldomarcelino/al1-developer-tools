"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileCode2,
  Info,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { jsonToTypeScript, sampleJsonForTs } from "@/lib/json-to-ts";
import { ToolHeader } from "@/components/tool-header";
import { ClearButton } from "@/components/clear-button";
import { SegmentedTabs } from "@/components/segmented-tabs";

export function JsonToTsWorkspace() {
  const [jsonInput, setJsonInput] = useState(sampleJsonForTs);
  const [rootName, setRootName] = useState("Root");
  const [useInterface, setUseInterface] = useState(true);
  const [exportTypes, setExportTypes] = useState(true);
  const [readonlyProps, setReadonlyProps] = useState(false);
  const [optionalProps, setOptionalProps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<"input" | "output">("input");
  const [notice, setNotice] = useState("JSON to TypeScript converter ready.");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(
    () =>
      jsonToTypeScript(jsonInput, {
        rootName,
        useInterface,
        exportTypes,
        readonlyProps,
        optionalProps,
      }),
    [jsonInput, rootName, useInterface, exportTypes, readonlyProps, optionalProps]
  );

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleCopy = async () => {
    if (!result.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setNoticeWithTimeout("Copied TypeScript definitions to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy code.");
    }
  };

  const handleDownload = () => {
    if (!result.code) return;
    const blob = new Blob([result.code], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rootName.toLowerCase() || "types"}.ts`;
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
      setJsonInput(text);
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read uploaded file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inputCharCount = jsonInput.length;
  const inputLineCount = jsonInput ? jsonInput.split("\n").length : 0;
  const outputLineCount = result.code ? result.code.split("\n").length : 0;

  return (
    <div className="workspace-page page-width">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="JSON to TypeScript" icon={<FileCode2 size={24} />} />

      {/* Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          {/* Root Interface Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
              Root Name:
            </span>
            <input
              type="text"
              className="jsonts-root-input"
              value={rootName}
              onChange={(e) => {
                // Sanitize input to only valid identifier characters (alphanumeric, _, $) and cap length
                const sanitized = e.target.value
                  .replace(/[^a-zA-Z0-9_$]/g, "")
                  .slice(0, 48);
                setRootName(sanitized);
              }}
              placeholder="Root"
              maxLength={48}
              spellCheck={false}
              autoComplete="off"
              aria-label="Root Type Name"
            />
          </div>

          {/* Interface vs Type toggle */}
          <SegmentedTabs<"interface" | "type">
            value={useInterface ? "interface" : "type"}
            onChange={(val) => setUseInterface(val === "interface")}
            options={[
              { value: "interface", label: "interface", title: "Generate interfaces" },
              { value: "type", label: "type", title: "Generate type aliases" },
            ]}
          />

          <ClearButton
            onClick={() => {
              setJsonInput("");
              setNoticeWithTimeout("Cleared input.");
            }}
            title="Clear JSON input"
          />
        </div>

        {/* Toolbar Right: Copy & Download Output */}
        <div className="toolbar-group">
          <button
            type="button"
            className="button"
            onClick={handleCopy}
            disabled={!result.code || !result.success}
            title="Copy TypeScript definitions"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy TypeScript"}
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleDownload}
            disabled={!result.code || !result.success}
            title="Download as .ts file"
          >
            <Download size={14} />
            Download .ts
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="markdown-format-toolbar">
        <div className="jsonts-options-group">
          <label>
            <input
              type="checkbox"
              checked={exportTypes}
              onChange={(e) => setExportTypes(e.target.checked)}
            />
            <span>
              Export definitions (<code>export</code>)
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={readonlyProps}
              onChange={(e) => setReadonlyProps(e.target.checked)}
            />
            <span>
              Readonly properties (<code>readonly</code>)
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={optionalProps}
              onChange={(e) => setOptionalProps(e.target.checked)}
            />
            <span>
              Optional properties (<code>?:</code>)
            </span>
          </label>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-editor-tabs">
        <button
          aria-pressed={mobileTab === "input"}
          onClick={() => setMobileTab("input")}
        >
          JSON Input ({inputLineCount} lines)
        </button>
        <button
          aria-pressed={mobileTab === "output"}
          onClick={() => setMobileTab("output")}
        >
          TypeScript ({result.typeCount} types)
        </button>
      </div>

      {/* Dual Editor Panes */}
      <div className="editor-layout" style={{ minHeight: "480px", height: "560px" }}>
        {/* Left Pane: JSON Input */}
        <section
          className={`editor-pane ${mobileTab === "input" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot" />
              JSON Input
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload JSON file"
              >
                <Upload size={14} />
              </button>
              <ClearButton
                size="sm"
                onClick={() => {
                  setJsonInput("");
                  setNoticeWithTimeout("Cleared input.");
                }}
                title="Clear input"
              />
            </div>
          </div>
          <div className="editor-body" style={{ height: "100%", flex: 1 }}>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste or type JSON object/array here..."
              spellCheck={false}
              aria-label="JSON input content"
            />
          </div>
          <div className="editor-footer">
            <span>
              {inputCharCount} chars · {inputLineCount} lines
            </span>
            <span>JSON</span>
          </div>
        </section>

        {/* Right Pane: TypeScript Output */}
        <section
          className={`editor-pane ${mobileTab === "output" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot green" />
              TypeScript Definitions
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={handleCopy}
                disabled={!result.code}
                title="Copy TypeScript"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div
            className="editor-body"
            style={{
              height: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {result.success ? (
              <textarea
                value={result.code}
                readOnly
                placeholder="TypeScript definitions will appear here..."
                spellCheck={false}
                aria-label="Generated TypeScript code"
              />
            ) : (
              <div className="jsonts-error-card">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Invalid JSON Input</strong>
                  <div style={{ marginTop: "4px" }}>{result.error}</div>
                </div>
              </div>
            )}
          </div>

          <div className="editor-footer">
            <span>
              {result.typeCount} {result.typeCount === 1 ? "type" : "types"} ·{" "}
              {outputLineCount} lines
            </span>
            <span>TypeScript</span>
          </div>
        </section>
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
          <h2>Idiomatic TypeScript Schema Generation</h2>
          <p>
            Turns arbitrary JSON payloads, API responses, and database schemas into
            structured, strongly-typed TypeScript interfaces and type aliases.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Deep Object & Array Extraction</strong>
              Automatically analyzes nested objects and arrays, creating clean, reusable
              sub-interfaces with merged properties.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Client-Side Privacy</strong>
              Your sensitive production JSON data is parsed and converted entirely inside
              your browser with zero network calls.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
