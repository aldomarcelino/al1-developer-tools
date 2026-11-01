"use client";

import { useState } from "react";
import {
  FileType,
  Upload,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { downloadBlob } from "@/lib/browser/download";
import {
  type WordOutputFormat,
  type LayoutMode,
  type PdfToWordOptions,
  type PdfExtractionResult,
  type ConversionProgress,
  PDF_WORD_LIMITS,
  FORMAT_OPTIONS,
  LAYOUT_OPTIONS,
  validatePdfFile,
  formatFileSize,
  sanitizeWordFilename,
  generateDocxBlob,
  generateDocBlob,
  getPdfJs,
  extractTextFromPdf,
} from "../lib/pdf-to-word";
import styles from "@/styles/shared/toolkit.module.css";
import local from "../pdf-to-word.module.css";

export function PdfToWordWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [options, setOptions] = useState<PdfToWordOptions>({
    format: PDF_WORD_LIMITS.defaultFormat,
    layout: PDF_WORD_LIMITS.defaultLayout,
  });
  const [extractionResult, setExtractionResult] = useState<PdfExtractionResult | null>(null);
  const [progress, setProgress] = useState<ConversionProgress>({
    status: "idle",
    message: "",
    percent: 0,
    current: 0,
    total: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  function handleReset() {
    setFile(null);
    setArrayBuffer(null);
    setExtractionResult(null);
    setError("");
    setNotice("");
    setProgress({
      status: "idle",
      message: "",
      percent: 0,
      current: 0,
      total: 0,
    });
    setIsProcessing(false);
  }

  async function parsePdfDocument(
    buffer: ArrayBuffer,
    currentOptions: PdfToWordOptions
  ) {
    setIsProcessing(true);
    setError("");
    setNotice("");
    setProgress({
      status: "parsing",
      message: "Reading PDF document...",
      percent: 10,
      current: 0,
      total: 0,
    });

    try {
      const pdfjs = await getPdfJs();
      const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise;

      const extraction = await extractTextFromPdf(
        pdfDoc,
        currentOptions,
        (p) => setProgress(p)
      );

      setExtractionResult(extraction);
      setProgress({
        status: "idle",
        message: "",
        percent: 100,
        current: extraction.totalPages,
        total: extraction.totalPages,
      });

      const successMsg = `Successfully extracted ${extraction.totalPages} page(s) and ${extraction.totalWords} words.`;
      setNotice(successMsg);
      showSnackbar(successMsg, "success");
    } catch (cause) {
      const errorMsg =
        cause instanceof Error ? cause.message : "Failed to parse PDF document.";
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
    setNotice("");
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setArrayBuffer(buffer);
      await parsePdfDocument(buffer, options);
    } catch {
      const readError = "Failed to read the selected file.";
      setError(readError);
      showSnackbar(readError, "error");
    }
  }

  function handleFormatChange(val: string) {
    const newFormat = val as WordOutputFormat;
    setOptions((prev) => ({ ...prev, format: newFormat }));
  }

  function handleLayoutChange(val: string) {
    const newLayout = val as LayoutMode;
    const nextOptions = { ...options, layout: newLayout };
    setOptions(nextOptions);

    if (arrayBuffer && !isProcessing) {
      void parsePdfDocument(arrayBuffer, nextOptions);
    }
  }

  async function handleConvertAndDownload() {
    if (!file || !extractionResult) {
      setError("Document extraction is not ready yet.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setProgress({
      status: "converting",
      message: `Generating .${options.format.toUpperCase()} file...`,
      percent: 85,
      current: extractionResult.totalPages,
      total: extractionResult.totalPages,
    });

    try {
      let wordBlob: Blob;
      if (options.format === "docx") {
        wordBlob = await generateDocxBlob(extractionResult, options);
      } else {
        wordBlob = generateDocBlob(extractionResult, options);
      }

      const outputFilename = sanitizeWordFilename(file.name, options.format);
      downloadBlob(wordBlob, outputFilename);

      setProgress({
        status: "done",
        message: `Word (.${options.format.toUpperCase()}) downloaded successfully!`,
        percent: 100,
        current: extractionResult.totalPages,
        total: extractionResult.totalPages,
      });

      const downloadedMsg = `Downloaded "${outputFilename}" successfully.`;
      setNotice(downloadedMsg);
      showSnackbar(downloadedMsg, "success");
    } catch (cause) {
      const errorMsg =
        cause instanceof Error
          ? cause.message
          : "Failed to generate Word document.";
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

  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader
        title="PDF to Word"
        icon={<FileType size={24} />}
      />

      <div className={local.workspace}>
        {/* Upload drop area */}
        {!file && (
          <DropArea
            variant="stacked"
            label="Upload PDF document"
            title="Convert PDF to Word (.DOCX, .DOC)"
            description="Drop your PDF here. Extracts text, headings, and formatting directly into an editable Microsoft Word document in your browser."
            hint="Supports PDF files up to 50 MB and 100 pages. 100% private in-browser processing without server uploads."
            accept="application/pdf,.pdf"
            multiple={false}
            buttonLabel="Select PDF File"
            buttonIcon={<Upload size={15} />}
            loading={isProcessing}
            disabled={isProcessing}
            onFiles={handleFiles}
          />
        )}

        {/* File summary and options */}
        {file && (
          <>
            <div className={local.fileSummary}>
              <div className={local.fileInfo}>
                <div className={local.fileIcon}>
                  <FileType size={22} />
                </div>
                <div className={local.fileDetails}>
                  <div className={local.fileName} title={file.name}>
                    {file.name}
                  </div>
                  <div className={local.fileMeta}>
                    <span>{formatFileSize(file.size)}</span>
                    {extractionResult && (
                      <>
                        <span>·</span>
                        <span>{extractionResult.totalPages} page(s)</span>
                        <span>·</span>
                        <span>{extractionResult.totalWords} words</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className={local.actionsGroup}>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={isProcessing}
                  dangerHover
                >
                  <X size={14} />
                  Convert Another PDF
                </ActionButton>
              </div>
            </div>

            {/* Options card */}
            <div className={local.optionsCard}>
              <div className={local.optionsGrid}>
                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Output Format</span>
                  <CustomSelect
                    value={options.format}
                    onChange={handleFormatChange}
                    options={FORMAT_OPTIONS}
                    disabled={isProcessing}
                    ariaLabel="Select Word output format"
                  />
                </div>

                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Layout Mode</span>
                  <CustomSelect
                    value={options.layout}
                    onChange={handleLayoutChange}
                    options={LAYOUT_OPTIONS}
                    disabled={isProcessing}
                    ariaLabel="Select layout reconstruction mode"
                  />
                </div>
              </div>

              <div className={local.actionsRow}>
                <div className={local.actionsGroup}>
                  <ActionButton
                    variant="primary"
                    onClick={handleConvertAndDownload}
                    disabled={isProcessing || !extractionResult}
                    loading={isProcessing}
                  >
                    <Download size={15} />
                    Convert & Download Word (.
                    {options.format.toUpperCase()})
                  </ActionButton>

                  <ActionButton
                    variant="secondary"
                    onClick={handleReset}
                    disabled={isProcessing}
                    dangerHover
                  >
                    <X size={14} />
                    Reset
                  </ActionButton>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Real-time progress bar */}
        {isProcessing && (
          <div className={local.progressContainer}>
            <div className={local.progressTop}>
              <span className={local.progressMessage}>{progress.message}</span>
              <span className={local.progressPercent}>{progress.percent}%</span>
            </div>
            <div className={local.progressBar}>
              <div
                className={local.progressFill}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className={local.errorAlert} role="alert">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <AlertCircle size={16} />
              {error}
            </span>
          </div>
        )}

        {notice && !error && (
          <div className={local.noticeAlert}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <CheckCircle2 size={16} color="var(--accent)" />
              {notice}
            </span>
          </div>
        )}

        {/* Extracted Content Preview */}
        {extractionResult && (
          <div className={local.previewCard}>
            <div className={local.previewHeader}>
              <h3 className={local.previewTitle}>Extracted Content Preview</h3>
              <div className={local.previewStats}>
                <span>{extractionResult.totalPages} pages</span>
                <span>·</span>
                <span>{extractionResult.totalParagraphs} paragraphs</span>
                <span>·</span>
                <span>{extractionResult.totalCharacters} chars</span>
              </div>
            </div>

            <div className={local.previewBody}>
              {extractionResult.pages.map((page) => (
                <div key={page.pageNumber} className={local.pageSection}>
                  <span className={local.pageBadge}>
                    Page {page.pageNumber} of {extractionResult.totalPages}
                  </span>

                  {page.paragraphs.length === 0 ? (
                    <p className={local.previewEmpty}>
                      No text found on this page.
                    </p>
                  ) : (
                    page.paragraphs.map((para, pIdx) => {
                      if (para.isHeading) {
                        const headingClass =
                          para.headingLevel === 1
                            ? local.previewHeading1
                            : para.headingLevel === 2
                              ? local.previewHeading2
                              : local.previewHeading3;

                        return (
                          <div key={pIdx} className={headingClass}>
                            {para.text}
                          </div>
                        );
                      }

                      return (
                        <p key={pIdx} className={local.previewParagraph}>
                          {para.runs.map((run, rIdx) => (
                            <span
                              key={rIdx}
                              style={{
                                fontWeight: run.bold ? "bold" : "normal",
                                fontStyle: run.italic ? "italic" : "normal",
                              }}
                            >
                              {run.text}
                            </span>
                          ))}
                        </p>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
