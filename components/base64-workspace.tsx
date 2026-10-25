"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Binary,
  Check,
  Copy,
  Download,
  Info,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  EncodingDirection,
  EncodingMode,
  processEncoding,
  sampleBase64Plain,
} from "@/lib/base64-url";
import { CustomSelect } from "@/components/custom-select";
import { ToolHeader } from "@/components/tool-header";
import { SegmentedTabs } from "@/components/segmented-tabs";

export function Base64Workspace() {
  const [mode, setMode] = useState<EncodingMode>("base64");
  const [direction, setDirection] = useState<EncodingDirection>("encode");
  const [input, setInput] = useState(sampleBase64Plain);
  const [lineByLine, setLineByLine] = useState(false);
  const [stripPadding, setStripPadding] = useState(false);
  const [encodeAllCharacters, setEncodeAllCharacters] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("Base64 encoder ready.");
  const [mobileTab, setMobileTab] = useState<"input" | "output">("input");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(
    () =>
      processEncoding(input, mode, direction, {
        lineByLine,
        stripPadding,
        encodeAllCharacters,
      }),
    [input, mode, direction, lineByLine, stripPadding, encodeAllCharacters]
  );

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleSwap = () => {
    if (result.success && result.output) {
      setInput(result.output);
      setDirection((prev) => (prev === "encode" ? "decode" : "encode"));
      setNoticeWithTimeout("Swapped input with output and toggled direction.");
    } else {
      setNoticeWithTimeout("Cannot swap: output is empty or has error.");
    }
  };

  const handleCopy = async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setNoticeWithTimeout("Copied output to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy output.");
    }
  };

  const handleDownload = () => {
    if (!result.output) return;
    const blob = new Blob([result.output], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode}-${direction}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setNoticeWithTimeout("Downloaded output file.");
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
      setInput(text);
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read uploaded file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inputCharCount = input.length;
  const inputLineCount = input ? input.split("\n").length : 0;
  const outputCharCount = result.output.length;
  const outputLineCount = result.output ? result.output.split("\n").length : 0;

  return (
    <div className="workspace-page page-width">
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Base64 & URL" icon={<Binary size={24} />} />

      {/* Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          {/* Direction Toggle (Encode vs Decode) */}
          <SegmentedTabs<EncodingDirection>
            value={direction}
            onChange={(val) => {
              setDirection(val);
              setNoticeWithTimeout(
                `Switched to ${val === "encode" ? "Encode" : "Decode"} mode.`
              );
            }}
            options={[
              {
                value: "encode",
                label: "Encode",
                title: "Encode plaintext to encoded format",
              },
              {
                value: "decode",
                label: "Decode",
                title: "Decode encoded format back to plaintext",
              },
            ]}
          />

          {/* Mode Selector */}
          <CustomSelect
            label="Format"
            value={mode}
            onChange={(val) => {
              setMode(val as EncodingMode);
              setNoticeWithTimeout(`Format set to ${val.toUpperCase()}.`);
            }}
            options={[
              { value: "base64", label: "Base64 Standard" },
              { value: "base64url", label: "Base64URL (URL-Safe)" },
              { value: "url", label: "URL Percent-Encoding" },
              { value: "hex", label: "Hexadecimal (Hex)" },
            ]}
          />

          <button
            className="button"
            onClick={handleSwap}
            title="Swap input and output values"
          >
            <ArrowLeftRight size={14} />
            Swap
          </button>
        </div>

        {/* Toolbar Right: Copy & Download Output */}
        <div className="toolbar-group">
          <button
            className="button"
            onClick={handleCopy}
            disabled={!result.output || !result.success}
            title="Copy output to clipboard"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            className="button primary"
            onClick={handleDownload}
            disabled={!result.output || !result.success}
            title="Download result as text file"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="markdown-format-toolbar">
        <div className="base64-toolbar-options">
          <label className="base64-checkbox-label">
            <input
              type="checkbox"
              checked={lineByLine}
              onChange={(e) => setLineByLine(e.target.checked)}
            />
            <span>Process line-by-line</span>
          </label>

          {(mode === "base64" || mode === "base64url") && direction === "encode" && (
            <label className="base64-checkbox-label">
              <input
                type="checkbox"
                checked={stripPadding}
                onChange={(e) => setStripPadding(e.target.checked)}
              />
              <span>Strip padding (=)</span>
            </label>
          )}

          {mode === "url" && direction === "encode" && (
            <label className="base64-checkbox-label">
              <input
                type="checkbox"
                checked={encodeAllCharacters}
                onChange={(e) => setEncodeAllCharacters(e.target.checked)}
              />
              <span>Encode all special characters (Component mode)</span>
            </label>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-editor-tabs">
        <button
          aria-pressed={mobileTab === "input"}
          onClick={() => setMobileTab("input")}
        >
          Input ({inputLineCount} lines)
        </button>
        <button
          aria-pressed={mobileTab === "output"}
          onClick={() => setMobileTab("output")}
        >
          Output ({outputLineCount} lines)
        </button>
      </div>

      {/* Dual Editor Panes */}
      <div className="editor-layout" style={{ minHeight: "480px", height: "520px" }}>
        {/* Left Pane: Input */}
        <section
          className={`editor-pane ${mobileTab === "input" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot" />
              Input{" "}
              <small>{direction === "encode" ? "PLAIN TEXT" : mode.toUpperCase()}</small>
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload file into input"
              >
                <Upload size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => setInput("")}
                title="Clear input"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="editor-body" style={{ height: "100%", flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                direction === "encode"
                  ? "Type or paste text to encode..."
                  : `Paste ${mode.toUpperCase()} encoded string to decode...`
              }
              spellCheck={false}
              aria-label="Input content"
            />
          </div>
          <div className="editor-footer">
            <span>
              {result.inputBytes} bytes · {inputCharCount} chars · {inputLineCount} lines
            </span>
            <span>Input</span>
          </div>
        </section>

        {/* Right Pane: Output */}
        <section
          className={`editor-pane ${mobileTab === "output" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot green" />
              Output{" "}
              <small>
                {direction === "encode" ? mode.toUpperCase() : "DECODED TEXT"}
              </small>
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={handleCopy}
                disabled={!result.output}
                title={copied ? "Copied output" : "Copy output"}
                aria-label={copied ? "Copied output" : "Copy output"}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
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
                value={result.output}
                readOnly
                placeholder="Encoded or decoded output will appear here..."
                spellCheck={false}
                aria-label="Output content"
              />
            ) : (
              <div className="base64-error-box">
                <AlertTriangle size={18} />
                <div>
                  <strong>Decoding Error</strong>
                  <div style={{ marginTop: "4px" }}>{result.error}</div>
                </div>
              </div>
            )}
          </div>

          <div className="editor-footer">
            <span>
              {result.outputBytes} bytes · {outputCharCount} chars · {outputLineCount}{" "}
              lines
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              {result.success && result.inputBytes > 0 && (
                <span className="base64-ratio-badge">
                  {result.outputBytes >= result.inputBytes ? "+" : ""}
                  {(
                    ((result.outputBytes - result.inputBytes) / result.inputBytes) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              )}
              <span>Output</span>
            </span>
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
          <h2>Safe, Fast & UTF-8 Compliant Encoding</h2>
          <p>
            Standard browser encoding tools often fail on non-ASCII characters or corrupt
            emojis. This workspace implements full UTF-8 byte streams, ensuring your
            accents, symbols, and multilingual payloads stay intact.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Base64URL Safe (RFC 4648 §5)</strong>
              Converts standard Base64 characters into URL and filename safe
              representations by substituting + with - and / with _, preventing accidental
              URL parsing breaks.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Client-Side Privacy</strong>
              None of your sensitive payloads or API keys are transmitted across the
              network. All conversions occur locally in your browser memory.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
