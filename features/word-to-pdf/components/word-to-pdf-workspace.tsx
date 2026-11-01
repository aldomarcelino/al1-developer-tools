"use client";

import { useRef, useState } from "react";
import {
  FileText,
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
  type PageSize,
  type Orientation,
  type MarginOption,
  type PageSettings,
  type ConversionProgress,
  WORD_LIMITS,
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  MARGIN_OPTIONS,
  validateDocxFile,
  sanitizeOutputFilename,
  formatFileSize,
  convertRenderedDocxToPdf,
} from "../lib/word-to-pdf";
import { DocumentPreview } from "./document-preview";
import styles from "@/styles/shared/toolkit.module.css";
import local from "../word-to-pdf.module.css";

export function WordToPdfWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [settings, setSettings] = useState<PageSettings>({
    pageSize: WORD_LIMITS.defaultPageSize,
    orientation: WORD_LIMITS.defaultOrientation,
    margin: WORD_LIMITS.defaultMargin,
  });
  const [progress, setProgress] = useState<ConversionProgress>({
    status: "idle",
    message: "",
    percent: 0,
  });
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  function handleReset() {
    setFile(null);
    setArrayBuffer(null);
    setError("");
    setNotice("");
    setProgress({ status: "idle", message: "", percent: 0 });
    setIsConverting(false);
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    const selectedFile = files[0];
    const validation = validateDocxFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid Word document.");
      showSnackbar(validation.error ?? "Invalid Word document.", "error");
      return;
    }

    setError("");
    setNotice("");
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setArrayBuffer(buffer);
    } catch {
      setError("Failed to read the selected file.");
      showSnackbar("Failed to read the selected file.", "error");
    }
  }

  async function handleConvertPdf() {
    if (!file || !previewContainerRef.current) {
      setError("Document preview is not ready yet. Please wait a moment.");
      return;
    }

    setIsConverting(true);
    setError("");
    setNotice("");
    setProgress({
      status: "compiling",
      message: "Starting PDF conversion...",
      percent: 5,
    });

    try {
      const outputBytes = await convertRenderedDocxToPdf(
        previewContainerRef.current,
        settings,
        (msg, pct) => {
          setProgress({
            status: "compiling",
            message: msg,
            percent: pct,
          });
        }
      );

      const outputFilename = sanitizeOutputFilename(file.name);
      const pdfBlob = new Blob([outputBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      downloadBlob(pdfBlob, outputFilename);

      setProgress({
        status: "done",
        message: "PDF downloaded successfully!",
        percent: 100,
      });

      const successMsg = `Converted "${outputFilename}" successfully.`;
      setNotice(successMsg);
      showSnackbar(successMsg, "success");
    } catch (cause) {
      const errorMsg =
        cause instanceof Error ? cause.message : "Failed to compile PDF document.";
      setError(errorMsg);
      showSnackbar(errorMsg, "error");
      setProgress({
        status: "error",
        message: errorMsg,
        percent: 0,
      });
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader
        title="Word to PDF"
        icon={<FileText size={24} />}
      />

      <div className={local.workspace}>
        {/* Drop area when no file is loaded */}
        {!file && (
          <DropArea
            variant="stacked"
            label="Upload Word document"
            title="Convert Word (.docx, .doc) to PDF"
            description="Drop your DOCX or DOC file here. Parse and convert to PDF directly in your browser with formatting preserved."
            hint="Supports .docx and .doc files up to 25 MB. 100% private in-browser conversion without server uploads."
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            multiple={false}
            buttonLabel="Select Word File"
            buttonIcon={<Upload size={15} />}
            loading={false}
            disabled={isConverting}
            onFiles={handleFiles}
          />
        )}

        {/* File loaded state and controls */}
        {file && (
          <>
            <div className={local.fileSummary}>
              <div className={local.fileInfo}>
                <div className={local.fileIcon}>
                  <FileText size={22} />
                </div>
                <div className={local.fileDetails}>
                  <div className={local.fileName} title={file.name}>
                    {file.name}
                  </div>
                  <div className={local.fileMeta}>
                    <span>{formatFileSize(file.size)}</span>
                    <span>·</span>
                    <span>Ready for conversion</span>
                  </div>
                </div>
              </div>

              <div className={local.actionsGroup}>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={isConverting}
                  dangerHover
                >
                  <X size={14} />
                  Convert Another Document
                </ActionButton>
              </div>
            </div>

            {/* Page settings card */}
            <div className={local.optionsCard}>
              <div className={local.optionsGrid}>
                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Page Size</span>
                  <CustomSelect
                    value={settings.pageSize}
                    onChange={(val) =>
                      setSettings((prev) => ({ ...prev, pageSize: val as PageSize }))
                    }
                    options={PAGE_SIZE_OPTIONS}
                    disabled={isConverting}
                    ariaLabel="Select page paper size"
                  />
                </div>

                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Orientation</span>
                  <CustomSelect
                    value={settings.orientation}
                    onChange={(val) =>
                      setSettings((prev) => ({
                        ...prev,
                        orientation: val as Orientation,
                      }))
                    }
                    options={ORIENTATION_OPTIONS}
                    disabled={isConverting}
                    ariaLabel="Select page orientation"
                  />
                </div>

                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Margin</span>
                  <CustomSelect
                    value={settings.margin}
                    onChange={(val) =>
                      setSettings((prev) => ({
                        ...prev,
                        margin: val as MarginOption,
                      }))
                    }
                    options={MARGIN_OPTIONS}
                    disabled={isConverting}
                    ariaLabel="Select page margin"
                  />
                </div>
              </div>

              <div className={local.actionsRow}>
                <div className={local.actionsGroup}>
                  <ActionButton
                    variant="primary"
                    onClick={handleConvertPdf}
                    disabled={isConverting || !arrayBuffer}
                    loading={isConverting}
                  >
                    <Download size={15} />
                    Convert & Download PDF
                  </ActionButton>

                  <ActionButton
                    variant="secondary"
                    onClick={handleReset}
                    disabled={isConverting}
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

        {/* Real-time conversion progress bar */}
        {isConverting && (
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={16} />
              {error}
            </span>
          </div>
        )}

        {notice && !error && (
          <div className={local.noticeAlert}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              {notice}
            </span>
          </div>
        )}

        {/* Live Document Preview */}
        {file && arrayBuffer && (
          <DocumentPreview
            arrayBuffer={arrayBuffer}
            settings={settings}
            containerRef={previewContainerRef}
            onError={(msg) => {
              setError(msg);
              showSnackbar(msg, "error");
            }}
          />
        )}
      </div>

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
