"use client";

import { SqlOptions } from "./sql-options";
import { SqlHighlight } from "./sql-highlight";
import { ActionButton } from "@/components/ui/action-button";
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Check,
  Code2,
  Copy,
  Database,
  FileCode2,
  Info,
  Minimize2,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WrapText,
} from "lucide-react";
import {
  formatSql,
  minifySql,
  sampleSqlQueries,
  SqlDialect,
  KeywordCase,
  IndentSize,
} from "@/features/sql-formatter/lib/sql";

import { ToolHeader } from "@/components/cummon/tool-header";

export function SqlWorkspace() {
  const modifier = useShortcutModifier();
  const [sqlInput, setSqlInput] = useState(sampleSqlQueries.analytics);
  const [dialect, setDialect] = useState<SqlDialect>("postgresql");
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper");
  const [indent, setIndent] = useState<string>("2");
  const [notice, setNotice] = useState("Sample SQL loaded and ready to format.");
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

  const setNoticeWithTimeout = (msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setNotice("");
    }, 3500);
  };

  const parsedIndent: IndentSize =
    indent === "tab" ? "tab" : Number(indent) === 4 ? 4 : 2;

  // Real-time formatting
  const result = useMemo(() => {
    return formatSql(sqlInput, {
      dialect,
      keywordCase,
      indent: parsedIndent,
    });
  }, [sqlInput, dialect, keywordCase, parsedIndent]);

  // Synchronize scroll on input textarea
  const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (inputLineNumbersRef.current) {
      inputLineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Synchronize scroll on output pre
  const handleOutputScroll = (e: React.UIEvent<HTMLPreElement>) => {
    if (outputLineNumbersRef.current) {
      outputLineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Keyboard shortcut ⌘Enter / CtrlEnter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setNoticeWithTimeout("SQL formatted successfully.");
        setActiveTab("output");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMinify = () => {
    const min = minifySql(sqlInput);
    if (min.success) {
      setSqlInput(min.code);
      setNoticeWithTimeout("SQL query minified to single line.");
    }
  };

  const handleCopy = async () => {
    const textToCopy = result.code || sqlInput;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setNoticeWithTimeout("Formatted SQL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy to clipboard.");
    }
  };

  const handleClear = () => {
    setSqlInput("");
    setNoticeWithTimeout("Editor cleared.");
    if (inputTextareaRef.current) {
      inputTextareaRef.current.focus();
    }
  };

  const handleDownload = () => {
    const content = result.code || sqlInput;
    if (!content) return;
    const blob = new Blob([content], { type: "application/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-${Date.now()}.sql`;
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
      setSqlInput(text);
      setNoticeWithTimeout(`Loaded "${file.name}".`);
    } catch {
      setNoticeWithTimeout("Could not read uploaded SQL file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inputLineCount = sqlInput ? sqlInput.split("\n").length : 0;
  const outputLineCount = result.code ? result.code.split("\n").length : 0;

  return (
    <div className="workspace-page page-width">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql,.txt"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Tool Header */}
      <ToolHeader title="SQL Formatter" icon={<Database size={24} />} />

      {/* Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <ActionButton
            type="button"
            variant="primary"
            onClick={() => {
              setNoticeWithTimeout("SQL formatted successfully.");
              setActiveTab("output");
            }}
            title="Format SQL query"
          >
            <Play size={14} />
            <span>Format SQL</span>
            <kbd>{modifier} ↵</kbd>
          </ActionButton>

          <ActionButton
            type="button"
            variant="secondary"
            onClick={handleMinify}
            title="Minify SQL query"
          >
            <Minimize2 size={14} />
            <span>Minify</span>
          </ActionButton>
        </div>

        <SqlOptions
          dialect={dialect}
          keywordCase={keywordCase}
          indent={indent}
          setDialect={setDialect}
          setKeywordCase={setKeywordCase}
          setIndent={setIndent}
        />
      </div>

      {/* Quick Sample Queries Bar */}
      <div className="sample-bar">
        <span className="sample-bar-label">
          <FileCode2 size={13} />
          Presets:
        </span>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setSqlInput(sampleSqlQueries.analytics);
            setNoticeWithTimeout("Loaded CTE & Window Function query.");
          }}
        >
          CTE & Analytics
        </button>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setSqlInput(sampleSqlQueries.schema);
            setNoticeWithTimeout("Loaded Schema DDL query.");
          }}
        >
          Schema DDL
        </button>
        <button
          type="button"
          className="sample-pill"
          onClick={() => {
            setSqlInput(sampleSqlQueries.crud);
            setNoticeWithTimeout("Loaded CRUD Operations query.");
          }}
        >
          CRUD Statements
        </button>
      </div>

      {/* Mobile Workspace Tabs (Desktop hides via CSS) */}
      <div className="mobile-editor-tabs">
        <button
          type="button"
          aria-pressed={activeTab === "input"}
          onClick={() => setActiveTab("input")}
        >
          Raw SQL Input ({inputLineCount} lines)
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "output"}
          onClick={() => setActiveTab("output")}
        >
          Formatted SQL ({outputLineCount} lines)
        </button>
      </div>

      {/* Dual Editor Panes */}
      <div className="editor-layout" style={{ minHeight: "560px", height: "640px" }}>
        {/* Left Pane: SQL Input */}
        <section
          className={`editor-pane ${activeTab === "input" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot" />
              Raw SQL Input
            </span>
            <div>
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => fileInputRef.current?.click()}
                title="Upload SQL file"
                aria-label="Upload SQL file"
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
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="Paste raw SQL query here (e.g. SELECT * FROM users)..."
              spellCheck={false}
              autoComplete="off"
              aria-label="SQL input"
            />
          </div>

          <div className="editor-footer">
            <span>
              {sqlInput.length} chars <i /> {inputLineCount} lines
            </span>
            <span>UTF-8 · SQL</span>
          </div>
        </section>

        {/* Right Pane: Formatted SQL Output */}
        <section
          className={`editor-pane output-pane ${activeTab === "output" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className={`pane-dot ${result.code ? "green" : ""}`} />
              Formatted SQL{" "}
              {result.code && (
                <small className="valid-tag">{dialect.toUpperCase()}</small>
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
                title="Download formatted .sql file"
                aria-label="Download SQL file"
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
                title="Copy formatted SQL"
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
                  aria-label="Formatted SQL output"
                >
                  <SqlHighlight sql={result.code} />
                </pre>
              </>
            ) : (
              <div className="output-empty">
                <Database size={32} />
                <h3>Structured & Readable SQL</h3>
                <p>Enter or paste your SQL query on the left to format it instantly.</p>
              </div>
            )}
          </div>

          <div className="editor-footer">
            <span>
              {result.code.length} chars <i /> {outputLineCount} lines <i />{" "}
              {result.queryCount} {result.queryCount === 1 ? "query" : "queries"}
            </span>
            <span suppressHydrationWarning>
              {mounted ? `${result.executionTimeMs}ms` : "< 1ms"} <i /> 100% Client-Side
            </span>
          </div>
        </section>
      </div>

      {/* Notice Feedback Banner */}
      {notice && (
        <div className="feedback success">
          <Info size={15} />
          <span>{notice}</span>
        </div>
      )}

      {/* Error Alert */}
      {!result.success && result.error && (
        <div className="feedback-card error" role="alert">
          <div className="error-banner-main">
            <span className="error-icon-chip">
              <AlertCircle size={16} />
            </span>
            <div className="error-banner-text">
              <div className="error-banner-header">
                <strong>SQL Syntax Notice</strong>
              </div>
              <p className="error-tip-text">{result.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Structured Documentation Section */}
      <section className="workspace-docs">
        <div>
          <h2>Production-Grade SQL Beautifier</h2>
          <p>
            Clean, standardize, and format complex database queries locally in your
            browser. Handles subqueries, window functions, CTEs, and multi-statement
            transaction scripts with precision.
          </p>
        </div>

        <div className="docs-details">
          <p>
            <Sparkles size={18} />
            <span>
              <strong>Dialect-Aware Architecture</strong>
              Formats queries tuned for PostgreSQL, MySQL, SQLite, and Standard ANSI SQL
              with consistent keyword casing, alignment, and subquery indentation.
            </span>
          </p>
          <p>
            <Code2 size={18} />
            <span>
              <strong>Nested Logic & CTEs</strong>
              Subqueries, common table expressions (`WITH`), CASE statements, and JOIN
              hierarchies are cleanly tiered for optimal readability in pull requests and
              reviews.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Client-Side Air-Gapped Privacy</strong>
              Your database schemas, query strings, and sensitive table identifiers never
              touch a network server. Everything runs in your browser.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
