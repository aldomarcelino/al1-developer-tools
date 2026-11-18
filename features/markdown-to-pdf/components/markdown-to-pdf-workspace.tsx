"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileOutput,
  Printer,
  RotateCcw,
  Upload,
  Code2,
  Eye,
  ShieldCheck,
  X,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
import { useSnackbar } from "@/hooks/use-snackbar";
import { Snackbar } from "@/components/ui/snackbar";
import {
  type DocumentSettings,
  type ConversionProgress,
  DEFAULT_SETTINGS,
  PAGE_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  MARGIN_OPTIONS,
  THEME_OPTIONS,
  FONT_SIZE_OPTIONS,
  TEMPLATES,
} from "../lib/md-to-pdf-types";
import {
  calculateMarkdownStats,
  renderMarkdownToHtml,
  getMarginPadding,
  getPageDimensions,
  validateMarkdownFile,
  sanitizePdfFilename,
  formatFileSize,
} from "../lib/md-to-pdf-compiler";
import {
  downloadPdfBuffer,
  exportMarkdownToPdf,
  printMarkdownDocument,
} from "../lib/md-to-pdf-export";
import styles from "./markdown-to-pdf.module.css";

const templateOptions = [
  { value: "documentation", label: "Documentation" },
  { value: "resume", label: "Resume" },
  { value: "report", label: "Report" },
  { value: "meeting", label: "Meeting notes" },
];

const themes = {
  modern: styles.themeModern,
  github: styles.themeGithub,
  academic: styles.themeAcademic,
  minimal: styles.themeMinimal,
};
const fonts = {
  small: styles.fontSmall,
  medium: styles.fontMedium,
  large: styles.fontLarge,
};

