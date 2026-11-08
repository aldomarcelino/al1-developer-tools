"use client";

import { useState, useTransition } from "react";
import {
  FileDown,
  Upload,
  Copy,
  Check,
  Download,
  X,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Columns,
  Code2,
  Eye,
  RotateCcw,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { downloadBlob } from "@/lib/browser/download";
import { renderMarkdownToHtml } from "@/features/markdown-editor/lib/markdown";
import {
  type PdfToMarkdownOptions,
  type PdfMarkdownResult,
  type ConversionProgress,
  PDF_MD_LIMITS,
  validatePdfFile,
  formatFileSize,
  sanitizeMarkdownFilename,
  getPdfJs,
  extractMarkdownFromPdf,
} from "../lib/pdf-to-markdown";
import styles from "../pdf-to-markdown.module.css";

export function PdfToMarkdownWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [options, setOptions] = useState<PdfToMarkdownOptions>(PDF_MD_LIMITS.defaultOptions);
  const [result, setResult] = useState<PdfMarkdownResult | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState<string>("");
  const [viewMode, setViewMode] = useState<"split" | "markdown" | "preview">("split");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ConversionProgress>({
    status: "idle",
    message: "",
    percent: 0,
    current: 0,
    total: 0,
  });

  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  function handleReset() {
    setFile(null);
    setArrayBuffer(null);
    setResult(null);
    setEditableMarkdown("");
    setError("");
    setProgress({
      status: "idle",
      message: "",
      percent: 0,
      current: 0,
      total: 0,
    });
    setIsProcessing(false);
  }

  async function convertDocument(buffer: ArrayBuffer, opts: PdfToMarkdownOptions) {
    setIsProcessing(true);
    setError("");
    setProgress({
      status: "parsing",
      message: "Loading PDF document...",
      percent: 10,
      current: 0,
      total: 0,
    });

    try {
      const pdfjs = await getPdfJs();
      const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise;

      const conversionResult = await extractMarkdownFromPdf(pdfDoc, opts, (p) => {
        setProgress(p);
      });

      setResult(conversionResult);
      setEditableMarkdown(conversionResult.markdown);

      const successNotice = `Successfully converted ${conversionResult.totalPages} page(s) to Markdown (${conversionResult.totalWords.toLocaleString()} words).`;
      showSnackbar(successNotice, "success");
    } catch (cause) {
      const errorMsg = cause instanceof Error ? cause.message : "Failed to convert PDF document.";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
      setProgress({
        status: "error",
        message: errorMsg,
        percent: 0,
        current: 0,
        total: 0,
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    const selectedFile = files[0];
    const validation = validatePdfFile(selectedFile);
    if (!validation.valid) {
      const errorMsg = validation.error ?? "Invalid PDF file.";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
      return;
    }

    setError("");
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setArrayBuffer(buffer);
      await convertDocument(buffer, options);
    } catch {
      const readError = "Failed to read the selected file.";
      setError(readError);
      showSnackbar(readError, "error");
    }
  }

  function handleToggleOption(key: keyof PdfToMarkdownOptions) {
    const updated = {
      ...options,
      [key]: !options[key],
    };
    setOptions(updated);
    if (arrayBuffer && !isProcessing) {
      convertDocument(arrayBuffer, updated);
    }
  }

  async function handleCopy() {
    if (!editableMarkdown) return;
    try {
      await navigator.clipboard.writeText(editableMarkdown);
      setCopied(true);
      showSnackbar("Markdown copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showSnackbar("Failed to copy to clipboard.", "error");
    }
  }

  function handleDownloadMd() {
    if (!editableMarkdown || !file) return;
    const blob = new Blob([editableMarkdown], { type: "text/markdown;charset=utf-8" });
    const filename = sanitizeMarkdownFilename(file.name);
    downloadBlob(blob, filename);
    showSnackbar(`Downloaded ${filename}`, "success");
  }

  function handleDownloadTxt() {
    if (!editableMarkdown || !file) return;
    const blob = new Blob([editableMarkdown], { type: "text/plain;charset=utf-8" });
    const baseName = file.name.replace(/\.pdf$/i, "");
    const filename = `${baseName}.txt`;
    downloadBlob(blob, filename);
    showSnackbar(`Downloaded ${filename}`, "success");
  }

  const renderedPreviewHtml = renderMarkdownToHtml(editableMarkdown);

  return (
    <div className={`workspace-page page-width ${styles.workspace}`}>
      <ToolHeader
        title="PDF to Markdown"
        icon={<FileDown size={24} />}
      />

      {!file && (
        <DropArea
          variant="stacked"
          label="Upload PDF document"
          title="Convert PDF to Markdown (.md)"
          description="Drop your PDF here. Extracts text, headings, and formatting directly into clean Markdown in your browser."
          hint="Supports text-based PDF files up to 50 MB. 100% private in-browser processing without server uploads."
          accept="application/pdf,.pdf"
          multiple={false}
          buttonLabel="Select PDF File"
          buttonIcon={<Upload size={15} />}
          loading={isProcessing}
          disabled={isProcessing}
          onFiles={handleFiles}
        />
      )}

      {file && (
        <>
          <div className={styles.fileSummary}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <FileText size={22} />
              </div>
              <div className={styles.fileDetails}>
                <div className={styles.fileName} title={file.name}>
                  {file.name}
                </div>
                <div className={styles.fileMeta}>
                  <span>{formatFileSize(file.size)}</span>
                  {result && (
                    <>
                      <span>•</span>
                      <span>{result.totalPages} page(s)</span>
                      <span>•</span>
                      <span>{result.totalWords.toLocaleString()} words</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.fileActions}>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing}
              >
                <RotateCcw size={14} />
                <span>Change PDF</span>
              </ActionButton>
            </div>
          </div>

          <div className={styles.optionsCard}>
            <div className={styles.optionsHeader}>
              <h3 className={styles.optionsTitle}>Formatting Options</h3>
              {isProcessing && (
                <span className={styles.fileMeta}>
                  <Sparkles size={14} /> Updating...
                </span>
              )}
            </div>
            <div className={styles.optionsGrid}>
              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.headingDetection}
                  onChange={() => handleToggleOption("headingDetection")}
                  disabled={isProcessing}
                />
                <span>Detect Headings (#, ##, ###)</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.includePageDividers}
                  onChange={() => handleToggleOption("includePageDividers")}
                  disabled={isProcessing}
                />
                <span>Page Dividers (---)</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.detectLists}
                  onChange={() => handleToggleOption("detectLists")}
                  disabled={isProcessing}
                />
                <span>Detect Bullet & Numbered Lists</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.detectLinks}
                  onChange={() => handleToggleOption("detectLinks")}
                  disabled={isProcessing}
                />
                <span>Extract Hyperlinks</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.detectCodeBlocks}
                  onChange={() => handleToggleOption("detectCodeBlocks")}
                  disabled={isProcessing}
                />
                <span>Detect Code & Monospace</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.includePageHeaders}
                  onChange={() => handleToggleOption("includePageHeaders")}
                  disabled={isProcessing}
                />
                <span>Page Comments (&lt;!-- Page N --&gt;)</span>
              </label>

              <label className={styles.optionToggle}>
                <input
                  type="checkbox"
                  checked={options.preserveLineBreaks}
                  onChange={() => handleToggleOption("preserveLineBreaks")}
                  disabled={isProcessing}
                />
                <span>Preserve Exact Line Breaks</span>
              </label>
            </div>
          </div>

          {isProcessing && (
            <div className={styles.progressCard}>
              <div className={styles.progressInfo}>
                <span>{progress.message || "Processing..."}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {result?.hasScannedPages && (
            <div className={styles.alertWarning}>
              <AlertTriangle size={18} />
              <div>
                <strong>Notice: Scanned pages detected.</strong> Some pages in this document do
                not contain selectable text. Image-based or photocopy scans require OCR to
                extract text into Markdown.
              </div>
            </div>
          )}

          {result && (
            <>
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <FileText size={14} />
                  <span>Pages:</span>
                  <strong>{result.totalPages}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>Words:</span>
                  <strong>{result.totalWords.toLocaleString()}</strong>
                </div>
                <div className={styles.statItem}>
                  <span>Characters:</span>
                  <strong>{result.totalCharacters.toLocaleString()}</strong>
                </div>
                <div className={styles.statItem}>
                  <Clock size={14} />
                  <span>Reading time:</span>
                  <strong>~{result.readingTimeMinutes} min</strong>
                </div>
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultToolbar}>
                  <div className={styles.viewModeButtons}>
                    <button
                      type="button"
                      className={`${styles.modeButton} ${
                        viewMode === "split" ? styles.modeButtonActive : ""
                      }`}
                      onClick={() => setViewMode("split")}
                      title="Side-by-side Editor & Preview"
                    >
                      <Columns size={14} />
                      <span>Split</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeButton} ${
                        viewMode === "markdown" ? styles.modeButtonActive : ""
                      }`}
                      onClick={() => setViewMode("markdown")}
                      title="Raw Markdown Editor"
                    >
                      <Code2 size={14} />
                      <span>Markdown</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeButton} ${
                        viewMode === "preview" ? styles.modeButtonActive : ""
                      }`}
                      onClick={() => setViewMode("preview")}
                      title="Rendered Document Preview"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </button>
                  </div>

                  <div className={styles.actionButtons}>
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      onClick={handleCopy}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "Copied!" : "Copy Markdown"}</span>
                    </ActionButton>

                    <ActionButton
                      variant="primary"
                      size="sm"
                      onClick={handleDownloadMd}
                    >
                      <Download size={14} />
                      <span>Download .md</span>
                    </ActionButton>

                    <ActionButton
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadTxt}
                    >
                      <span>.txt</span>
                    </ActionButton>
                  </div>
                </div>

                <div
                  className={`${styles.viewerContainer} ${
                    viewMode === "split" ? styles.viewerContainerSplit : ""
                  }`}
                >
                  {(viewMode === "split" || viewMode === "markdown") && (
                    <div className={styles.editorPane}>
                      <textarea
                        className={styles.editorTextarea}
                        value={editableMarkdown}
                        onChange={(e) => {
                          const val = e.target.value;
                          startTransition(() => {
                            setEditableMarkdown(val);
                          });
                        }}
                        placeholder="Extracted Markdown appears here..."
                        spellCheck={false}
                        aria-label="Extracted Markdown content"
                      />
                    </div>
                  )}

                  {(viewMode === "split" || viewMode === "preview") && (
                    <div
                      className={styles.previewPane}
                      dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                      aria-label="Rendered Markdown Preview"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {error && !isProcessing && (
        <div className={styles.alertWarning}>
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
