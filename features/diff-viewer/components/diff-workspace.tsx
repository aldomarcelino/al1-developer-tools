"use client";

import styles from "../styles.module.css";

import { useNotice } from "@/hooks/use-notice";
import { ActionButton } from "@/components/ui/action-button";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Copy,
  FileDiff,
  Info,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  calculateDiffStats,
  alignDiffRows,
  computeUnifiedDiff,
  DiffOptions,
  sampleModifiedJson,
  sampleModifiedText,
  sampleOriginalJson,
  sampleOriginalText,
} from "@/features/diff-viewer/lib/diff";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";

export function DiffWorkspace() {
  const [screen, setScreen] = useState<"input" | "diff">("input");
  const [mode, setMode] = useState<"text" | "json">("text");
  const [view, setView] = useState<"split" | "unified">("split");
  const [original, setOriginal] = useState(sampleOriginalText);
  const [modified, setModified] = useState(sampleModifiedText);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [normalizeJson, setNormalizeJson] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<"original" | "modified">("original");
  const [notice, setNoticeWithTimeout] = useNotice(
    "Sample comparison loaded. Click 'Compare Diff' to view changes."
  );

  const uploadOrigRef = useRef<HTMLInputElement>(null);
  const uploadModRef = useRef<HTMLInputElement>(null);

  const diffOptions: DiffOptions = useMemo(
    () => ({
      ignoreWhitespace,
      ignoreCase,
      normalizeJson: mode === "json" && normalizeJson,
    }),
    [ignoreWhitespace, ignoreCase, mode, normalizeJson]
  );

  const comparison = useMemo(() => {
    try {
      return { lines: computeUnifiedDiff(original, modified, diffOptions), error: "" };
    } catch (error) {
      return {
        lines: [],
        error: error instanceof Error ? error.message : "Could not compare these inputs.",
      };
    }
  }, [original, modified, diffOptions]);
  const unifiedDiff = comparison.lines;

  const sideBySideDiff = useMemo(() => alignDiffRows(unifiedDiff), [unifiedDiff]);

  const stats = useMemo(() => calculateDiffStats(unifiedDiff), [unifiedDiff]);

  const handleSwap = () => {
    const temp = original;
    setOriginal(modified);
    setModified(temp);
    setNoticeWithTimeout("Swapped original and modified contents.");
  };

  const handleModeChange = (newMode: string) => {
    const m = newMode as "text" | "json";
    setMode(m);
    if (m === "json") {
      setOriginal(sampleOriginalJson);
      setModified(sampleModifiedJson);
    } else {
      setOriginal(sampleOriginalText);
      setModified(sampleModifiedText);
    }
    setNoticeWithTimeout(`Switched to ${m.toUpperCase()} comparison mode.`);
  };

  const handleCopyDiff = async () => {
    try {
      const textOutput = unifiedDiff
        .map((line) => {
          const prefix =
            line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  ";
          return prefix + line.text;
        })
        .join("\n");
      await navigator.clipboard.writeText(textOutput);
      setCopied(true);
      setNoticeWithTimeout("Unified diff copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy diff.");
    }
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "orig" | "mod"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNoticeWithTimeout("Please choose a file smaller than 2 MB.");
      if (target === "orig" && uploadOrigRef.current) uploadOrigRef.current.value = "";
      if (target === "mod" && uploadModRef.current) uploadModRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      if (target === "orig") setOriginal(text);
      else setModified(text);
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read uploaded file.");
    } finally {
      if (target === "orig" && uploadOrigRef.current) uploadOrigRef.current.value = "";
      if (target === "mod" && uploadModRef.current) uploadModRef.current.value = "";
    }
  };

  const origLineCount = original ? original.split("\n").length : 0;
  const modLineCount = modified ? modified.split("\n").length : 0;

  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <input
        ref={uploadOrigRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => handleUpload(e, "orig")}
      />
      <input
        ref={uploadModRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => handleUpload(e, "mod")}
      />

      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Text & JSON Diff Viewer" icon={<FileDiff size={24} />} />

      {/* Unified Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <CustomSelect
            label="Type"
            value={mode}
            onChange={handleModeChange}
            options={[
              { value: "text", label: "Plain Text" },
              { value: "json", label: "JSON Data" },
            ]}
          />

          {screen === "diff" && (
            <CustomSelect
              label="View"
              value={view}
              onChange={(v) => setView(v as "split" | "unified")}
              options={[
                { value: "split", label: "Side-by-side" },
                { value: "unified", label: "Unified" },
              ]}
            />
          )}

          <ActionButton
            variant="secondary"
            onClick={handleSwap}
            title="Swap Original & Modified inputs"
          >
            <ArrowLeftRight size={14} />
            Swap
          </ActionButton>

          {screen === "input" && (
            <ActionButton
              variant="danger"
              onClick={() => {
                setOriginal("");
                setModified("");
                setNoticeWithTimeout("Cleared both inputs.");
              }}
              title="Clear both inputs"
            >
              <Trash2 size={14} />
              Clear
            </ActionButton>
          )}
        </div>

        {/* Right Action Group - Consistent Positions */}
        <div className="toolbar-group">
          {screen === "input" ? (
            <ActionButton
              variant="primary"
              disabled={Boolean(comparison.error)}
              onClick={() => {
                setScreen("diff");
                setNoticeWithTimeout("Diff generated.");
              }}
              title="Compare inputs and view diff"
            >
              <Play size={14} />
              Compare Diff ({stats.totalChanges} changes)
            </ActionButton>
          ) : (
            <>
              <div className="diff-stats-pills">
                {stats.totalChanges === 0 ? (
                  <span className="diff-pill identical">✓ Identical</span>
                ) : (
                  <>
                    <span className="diff-pill additions">+{stats.additions}</span>
                    <span className="diff-pill deletions">-{stats.deletions}</span>
                  </>
                )}
              </div>
              <ActionButton
                variant="secondary"
                success={copied}
                onClick={handleCopyDiff}
                title="Copy unified diff output"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Diff"}
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => setScreen("input")}
                title="Return to edit inputs"
              >
                <ArrowLeft size={14} />
                Back to Inputs
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {/* Options Bar */}
      <div className="markdown-format-toolbar">
        <div className="diff-toolbar-options">
          <label className="diff-checkbox-label">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            />
            <span>Ignore whitespace</span>
          </label>
          <label className="diff-checkbox-label">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
            />
            <span>Ignore letter case</span>
          </label>
          {mode === "json" && (
            <label className="diff-checkbox-label">
              <input
                type="checkbox"
                checked={normalizeJson}
                onChange={(e) => setNormalizeJson(e.target.checked)}
              />
              <span>Sort JSON keys (Semantic)</span>
            </label>
          )}
        </div>
      </div>

      {/* Mode 1: INPUT MODE */}
      {screen === "input" ? (
        <>
          {/* Mobile Tab Switcher */}
          <div className="mobile-editor-tabs">
            <button
              aria-pressed={mobileTab === "original"}
              onClick={() => setMobileTab("original")}
            >
              Original ({origLineCount} lines)
            </button>
            <button
              aria-pressed={mobileTab === "modified"}
              onClick={() => setMobileTab("modified")}
            >
              Modified ({modLineCount} lines)
            </button>
          </div>

          {/* Dual Input Editor Panes */}
          <div className="editor-layout" style={{ minHeight: "640px", height: "700px" }}>
            {/* Original Input */}
            <section
              className={`editor-pane ${mobileTab === "original" ? "mobile-active" : ""}`}
            >
              <div className="editor-header">
                <span>
                  <span className="pane-dot" />
                  Original (Before) <small>{mode.toUpperCase()}</small>
                </span>
                <div className="editor-actions">
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => uploadOrigRef.current?.click()}
                    title="Upload original file"
                  >
                    <Upload size={14} />
                  </ActionButton>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => setOriginal("")}
                    title="Clear original text"
                  >
                    <Trash2 size={14} />
                  </ActionButton>
                </div>
              </div>
              <div className="editor-body" style={{ height: "100%", flex: 1 }}>
                <textarea
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  placeholder="Paste or type original text / JSON..."
                  spellCheck={false}
                  aria-label="Original text input"
                />
              </div>
              <div className="editor-footer">
                <span>{origLineCount} lines</span>
                <span>Original</span>
              </div>
            </section>

            {/* Modified Input */}
            <section
              className={`editor-pane ${mobileTab === "modified" ? "mobile-active" : ""}`}
            >
              <div className="editor-header">
                <span>
                  <span className="pane-dot green" />
                  Modified (After) <small>{mode.toUpperCase()}</small>
                </span>
                <div className="editor-actions">
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => uploadModRef.current?.click()}
                    title="Upload modified file"
                  >
                    <Upload size={14} />
                  </ActionButton>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => setModified("")}
                    title="Clear modified text"
                  >
                    <Trash2 size={14} />
                  </ActionButton>
                </div>
              </div>
              <div className="editor-body" style={{ height: "100%", flex: 1 }}>
                <textarea
                  value={modified}
                  onChange={(e) => setModified(e.target.value)}
                  placeholder="Paste or type modified text / JSON..."
                  spellCheck={false}
                  aria-label="Modified text input"
                />
              </div>
              <div className="editor-footer">
                <span>{modLineCount} lines</span>
                <span>Modified</span>
              </div>
            </section>
          </div>
        </>
      ) : (
        /* Mode 2: DIFF PREVIEW MODE */
        <section className="diff-container">
          <div className="diff-container-header">
            <div className="diff-header-side">
              <span className="pane-dot green" />
              <span>
                {view === "split"
                  ? "Side-by-Side Comparison (50 / 50)"
                  : "Unified Diff Sequence"}
              </span>
            </div>
            <div className="diff-stats-pills">
              <span>
                {stats.totalChanges === 0
                  ? "Content is 100% identical"
                  : `${stats.totalChanges} line${stats.totalChanges > 1 ? "s" : ""} modified`}
              </span>
            </div>
          </div>

          <div className="diff-table-wrapper">
            {view === "split" ? (
              /* Side By Side Table with Fixed 50/50 Colgroup */
              <table className="diff-table">
                <colgroup>
                  <col style={{ width: "44px" }} />
                  <col style={{ width: "22px" }} />
                  <col style={{ width: "calc(50% - 67px)" }} />
                  <col style={{ width: "1px" }} />
                  <col style={{ width: "44px" }} />
                  <col style={{ width: "22px" }} />
                  <col style={{ width: "calc(50% - 67px)" }} />
                </colgroup>
                <tbody>
                  {sideBySideDiff.map((row, idx) => {
                    const origType = row.original?.type || "empty";
                    const modType = row.modified?.type || "empty";

                    return (
                      <tr
                        key={idx}
                        className={
                          origType === "removed" || modType === "added"
                            ? origType === "removed" && modType === "added"
                              ? "diff-row-modified"
                              : origType === "removed"
                                ? "diff-row-removed"
                                : "diff-row-added"
                            : "diff-row-unchanged"
                        }
                      >
                        {/* Original Side */}
                        <td className="diff-num">{row.original?.lineNumber || ""}</td>
                        <td
                          className={`diff-marker ${
                            origType === "removed" ? "diff-unified-marker-del" : ""
                          }`}
                        >
                          {origType === "removed" ? "-" : ""}
                        </td>
                        <td
                          className={`diff-code ${
                            origType === "empty"
                              ? "diff-cell-empty"
                              : origType === "removed"
                                ? "diff-row-removed"
                                : ""
                          }`}
                        >
                          {row.original?.text || ""}
                        </td>

                        <td className="diff-sep" />

                        {/* Modified Side */}
                        <td className="diff-num">{row.modified?.lineNumber || ""}</td>
                        <td
                          className={`diff-marker ${
                            modType === "added" ? "diff-unified-marker-add" : ""
                          }`}
                        >
                          {modType === "added" ? "+" : ""}
                        </td>
                        <td
                          className={`diff-code ${
                            modType === "empty"
                              ? "diff-cell-empty"
                              : modType === "added"
                                ? "diff-row-added"
                                : ""
                          }`}
                        >
                          {row.modified?.text || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Unified Single Column Table with Colgroup */
              <table className="diff-table">
                <colgroup>
                  <col style={{ width: "44px" }} />
                  <col style={{ width: "44px" }} />
                  <col style={{ width: "24px" }} />
                  <col />
                </colgroup>
                <tbody>
                  {unifiedDiff.map((line, idx) => {
                    const isAdded = line.type === "added";
                    const isRemoved = line.type === "removed";

                    return (
                      <tr
                        key={idx}
                        className={
                          isAdded
                            ? "diff-row-added"
                            : isRemoved
                              ? "diff-row-removed"
                              : "diff-row-unchanged"
                        }
                      >
                        <td className="diff-num">{line.originalLineNumber || ""}</td>
                        <td className="diff-num">{line.modifiedLineNumber || ""}</td>
                        <td
                          className={`diff-marker ${
                            isAdded
                              ? "diff-unified-marker-add"
                              : isRemoved
                                ? "diff-unified-marker-del"
                                : ""
                          }`}
                        >
                          {isAdded ? "+" : isRemoved ? "-" : " "}
                        </td>
                        <td className="diff-code">{line.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="editor-footer" style={{ justifyContent: "space-between" }}>
            <span>
              Additions: +{stats.additions} <i></i> Deletions: -{stats.deletions}
            </span>
          </div>
        </section>
      )}

      {/* Feedback banner */}
      {comparison.error && (
        <div className="feedback error" role="alert">
          {comparison.error}
        </div>
      )}
      {notice && (
        <div className="feedback success" role="status">
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Documentation Section */}
      <section className="workspace-docs">
        <div>
          <h2>Compare Text and JSON with Confidence</h2>
          <p>
            Whether debugging API payload changes, reviewing config files, or inspecting
            prose modifications, the Diff Viewer gives you precision at line level.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Semantic JSON Sorting</strong>
              When enabled, JSON keys are sorted alphabetically before comparison. This
              prevents false positives caused solely by reordered keys in your objects.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Client-Side Privacy</strong>
              Your sensitive tokens, secret configs, and proprietary code never touch our
              servers. All diff calculations run locally in your browser.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
