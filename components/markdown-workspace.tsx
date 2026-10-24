"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Download,
  FileCode,
  FileDown,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  ShieldCheck,
  Strikethrough,
  Table,
  Upload,
  WrapText,
} from "lucide-react";
import {
  calculateMarkdownStats,
  renderMarkdownToHtml,
  sampleMarkdown,
} from "@/lib/markdown";
import { ToolHeader } from "@/components/tool-header";
import { ClearButton } from "@/components/clear-button";

export function MarkdownWorkspace() {
  const [input, setInput] = useState(sampleMarkdown);
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [wrap, setWrap] = useState(true);
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [notice, setNotice] = useState(
    "Sample markdown loaded. Start typing to preview."
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!copyMenuOpen && !downloadMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (copyMenuOpen && !copyMenuRef.current?.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
      if (downloadMenuOpen && !downloadMenuRef.current?.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCopyMenuOpen(false);
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [copyMenuOpen, downloadMenuOpen]);

  // Memoize rendered HTML and text stats
  const html = useMemo(() => renderMarkdownToHtml(input), [input]);
  const stats = useMemo(() => calculateMarkdownStats(input), [input]);

  const setNoticeWithTimeout = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice("");
    }, 3500);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const insertSnippet = (
    prefix: string,
    suffix: string = "",
    placeholder: string = ""
  ) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = input.substring(start, end);
    const content = selected || placeholder;
    const replacement = prefix + content + suffix;

    const updated = input.substring(0, start) + replacement + input.substring(end);
    setInput(updated);

    // Restore focus and selection
    setTimeout(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + content.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    }, 10);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(input);
      setCopiedMd(true);
      setNoticeWithTimeout("Markdown source copied to clipboard.");
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy markdown.");
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopiedHtml(true);
      setNoticeWithTimeout("Rendered HTML copied to clipboard.");
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      setNoticeWithTimeout("Failed to copy HTML.");
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([input], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    a.click();
    URL.revokeObjectURL(url);
    setNoticeWithTimeout("Downloaded document.md");
  };

  const handleDownloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rendered Document · Al1 Tools</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #232527; background: #fff; }
    h1, h2, h3 { border-bottom: 1px solid #e5e8e9; padding-bottom: 6px; }
    pre { background: #f7f8fa; padding: 16px; border-radius: 8px; border: 1px solid #e5e8e9; overflow-x: auto; }
    code { font-family: ui-monospace, monospace; font-size: 13px; }
    blockquote { border-left: 3px solid #0e363c; margin: 16px 0; padding: 8px 16px; background: #eef3f2; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e5e8e9; padding: 8px 12px; text-align: left; }
    th { background: #eef3f2; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.html";
    a.click();
    URL.revokeObjectURL(url);
    setNoticeWithTimeout("Downloaded document.html");
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setNoticeWithTimeout("Please choose a file smaller than 2 MB.");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      setInput(text);
      setNoticeWithTimeout(`Loaded "${file.name}" (${file.size} bytes).`);
    } catch {
      setNoticeWithTimeout("Failed to read file.");
    } finally {
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setInput("");
    setNoticeWithTimeout("Editor cleared.");
    textareaRef.current?.focus();
  };

  const lineCount = input.split("\n").length;

  return (
    <div className="workspace-page page-width">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        style={{ display: "none" }}
        onChange={handleUploadFile}
      />

      {/* Reusable Tool Header (Breadcrumb & Heading) */}
      <ToolHeader title="Markdown Editor & Preview" icon={<FileCode size={24} />} />

      {/* Top Action Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          {/* Copy Dropdown */}
          <div className="action-dropdown-wrapper" ref={copyMenuRef}>
            <button
              className="button primary"
              onClick={() => {
                setCopyMenuOpen(!copyMenuOpen);
                setDownloadMenuOpen(false);
              }}
              title="Copy Markdown or HTML"
              aria-expanded={copyMenuOpen}
            >
              {copiedMd || copiedHtml ? <Check size={14} /> : <Copy size={14} />}
              {copiedMd ? "MD Copied!" : copiedHtml ? "HTML Copied!" : "Copy"}
              <ChevronDown size={13} style={{ opacity: 0.7 }} />
            </button>
            {copyMenuOpen && (
              <div className="action-dropdown-menu" role="menu">
                <button
                  className="action-dropdown-item"
                  onClick={() => {
                    handleCopyMarkdown();
                    setCopyMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <FileText size={14} />
                  <span>Copy Markdown (.md)</span>
                </button>
                <button
                  className="action-dropdown-item"
                  onClick={() => {
                    handleCopyHtml();
                    setCopyMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Code size={14} />
                  <span>Copy HTML</span>
                </button>
              </div>
            )}
          </div>

          {/* Download Dropdown */}
          <div className="action-dropdown-wrapper" ref={downloadMenuRef}>
            <button
              className="button"
              onClick={() => {
                setDownloadMenuOpen(!downloadMenuOpen);
                setCopyMenuOpen(false);
              }}
              title="Download Markdown or HTML"
              aria-expanded={downloadMenuOpen}
            >
              <Download size={14} />
              Download
              <ChevronDown size={13} style={{ opacity: 0.7 }} />
            </button>
            {downloadMenuOpen && (
              <div className="action-dropdown-menu" role="menu">
                <button
                  className="action-dropdown-item"
                  onClick={() => {
                    handleDownloadMd();
                    setDownloadMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <FileText size={14} />
                  <span>Download Markdown (.md)</span>
                </button>
                <button
                  className="action-dropdown-item"
                  onClick={() => {
                    handleDownloadHtml();
                    setDownloadMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <FileDown size={14} />
                  <span>Download HTML (.html)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View mode toggle (desktop) */}
        <div className="markdown-stats-bar">
          <span className="stat-item">
            <strong>{stats.words.toLocaleString()}</strong> words
          </span>
          <span className="stat-item">
            <strong>{stats.characters.toLocaleString()}</strong> chars
          </span>
          <span className="stat-item">
            <Clock size={13} />
            <strong>~{stats.readingTimeMinutes}</strong> min read
          </span>
        </div>
      </div>

      {/* Markdown Quick Formatting Toolbar */}
      <div className="markdown-format-toolbar">
        <div className="format-group">
          <button
            className="format-btn"
            onClick={() => insertSnippet("**", "**", "bold text")}
            title="Bold (**text**)"
          >
            <Bold size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("*", "*", "italic text")}
            title="Italic (*text*)"
          >
            <Italic size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("~~", "~~", "strikethrough text")}
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={15} />
          </button>
        </div>

        <div className="format-divider" />

        <div className="format-group">
          <button
            className="format-btn"
            onClick={() => insertSnippet("# ", "", "Heading 1")}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("## ", "", "Heading 2")}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("### ", "", "Heading 3")}
            title="Heading 3"
          >
            <Heading3 size={15} />
          </button>
        </div>

        <div className="format-divider" />

        <div className="format-group">
          <button
            className="format-btn"
            onClick={() => insertSnippet("> ", "", "Quote text")}
            title="Blockquote (> quote)"
          >
            <Quote size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("`", "`", "code")}
            title="Inline Code (`code`)"
          >
            <Code size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() =>
              insertSnippet("\n```typescript\n", "\n```\n", "// write code here")
            }
            title="Code Block (```lang)"
          >
            <FileCode size={15} />
          </button>
        </div>

        <div className="format-divider" />

        <div className="format-group">
          <button
            className="format-btn"
            onClick={() => insertSnippet("- ", "", "List item")}
            title="Bullet List (- item)"
          >
            <List size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("1. ", "", "List item")}
            title="Numbered List (1. item)"
          >
            <ListOrdered size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("- [ ] ", "", "Todo item")}
            title="Task List (- [ ] todo)"
          >
            <CheckSquare size={15} />
          </button>
        </div>

        <div className="format-divider" />

        <div className="format-group">
          <button
            className="format-btn"
            onClick={() => insertSnippet("[", "](https://example.com)", "link title")}
            title="Insert Link ([text](url))"
          >
            <Link2 size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() =>
              insertSnippet(
                "![",
                "](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600)",
                "Image alt"
              )
            }
            title="Insert Image (![alt](url))"
          >
            <ImageIcon size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() =>
              insertSnippet(
                "\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n"
              )
            }
            title="Insert Table"
          >
            <Table size={15} />
          </button>
          <button
            className="format-btn"
            onClick={() => insertSnippet("\n---\n")}
            title="Horizontal Rule (---)"
          >
            <Minus size={15} />
          </button>
        </div>

        <div className="format-divider" />

        <div className="format-group" style={{ marginLeft: "auto" }}>
          <button
            className="format-btn"
            onClick={() => uploadInputRef.current?.click()}
            title="Upload .md file"
          >
            <Upload size={14} />
          </button>
          <ClearButton size="sm" onClick={handleClear} title="Clear editor" />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-editor-tabs">
        <button aria-pressed={tab === "editor"} onClick={() => setTab("editor")}>
          Editor
        </button>
        <button aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>
          Preview
        </button>
      </div>

      {/* Split View Editor & Preview */}
      <div className={`editor-layout markdown-editor-layout view-${viewMode}`}>
        {/* Left Pane: Markdown Source Editor */}
        <section
          className={`editor-pane markdown-source-pane ${tab === "editor" ? "mobile-active" : ""}`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot green" />
              Markdown Source <small>.md</small>
            </span>
            <div className="editor-actions">
              <button
                className={`icon-btn ${wrap ? "active" : ""}`}
                onClick={() => setWrap(!wrap)}
                title={wrap ? "Disable text wrap" : "Enable text wrap"}
                aria-label="Toggle text wrap"
              >
                <WrapText size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={handleCopyMarkdown}
                title="Copy Markdown"
                aria-label="Copy Markdown"
              >
                {copiedMd ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className={`icon-btn ${viewMode === "editor" ? "active" : ""}`}
                onClick={() => setViewMode(viewMode === "editor" ? "split" : "editor")}
                title={
                  viewMode === "editor"
                    ? "Exit full editor (Split view)"
                    : "Full editor mode"
                }
                aria-label="Toggle full editor mode"
              >
                {viewMode === "editor" ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
              </button>
            </div>
          </div>

          <div className="editor-body">
            <div className="line-numbers" ref={lineNumbersRef} aria-hidden="true">
              {Array.from({ length: lineCount }).map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onScroll={handleScroll}
              placeholder="Type or paste markdown content here..."
              spellCheck={false}
              style={{ whiteSpace: wrap ? "pre-wrap" : "pre" }}
              aria-label="Markdown input code"
            />
          </div>

          <div className="editor-footer">
            <span>
              {stats.lines} lines <i></i> {stats.words} words <i></i> {stats.characters}{" "}
              chars
            </span>
            <span>GFM Syntax</span>
          </div>
        </section>

        {/* Right Pane: Live HTML Rendered Preview */}
        <section
          className={`editor-pane markdown-preview-pane ${
            tab === "preview" ? "mobile-active" : ""
          }`}
        >
          <div className="editor-header">
            <span>
              <span className="pane-dot green" />
              Live HTML Preview <span className="valid-tag">Rendered</span>
            </span>
            <div className="editor-actions">
              <button
                className="icon-btn"
                onClick={handleCopyHtml}
                title="Copy rendered HTML"
                aria-label="Copy rendered HTML"
              >
                {copiedHtml ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className={`icon-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => setViewMode(viewMode === "preview" ? "split" : "preview")}
                title={
                  viewMode === "preview"
                    ? "Exit full preview (Split view)"
                    : "Full preview mode"
                }
                aria-label="Toggle full preview mode"
              >
                {viewMode === "preview" ? (
                  <Minimize2 size={14} />
                ) : (
                  <Maximize2 size={14} />
                )}
              </button>
            </div>
          </div>

          <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="editor-footer">
            <span>Estimated reading time: ~{stats.readingTimeMinutes} min</span>
            <span>HTML5 Compatible</span>
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

      {/* Documentation & Cheatsheet Section */}
      <section className="workspace-docs">
        <div>
          <h2>Master Markdown in Minutes</h2>
          <p>
            Markdown is a lightweight markup language that lets you format plain text into
            structured HTML documents. Everything is processed entirely inside your
            browser with zero latency.
          </p>

          <table className="cheatsheet-table">
            <thead>
              <tr>
                <th>Element</th>
                <th>Syntax</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Heading</td>
                <td>
                  <code># Heading 1</code>
                </td>
                <td>Large document title</td>
              </tr>
              <tr>
                <td>Bold & Italic</td>
                <td>
                  <code>**bold** & *italic*</code>
                </td>
                <td>
                  <strong>bold</strong> & <em>italic</em>
                </td>
              </tr>
              <tr>
                <td>Checklist</td>
                <td>
                  <code>- [x] done - [ ] todo</code>
                </td>
                <td>Interactive task boxes</td>
              </tr>
              <tr>
                <td>Code Block</td>
                <td>
                  <code>```ts ... ```</code>
                </td>
                <td>Syntax highlighted block</td>
              </tr>
              <tr>
                <td>Callout Alert</td>
                <td>
                  <code>&gt; [!TIP] ...</code>
                </td>
                <td>Colored highlight box</td>
              </tr>
              <tr>
                <td>Table</td>
                <td>
                  <code>| Col 1 | Col 2 |</code>
                </td>
                <td>Structured data grid</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="docs-details">
          <p>
            <BookOpen size={18} />
            <span>
              <strong>GitHub Flavored Markdown (GFM)</strong>
              Supports tables with column alignment (<code>:---</code>, <code>:---:</code>
              , <code>---:</code>), task lists, strikethrough (<code>~~text~~</code>), and
              auto-slug heading IDs.
            </span>
          </p>
          <p>
            <ShieldCheck size={18} />
            <span>
              <strong>100% Private & Client-Side</strong>
              Your articles, notes, and documentation never leave your browser. Perfect
              for private internal documentation, credentials notes, and offline drafting.
            </span>
          </p>
          <p>
            <FileDown size={18} />
            <span>
              <strong>One-Click Exporting</strong>
              Download clean <code>.md</code> files for your repositories or fully
              self-contained <code>.html</code> files ready for publishing or emailing.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
