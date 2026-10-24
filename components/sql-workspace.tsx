"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
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
} from "@/lib/sql";
import { CustomSelect, SelectOption } from "@/components/custom-select";
import { ToolHeader } from "@/components/tool-header";

const dialectOptions: SelectOption[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "standard", label: "Standard SQL" },
];

const caseOptions: SelectOption[] = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "preserve", label: "Preserve" },
];

const indentOptions: SelectOption[] = [
  { value: "2", label: "2 Spaces" },
  { value: "4", label: "4 Spaces" },
  { value: "tab", label: "Tabs" },
];

function highlightSql(sql: string) {
  const tokenRegex =
    /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b(?:WITH|SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END|AS|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|DELETE|CREATE\s+TABLE|CREATE\s+VIEW|CREATE\s+INDEX|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+VIEW|DROP\s+INDEX|TRUNCATE\s+TABLE|UNION\s+ALL|UNION|EXCEPT|INTERSECT|RETURNING|DISTINCT|ASC|DESC|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CASCADE|DEFAULT|CHECK|UNIQUE|CONSTRAINT|OVER|PARTITION\s+BY|WINDOW|FETCH\s+FIRST|FETCH\s+NEXT)\b|\b(?:COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|CONCAT|NOW|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD)\b(?=\s*\())/gi;

  const parts = sql.split(tokenRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("--") || part.startsWith("/*")) {
      return (
        <span key={i} className="syntax-comment">
          {part}
        </span>
      );
    }
    if (part.startsWith("'")) {
      return (
        <span key={i} className="syntax-string">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={i} className="syntax-number">
          {part}
        </span>
      );
    }
    if (
      /^(COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|CONCAT|NOW|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD)$/i.test(
        part
      )
    ) {
      return (
        <span key={i} className="syntax-fn">
          {part}
        </span>
      );
    }
    if (
      /^(WITH|SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END|AS|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|DELETE|CREATE\s+TABLE|CREATE\s+VIEW|CREATE\s+INDEX|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+VIEW|DROP\s+INDEX|TRUNCATE\s+TABLE|UNION\s+ALL|UNION|EXCEPT|INTERSECT|RETURNING|DISTINCT|ASC|DESC|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CASCADE|DEFAULT|CHECK|UNIQUE|CONSTRAINT|OVER|PARTITION\s+BY|WINDOW|FETCH\s+FIRST|FETCH\s+NEXT)$/i.test(
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

export function SqlWorkspace() {
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
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setNoticeWithTimeout("SQL formatted successfully.");
              setActiveTab("output");
            }}
            title="Format SQL query"
          >
            <Play size={14} />
            <span>Format SQL</span>
            <kbd>⌘ ↵</kbd>
          </button>

          <button
            type="button"
            className="button"
            onClick={handleMinify}
            title="Minify SQL query"
          >
            <Minimize2 size={14} />
            <span>Minify</span>
          </button>
        </div>

        <div className="toolbar-group" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <CustomSelect
            label="Dialect"
            value={dialect}
            onChange={(val) => setDialect(val as SqlDialect)}
            options={dialectOptions}
            ariaLabel="SQL Dialect"
          />

          <CustomSelect
            label="Casing"
            value={keywordCase}
            onChange={(val) => setKeywordCase(val as KeywordCase)}
            options={caseOptions}
            ariaLabel="Keyword Casing"
          />

          <CustomSelect
            label="Indent"
            value={indent}
            onChange={(val) => setIndent(val)}
            options={indentOptions}
            ariaLabel="Indentation Size"
          />
        </div>
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
        <section className={`editor-pane ${activeTab === "input" ? "mobile-active" : ""}`}>
          <div className="editor-header">
            <span>
              <span className="pane-dot" />
              Raw SQL Input
            </span>
            <div>
              <button
                type="button"
                className="icon-button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload SQL file"
                aria-label="Upload SQL file"
              >
                <Upload size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={handleClear}
                title="Clear input"
                aria-label="Clear input"
              >
                <Trash2 size={16} />
              </button>
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
              {result.code && <small className="valid-tag">{dialect.toUpperCase()}</small>}
            </span>
            <div>
              <button
                type="button"
                className={`icon-button ${wrap ? "toggled" : ""}`}
                onClick={() => setWrap(!wrap)}
                title="Toggle line wrapping"
                aria-label="Toggle line wrapping"
                aria-pressed={wrap}
              >
                <WrapText size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={handleDownload}
                disabled={!result.code}
                title="Download formatted .sql file"
                aria-label="Download SQL file"
              >
                <ArrowDownToLine size={16} />
              </button>
              <button
                type="button"
                className="small-button copy-button"
                onClick={handleCopy}
                disabled={!result.code}
                title="Copy formatted SQL"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
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
                  {highlightSql(result.code)}
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
            Clean, standardize, and format complex database queries locally in your browser.
            Handles subqueries, window functions, CTEs, and multi-statement transaction
            scripts with precision.
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
