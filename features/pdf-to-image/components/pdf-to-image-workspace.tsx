"use client";

import { useEffect, useRef, useState } from "react";
import {
  Images,
  Upload,
  Archive,
  RefreshCw,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { downloadBlob } from "@/lib/browser/download";
import {
  type ImageFormat,
  type ScaleOption,
  type ConversionOptions,
  type RenderedPage,
  type RenderProgress,
  PDF_LIMITS,
  FORMAT_OPTIONS,
  SCALE_OPTIONS,
  validatePdfFile,
  sanitizeBaseFilename,
  generatePageFilename,
  generateZipFilename,
  getScaleFactor,
  canvasToBlob,
  packagePagesAsZip,
  formatFileSize,
  getPdfJs,
} from "../lib/pdf-to-image";
import { PagePreviewCard } from "./page-preview-card";
import styles from "@/styles/shared/toolkit.module.css";
import local from "../pdf-to-image.module.css";

export function PdfToImageWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [options, setOptions] = useState<ConversionOptions>({
    format: PDF_LIMITS.defaultFormat,
    scale: PDF_LIMITS.defaultScale,
  });
  const [progress, setProgress] = useState<RenderProgress>({
    current: 0,
    total: 0,
    status: "idle",
    message: "",
  });
  const [isRendering, setIsRendering] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeUrls = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    const urls = activeUrls.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  function revokeAllUrls() {
    for (const url of activeUrls.current) {
      URL.revokeObjectURL(url);
    }
    activeUrls.current.clear();
  }

  function handleReset() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    revokeAllUrls();
    setFile(null);
    setPages([]);
    setError("");
    setNotice("");
    setProgress({ current: 0, total: 0, status: "idle", message: "" });
    setIsRendering(false);
  }

  async function startConversion(pdfFile: File, currentOptions: ConversionOptions) {
    const validation = validatePdfFile(pdfFile);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid PDF file.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    revokeAllUrls();
    setPages([]);
    setError("");
    setNotice("");
    setIsRendering(true);
    setProgress({
      current: 0,
      total: 0,
      status: "loading",
      message: "Loading PDF document...",
    });

    try {
      const pdfjs = await getPdfJs();
      const buffer = await pdfFile.arrayBuffer();

      if (abortController.signal.aborted) return;

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });

      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      if (totalPages <= 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      if (totalPages > PDF_LIMITS.maxPages) {
        throw new Error(
          `This document contains ${totalPages} pages. Ramupod is limited to ${PDF_LIMITS.maxPages} pages per file for browser performance.`
        );
      }

      const baseName = sanitizeBaseFilename(pdfFile.name);
      const scaleFactor = getScaleFactor(currentOptions.scale);
      const renderedList: RenderedPage[] = [];

      setProgress({
        current: 0,
        total: totalPages,
        status: "rendering",
        message: `Rendering 1 of ${totalPages} pages...`,
      });

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (abortController.signal.aborted) break;

        setProgress({
          current: pageNum,
          total: totalPages,
          status: "rendering",
          message: `Rendering page ${pageNum} of ${totalPages}...`,
        });

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scaleFactor });

        const canvas = document.createElement("canvas");
        const canvasWidth = Math.floor(viewport.width);
        const canvasHeight = Math.floor(viewport.height);
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const context = canvas.getContext("2d", { willReadFrequently: false });
        if (!context) {
          throw new Error("Failed to initialize canvas context.");
        }

        // Fill background with white to avoid black background on transparent PDF pages in JPG
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Render page
        const renderTask = page.render({
          canvasContext: context,
          viewport,
          canvas,
        });

        await renderTask.promise;

        if (abortController.signal.aborted) break;

        const blob = await canvasToBlob(
          canvas,
          currentOptions.format,
          currentOptions.quality
        );

        const previewUrl = URL.createObjectURL(blob);
        activeUrls.current.add(previewUrl);

        const filename = generatePageFilename(
          baseName,
          pageNum,
          totalPages,
          currentOptions.format
        );

        const pageResult: RenderedPage = {
          pageIndex: pageNum - 1,
          pageNumber: pageNum,
          width: canvasWidth,
          height: canvasHeight,
          blob,
          previewUrl,
          filename,
          size: blob.size,
        };

        renderedList.push(pageResult);
        // Incremental state update so pages appear progressively
        setPages([...renderedList]);
      }

      if (!abortController.signal.aborted) {
        setProgress({
          current: totalPages,
          total: totalPages,
          status: "done",
          message: `Finished rendering ${totalPages} pages!`,
        });
        setNotice(
          `Successfully converted ${totalPages} page(s) to ${currentOptions.format.toUpperCase()} format.`
        );
      }
    } catch (cause) {
      if (!abortController.signal.aborted) {
        const errorMsg =
          cause instanceof Error ? cause.message : "Failed to convert this PDF.";
        setError(errorMsg);
        setProgress((prev) => ({
          ...prev,
          status: "error",
          message: errorMsg,
        }));
      }
    } finally {
      setIsRendering(false);
    }
  }

  function handleFiles(files: File[]) {
    if (!files.length) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    void startConversion(selectedFile, options);
  }

  function handleFormatChange(val: string) {
    const newFormat = val as ImageFormat;
    const nextOptions = { ...options, format: newFormat };
    setOptions(nextOptions);
    if (file && !isRendering) {
      void startConversion(file, nextOptions);
    }
  }

  function handleScaleChange(val: string) {
    const newScale = val as ScaleOption;
    const nextOptions = { ...options, scale: newScale };
    setOptions(nextOptions);
    if (file && !isRendering) {
      void startConversion(file, nextOptions);
    }
  }

  function handleDownloadPage(page: RenderedPage) {
    downloadBlob(page.blob, page.filename);
  }

  async function handleDownloadAllZip() {
    if (!pages.length || !file) return;

    setIsZipping(true);
    setError("");
    try {
      const zipBytes = await packagePagesAsZip(pages);
      const baseName = sanitizeBaseFilename(file.name);
      const zipFilename = generateZipFilename(baseName);
      const zipBlob = new Blob([zipBytes], { type: "application/zip" });
      downloadBlob(zipBlob, zipFilename);
      setNotice(`Downloaded all ${pages.length} pages in "${zipFilename}".`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to create ZIP archive."
      );
    } finally {
      setIsZipping(false);
    }
  }

  const progressPercentage =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader
        title="PDF to Image"
        icon={<Images size={24} />}
      />

      <div className={local.workspace}>
        {/* Drop area when no file is loaded */}
        {!file && (
          <DropArea
            variant="stacked"
            label="Upload PDF file"
            title="Convert PDF to JPG, PNG, or WebP"
            description="Drop your PDF here. Each page will be rendered into high-resolution images in your browser."
            hint="Supports PDF files up to 50 MB and 100 pages. 100% private in-browser processing."
            accept="application/pdf,.pdf"
            multiple={false}
            buttonLabel="Select PDF"
            buttonIcon={<Upload size={15} />}
            loading={isRendering}
            disabled={isRendering}
            onFiles={handleFiles}
          />
        )}

        {/* File loaded bar & options */}
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
                    <span className={local.fileMetaItem}>
                      {formatFileSize(file.size)}
                    </span>
                    {pages.length > 0 && (
                      <span className={local.fileMetaItem}>
                        * {pages.length} page(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={local.actionsGroup}>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={isRendering}
                  dangerHover
                >
                  <X size={14} />
                  Choose Another PDF
                </ActionButton>
              </div>
            </div>

            {/* Controls panel */}
            <div className={local.optionsCard}>
              <div className={local.optionsGrid}>
                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Output Format</span>
                  <CustomSelect
                    value={options.format}
                    onChange={handleFormatChange}
                    options={FORMAT_OPTIONS}
                    disabled={isRendering}
                    ariaLabel="Select output image format"
                  />
                </div>

                <div className={local.optionItem}>
                  <span className={local.optionLabel}>Resolution Scale</span>
                  <CustomSelect
                    value={options.scale}
                    onChange={handleScaleChange}
                    options={SCALE_OPTIONS}
                    disabled={isRendering}
                    ariaLabel="Select resolution scale"
                  />
                </div>
              </div>

              <div className={local.actionsRow}>
                <div className={local.actionsGroup}>
                  <ActionButton
                    variant="secondary"
                    onClick={() => startConversion(file, options)}
                    disabled={isRendering}
                  >
                    <RefreshCw size={15} />
                    Re-render Images
                  </ActionButton>
                </div>

                {pages.length > 0 && (
                  <ActionButton
                    variant="primary"
                    onClick={handleDownloadAllZip}
                    disabled={isRendering || isZipping}
                    loading={isZipping}
                  >
                    <Archive size={15} />
                    Download All as ZIP ({pages.length})
                  </ActionButton>
                )}
              </div>
            </div>
          </>
        )}

        {/* Real-time rendering progress bar */}
        {isRendering && (
          <div className={local.progressContainer}>
            <div className={local.progressTop}>
              <span className={local.progressMessage}>{progress.message}</span>
              <span className={local.progressPercent}>{progressPercentage}%</span>
            </div>
            <div className={local.progressBar}>
              <div
                className={local.progressFill}
                style={{ width: `${progressPercentage}%` }}
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

        {/* Rendered pages gallery */}
        {pages.length > 0 && (
          <div>
            <div className={local.resultsHeader}>
              <div className={local.resultsHeading}>
                <h3 className={local.resultsTitle}>Rendered Pages</h3>
                <span className={local.resultsCount}>
                  {pages.length} {pages.length === 1 ? "Page" : "Pages"}
                </span>
              </div>

              <ActionButton
                variant="primary"
                size="sm"
                onClick={handleDownloadAllZip}
                disabled={isRendering || isZipping}
                loading={isZipping}
              >
                <Archive size={14} />
                Download All as ZIP
              </ActionButton>
            </div>

            <div className={local.previewGrid} style={{ marginTop: 16 }}>
              {pages.map((page) => (
                <PagePreviewCard
                  key={page.pageIndex}
                  page={page}
                  onDownload={handleDownloadPage}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