export function MarkdownToPdfWorkspace() {
  const [documentOpen, setDocumentOpen] = useState(false);
  const [sourceName, setSourceName] = useState("Untitled.md");
  const [outputName, setOutputName] = useState("document");
  const [markdown, setMarkdown] = useState("");
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>("documentation");
  const [activePane, setActivePane] = useState<"source" | "preview">("source");
  const [showSource, setShowSource] = useState(false);
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress>({
    status: "idle",
    message: "",
    percent: 0,
  });
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState("fit");
  const previewScale = zoom === "fit" ? fitScale : Number(zoom) / 100;
  const [sheetHeight, setSheetHeight] = useState(0);
  const deferredMarkdown = useDeferredValue(markdown);
  const previewUpdating = deferredMarkdown !== markdown;
  const stats = useMemo(() => calculateMarkdownStats(markdown), [markdown]);
  const compiledHtml = useMemo(
    () => renderMarkdownToHtml(deferredMarkdown),
    [deferredMarkdown]
  );
  const outputPdfName = sanitizePdfFilename(outputName);
  const paper = getPageDimensions(settings.pageSize, settings.orientation);
  const paperWidth = (paper.width * 4) / 3;
  const paperHeight = (paper.height * 4) / 3;
  const paperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const loadId = useRef(0);
  const busyRef = useRef(false);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  useEffect(() => {
    if (!documentOpen || !paperRef.current || !viewportRef.current) return;
    const resize = () => {
      const available = (viewportRef.current?.clientWidth ?? paperWidth) - 40;
      setFitScale(Math.max(0.1, Math.min(1, available / paperWidth)));
      setSheetHeight(paperRef.current?.offsetHeight ?? paperHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewportRef.current);
    observer.observe(paperRef.current);
    resize();
    return () => observer.disconnect();
  }, [documentOpen, paperWidth, paperHeight, activePane]);

  const updateSettings = <K extends keyof DocumentSettings>(
    key: K,
    value: DocumentSettings[K]
  ) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setProgress({ status: "idle", message: "", percent: 0 });
  };

  const openDocument = (content: string, name: string) => {
    setMarkdown(content);
    setSourceName(name);
    const title = name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    setOutputName(name.replace(/\.[^/.]+$/, ""));
    setSettings((previous) => ({ ...previous, title }));
    setDocumentOpen(true);
    setActivePane("preview");
    setShowSource(false);
    setProgress({ status: "idle", message: "", percent: 0 });
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length || busyRef.current) return;
    const selected = files[0];
    const validation = validateMarkdownFile(selected);
    if (!validation.valid) {
      showSnackbar(validation.error!, "error");
      return;
    }
    const request = ++loadId.current;
    try {
      const content = await selected.text();
      if (request !== loadId.current) return;
      if (!content.trim()) {
        showSnackbar(
          "This file is empty. Choose another file or start writing.",
          "error"
        );
        return;
      }
      openDocument(content, selected.name);
      showSnackbar(`Loaded ${selected.name}.`);
    } catch {
      showSnackbar("Could not read this file. Please try another file.", "error");
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const loadSample = () => {
    ++loadId.current;
    openDocument(
      TEMPLATES[template],
      `${templateOptions.find((option) => option.value === template)!.label}.md`
    );
  };

  const startWriting = () => {
    ++loadId.current;
    openDocument("", "Untitled.md");
    setActivePane("source");
    setShowSource(true);
    requestAnimationFrame(() => sourceRef.current?.focus());
  };

  const reset = () => {
    ++loadId.current;
    setMarkdown("");
    setDocumentOpen(false);
    setZoom("fit");
    setSettings(DEFAULT_SETTINGS);
    setProgress({ status: "idle", message: "", percent: 0 });
  };

  const exportDocument = async (mode: "download" | "print") => {
    if (!paperRef.current || !markdown.trim() || previewUpdating || busyRef.current)
      return;
    busyRef.current = true;
    setIsConverting(true);
    setProgress({ status: "compiling", message: "Preparing document…", percent: 5 });
    try {
      if (mode === "print") {
        await printMarkdownDocument(paperRef.current, settings);
        setProgress({ status: "idle", message: "", percent: 0 });
      } else {
        const bytes = await exportMarkdownToPdf(
          paperRef.current,
          settings,
          (message, percent) => setProgress({ status: "compiling", message, percent })
        );
        downloadPdfBuffer(bytes, outputPdfName);
        setProgress({
          status: "done",
          message: `${outputPdfName} downloaded.`,
          percent: 100,
        });
        showSnackbar(`Downloaded ${outputPdfName}.`);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not export the document. Please try again.";
      setProgress({ status: "error", message, percent: 0 });
      showSnackbar(message, "error");
    } finally {
      busyRef.current = false;
      setIsConverting(false);
    }
  };

  const exportDisabled = !markdown.trim() || previewUpdating || isConverting;
  return (
    <div className={`workspace-page page-width utility-tool ${styles.workspace}`}>
      <ToolHeader title="Markdown to PDF" icon={<FileOutput size={24} />} />
      <p className={styles.intro}>
        Turn Markdown into a document you can share. Edit, choose a layout, and export in
        your browser.
      </p>
      {!documentOpen ? (
        <div className={styles.intake}>
          <DropArea
            variant="stacked"
            title="Start with your Markdown"
            description="Drop a document here, or write and paste your text."
            hint=".md, .markdown, or .txt · Up to 10 MB · No document uploads"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            multiple={false}
            buttonLabel="Choose file"
            onFiles={handleFiles}
            actions={
              <ActionButton variant="secondary" onClick={startWriting}>
                <Code2 size={15} />
                Write or paste
              </ActionButton>
            }
          />
          <div className={styles.sampleRow}>
            <div>
              <FileText size={17} />
              <span>Just exploring?</span>
            </div>
            <div className={styles.actionsGroup}>
              <CustomSelect
                value={template}
                onChange={(value) => setTemplate(value as keyof typeof TEMPLATES)}
                options={templateOptions}
                ariaLabel="Choose sample document"
              />
              <ActionButton variant="secondary" size="sm" onClick={loadSample}>
                Try sample
              </ActionButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.fileSummary}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <FileText size={21} />
              </div>
              <div className={styles.fileDetails}>
                <div className={styles.fileName} title={sourceName}>
                  {sourceName}
                </div>
                <div className={styles.fileMeta}>
                  {stats.words.toLocaleString()} words · {stats.lines.toLocaleString()}{" "}
                  lines · {formatFileSize(new Blob([markdown]).size)}
                </div>
              </div>
            </div>
            <div className={styles.actionsGroup}>
              <ActionButton
                variant="ghost"
                size="sm"
                onClick={() => uploadRef.current?.click()}
                disabled={isConverting}
              >
                <Upload size={14} />
                Open file
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={isConverting}
                aria-label="Start a new document"
              >
                <RotateCcw size={14} />
                New
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => exportDocument("print")}
                disabled={exportDisabled}
              >
                <Printer size={14} />
                Print
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => exportDocument("download")}
                disabled={exportDisabled}
                loading={isConverting}
              >
                <Download size={15} />
                Download PDF
              </ActionButton>
            </div>
            <input
              ref={uploadRef}
              hidden
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
            />
          </div>
          <section className={styles.optionsCard} aria-label="PDF settings">
            <div className={styles.documentFields}>
              <label className={styles.optionItem}>
                <span className={styles.optionLabel}>Document title</span>
                <input
                  className={styles.textInput}
                  value={settings.title}
                  onChange={(event) => updateSettings("title", event.target.value)}
                  disabled={isConverting}
                  placeholder="Untitled document"
                />
              </label>
              <label className={styles.optionItem}>
                <span className={styles.optionLabel}>PDF filename</span>
                <input
                  className={styles.textInput}
                  value={outputName}
                  aria-label="PDF filename"
                  onChange={(event) => {
                    setOutputName(event.target.value);
                    setProgress({ status: "idle", message: "", percent: 0 });
                  }}
                  disabled={isConverting}
                  placeholder="document"
                />
                <span className={styles.fieldHint}>{outputPdfName}</span>
              </label>
            </div>
            <div className={styles.optionsGrid}>
              <CustomSelect
                layout="stacked"
                label="Paper"
                value={settings.pageSize}
                onChange={(value) =>
                  updateSettings("pageSize", value as DocumentSettings["pageSize"])
                }
                options={PAGE_SIZE_OPTIONS}
                disabled={isConverting}
                ariaLabel="Select paper size"
              />
              <CustomSelect
                layout="stacked"
                label="Orientation"
                value={settings.orientation}
                onChange={(value) =>
                  updateSettings("orientation", value as DocumentSettings["orientation"])
                }
                options={ORIENTATION_OPTIONS}
                disabled={isConverting}
                ariaLabel="Select page orientation"
              />
              <CustomSelect
                layout="stacked"
                label="Theme"
                value={settings.theme}
                onChange={(value) =>
                  updateSettings("theme", value as DocumentSettings["theme"])
                }
                options={THEME_OPTIONS}
                disabled={isConverting}
                ariaLabel="Select document theme"
              />
              <CustomSelect
                layout="stacked"
                label="Margins"
                value={settings.margin}
                onChange={(value) =>
                  updateSettings("margin", value as DocumentSettings["margin"])
                }
                options={MARGIN_OPTIONS}
                disabled={isConverting}
                ariaLabel="Select margin size"
              />
              <CustomSelect
                layout="stacked"
                label="Font"
                value={settings.fontSize}
                onChange={(value) =>
                  updateSettings("fontSize", value as DocumentSettings["fontSize"])
                }
                options={FONT_SIZE_OPTIONS}
                disabled={isConverting}
                ariaLabel="Select font size"
              />
            </div>
            <div className={styles.optionsToggles}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={settings.showHeader}
                  disabled={isConverting}
                  onChange={(event) => updateSettings("showHeader", event.target.checked)}
                />
                Document header
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={settings.showPageNumbers}
                  disabled={isConverting}
                  onChange={(event) =>
                    updateSettings("showPageNumbers", event.target.checked)
                  }
                />
                PDF page numbers
              </label>
              <span className={styles.privacyNote}>
                <ShieldCheck size={14} />
                Processed on your device
              </span>
            </div>
          </section>
          {progress.status !== "idle" && (
            <div
              className={styles.exportStatus}
              role={progress.status === "error" ? "alert" : "status"}
              aria-live="polite"
              data-error={progress.status === "error" || undefined}
            >
              <span>{progress.message}</span>
              {isConverting && (
                <progress
                  value={progress.percent}
                  max={100}
                  aria-label="PDF export progress"
                />
              )}
            </div>
          )}
          <div className={styles.mobileTabs} aria-label="Workspace view">
            <button
              type="button"
              aria-pressed={activePane === "source"}
              onClick={() => setActivePane("source")}
            >
              <Code2 size={14} />
              Markdown
            </button>
            <button
              type="button"
              aria-pressed={activePane === "preview"}
              onClick={() => setActivePane("preview")}
            >
              <Eye size={14} />
              Preview
            </button>
          </div>
          <div
            className={`${styles.editorLayout} ${showSource ? styles.withSource : ""}`}
          >
            <section
              className={`${styles.sourcePanel} ${activePane === "source" ? styles.activePane : ""}`}
              id="markdown-pdf-source"
              aria-label="Markdown editor"
            >
              <div className={styles.panelHeader}>
                <span>
                  <Code2 size={15} />
                  Markdown
                </span>
                <ActionButton
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className={styles.desktopEditButton}
                  aria-label="Hide Markdown editor"
                  onClick={() => {
                    setShowSource(false);
                    setActivePane("preview");
                  }}
                >
                  <X size={14} />
                </ActionButton>
              </div>
              <textarea
                ref={sourceRef}
                className={styles.sourceTextarea}
                value={markdown}
                disabled={isConverting}
                spellCheck={false}
                aria-label="Markdown source"
                placeholder={"# Your document\n\nWrite or paste Markdown here…"}
                onChange={(event) => {
                  setMarkdown(event.target.value);
                  setProgress({ status: "idle", message: "", percent: 0 });
                }}
              />
              <div className={styles.panelFooter}>
                {stats.characters.toLocaleString()} characters<span>Markdown</span>
              </div>
            </section>
            <section
              className={`${styles.previewSection} ${activePane === "preview" ? styles.activePane : ""}`}
              aria-label="Document preview"
              aria-busy={previewUpdating}
            >
              <div className={styles.panelHeader}>
                <span>
                  <Eye size={15} />
                  Preview
                </span>
                <div className={styles.previewZoom}>
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    className={styles.desktopEditButton}
                    aria-expanded={showSource}
                    aria-controls="markdown-pdf-source"
                    onClick={() => {
                      setShowSource(!showSource);
                      setActivePane(showSource ? "preview" : "source");
                    }}
                  >
                    <Code2 size={14} />
                    {showSource ? "Hide editor" : "Edit Markdown"}
                  </ActionButton>
                  <span className={styles.quietLabel}>
                    {settings.pageSize.toUpperCase()}
                  </span>
                  <CustomSelect
                    value={zoom}
                    onChange={setZoom}
                    options={[
                      { value: "fit", label: `Fit · ${Math.round(fitScale * 100)}%` },
                      { value: "50", label: "50%" },
                      { value: "75", label: "75%" },
                      { value: "100", label: "100%" },
                      { value: "125", label: "125%" },
                    ]}
                    ariaLabel="Preview zoom"
                  />
                </div>
              </div>
              <div ref={viewportRef} className={styles.paperViewport}>
                <div
                  className={styles.paperFrame}
                  style={{
                    width: paperWidth * previewScale,
                    height: Math.max(paperHeight, sheetHeight) * previewScale,
                  }}
                >
                  <div
                    ref={paperRef}
                    className={`${styles.paperSheet} ${themes[settings.theme]} ${fonts[settings.fontSize]}`}
                    style={{
                      width: paperWidth,
                      minHeight: paperHeight,
                      padding: getMarginPadding(settings.margin),
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    {settings.showHeader && (
                      <div className={styles.sheetHeader} data-pdf-header>
                        <span>{settings.title || "Untitled document"}</span>
                        <span>{settings.headerText}</span>
                      </div>
                    )}
                    <div
                      className={styles.sheetBody}
                      data-pdf-body
                      dangerouslySetInnerHTML={{ __html: compiledHtml }}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.panelFooter}>
                <span>{previewUpdating ? "Updating…" : "Continuous preview"}</span>
                <span>Pages split on export</span>
              </div>
            </section>
          </div>
          <p className={styles.exportNote}>
            Download PDF saves rendered pages. Use Print for selectable text. Remote
            images may need an internet connection.
          </p>
        </>
      )}
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
