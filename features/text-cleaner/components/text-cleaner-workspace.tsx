"use client";

import styles from "../styles.module.css";

import { ActionButton } from "@/components/ui/action-button";

import { useMemo, useState } from "react";
import {
  BrushCleaning,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  ArrowLeftRight,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  cleanText,
  defaultCleanOptions,
  type CaseStyle,
} from "@/features/text-cleaner/lib/text-cleaner";
import { downloadBlob } from "@/lib/browser/download";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";

export function TextCleanerWorkspace() {
  const [text, setText] = useState("");
  const [options, setOptions] = useState(defaultCleanOptions);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => cleanText(text, options), [text, options]);

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setNoticeWithTimeout("Cleaned text copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Could not copy. Select the text and copy manually.");
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        setNoticeWithTimeout("Pasted text from clipboard.");
      }
    } catch {
      setNoticeWithTimeout("Clipboard access denied. Paste directly into the editor.");
    }
  };

  const handleClear = () => {
    setText("");
    setNoticeWithTimeout("Input text cleared.");
  };

  const handleUseAsInput = () => {
    if (!output) return;
    setText(output);
    setNoticeWithTimeout("Cleaned result moved to input.");
  };

  const handleDownload = () => {
    if (!output) return;
    downloadBlob(
      new Blob([output], { type: "text/plain;charset=utf-8" }),
      "cleaned-text.txt"
    );
    setNoticeWithTimeout("Downloaded cleaned-text.txt.");
  };

  const inputLines = text ? text.split("\n").length : 0;
  const outputLines = output ? output.split("\n").length : 0;
  const charDiff = text.length - output.length;

  return (
    <div className={`workspace-page page-width utility-tool ${styles.scope}`}>
      <ToolHeader
        title="Text Cleaner & Case Converter"
        icon={<BrushCleaning size={24} />}
      />

      {/* Primary Toolbar with side-by-side labels */}
      <div className="cleaner-toolbar">
        <CustomSelect
          labelPosition="side"
          label="Case style"
          value={options.caseStyle}
          onChange={(value) => setOptions({ ...options, caseStyle: value as CaseStyle })}
          options={[
            { value: "original", label: "Keep original" },
            { value: "lower", label: "lowercase" },
            { value: "upper", label: "UPPERCASE" },
            { value: "title", label: "Title Case" },
            { value: "camel", label: "camelCase" },
            { value: "snake", label: "snake_case" },
            { value: "kebab", label: "kebab-case" },
          ]}
        />

        <CustomSelect
          labelPosition="side"
          label="Sort lines"
          value={options.sort}
          onChange={(value) =>
            setOptions({ ...options, sort: value as typeof options.sort })
          }
          options={[
            { value: "none", label: "Keep order" },
            { value: "asc", label: "Ascending (A-Z)" },
            { value: "desc", label: "Descending (Z-A)" },
          ]}
        />

        <ActionButton
          type="button"
          variant="secondary"
          size="sm"

          onClick={() => {
            setText(
              "  helloWorld  \n\n  HTTPResponse  \n  helloWorld  \n  a little   clarity  "
            );
            setNoticeWithTimeout("Example text loaded.");
          }}
        >
          <Sparkles size={14} strokeWidth={1.8} />
          Try example
        </ActionButton>
      </div>

      {/* Cleaning Options Toggle Pills */}
      <div className="cleaner-pills-bar">
        {(
          [
            ["trim", "Trim each line"],
            ["collapse", "Collapse spaces"],
            ["empty", "Remove empty lines"],
            ["unique", "Remove duplicates"],
          ] as const
        ).map(([key, label]) => {
          const active = options[key];
          return (
            <button
              key={key}
              type="button"
              className={`cleaner-pill-btn ${active ? "active" : ""}`}
              onClick={() => setOptions({ ...options, [key]: !active })}
            >
              <span className="cleaner-pill-check">
                {active ? <Check size={11} strokeWidth={2.5} /> : null}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dual Editor Layout */}
      <div className="cleaner-grid">
        {/* Original Text Pane */}
        <section className="cleaner-panel">
          <div className="cleaner-panel-header">
            <div className="cleaner-panel-title">
              <span className="pane-dot" />
              <span>Original Text</span>
              <span className="cleaner-badge">
                {text.length.toLocaleString()} chars · {inputLines} lines
              </span>
            </div>

            <div className="cleaner-actions">
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                title="Paste text from clipboard"
                iconOnly
              >
                <ClipboardPaste size={14} strokeWidth={1.8} />
              </ActionButton>
              <ActionButton
                type="button"
                variant="danger"
                size="sm"
                disabled={!text}
                onClick={handleClear}
                title="Clear input text"
                iconOnly
              >
                <Trash2 size={14} strokeWidth={1.8} />
              </ActionButton>
            </div>
          </div>

          <textarea
            id="cleaner-input"
            className="cleaner-textarea"
            value={text}
            maxLength={200000}
            onChange={(e) => {
              setText(e.target.value);
              setNotice("");
            }}
            placeholder="Paste or type text to clean, format, or convert..."
            spellCheck={false}
          />

          <div className="cleaner-footer">
            <span>{text.length.toLocaleString()} / 200,000 UTF-16 units</span>
            <span>Input</span>
          </div>
        </section>

        {/* Cleaned Result Pane */}
        <section className="cleaner-panel">
          <div className="cleaner-panel-header">
            <div className="cleaner-panel-title">
              <span className="pane-dot green" />
              <span>Cleaned Result</span>
              <span className="cleaner-badge">
                {output.length.toLocaleString()} chars · {outputLines} lines
              </span>
            </div>

            <div className="cleaner-actions">
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                disabled={!output}
                onClick={handleUseAsInput}
                title="Move this output back to input for further processing"
                iconOnly
              >
                <ArrowLeftRight size={14} strokeWidth={1.8} />
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                success={copied}
                disabled={!output}
                onClick={handleCopy}
                title="Copy cleaned text to clipboard"
                iconOnly
              >
                {copied ? (
                  <Check size={14} strokeWidth={2.2} />
                ) : (
                  <Copy size={14} strokeWidth={1.8} />
                )}
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                disabled={!output}
                onClick={handleDownload}
                title="Download cleaned text file"
                iconOnly
              >
                <Download size={14} strokeWidth={1.8} />
              </ActionButton>
            </div>
          </div>

          <textarea
            id="cleaner-output"
            className="cleaner-textarea"
            value={output}
            readOnly
            placeholder="Cleaned and formatted text will appear here automatically..."
            spellCheck={false}
          />

          <div className="cleaner-footer">
            <span>
              {charDiff > 0
                ? `${charDiff.toLocaleString()} characters removed`
                : charDiff < 0
                  ? `${Math.abs(charDiff).toLocaleString()} characters added`
                  : "Same length"}
            </span>
            <span>Result</span>
          </div>
        </section>
      </div>

      {notice && (
        <p className="utility-notice" role="status" style={{ marginTop: "16px" }}>
          {notice}
        </p>
      )}
    </div>
  );
}
