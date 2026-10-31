"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Files, Upload, Download, Trash2, ChevronDown } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortablePdfPage, PdfPagePreview } from "./sortable-pdf-page";
import pdfStyles from "../styles.module.css";
import { ActionButton } from "@/components/ui/action-button";
import { ToolHeader } from "@/components/cummon/tool-header";
import { downloadBlob } from "@/lib/browser/download";
import {
  pdfLimits,
  parsePageRange,
  loadPdf,
  combinePages,
  splitPages,
  type LoadedPdf,
  type PdfPageRef,
} from "../lib/pdf";
import styles from "@/styles/shared/toolkit.module.css";
interface Source extends LoadedPdf {
  url: string;
  size: number;
}
interface Page extends PdfPageRef {
  id: string;
  selected: boolean;
}
export function PdfWorkspace() {
  const [sources, setSources] = useState<Source[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const revision = useRef({ value: 0 });
  useEffect(() => {
    const activeUrls = urls.current;
    const activeOperation = revision.current;
    return () => {
      activeOperation.value++;
      for (const url of activeUrls) URL.revokeObjectURL(url);
    };
  }, []);
  const selected = pages.filter((page) => page.selected);
  async function add(files: File[]) {
    if (!files.length || busy) return;
    const version = ++revision.current.value;
    setBusy(true);
    setNotice("");
    const loaded: Source[] = [];
    try {
      if (sources.length + files.length > pdfLimits.files)
        throw new Error("Load no more than 10 PDF files at once.");
      if (
        sources.reduce((sum, source) => sum + source.size, 0) +
          files.reduce((sum, file) => sum + file.size, 0) >
        pdfLimits.totalBytes
      )
        throw new Error("Keep the combined source files within 50 MB.");
      const problems: string[] = [];
      let count = pages.length;
      for (const file of files) {
        try {
          if (file.size > pdfLimits.fileBytes)
            throw new Error("Maximum file size is 25 MB.");
          if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name))
            throw new Error("Choose a PDF file.");
          const bytes = await file.arrayBuffer();
          const document = await loadPdf(bytes);
          if (version !== revision.current.value) return;
          if (count + document.getPageCount() > pdfLimits.pages)
            throw new Error("Keep the combined page count within 300.");
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
          urls.current.add(url);
          loaded.push({
            id: crypto.randomUUID(),
            name: file.name,
            document,
            url,
            size: file.size,
          });
          count += document.getPageCount();
        } catch (error) {
          problems.push(
            `${file.name}: ${error instanceof Error ? error.message : "Could not read this PDF."}`
          );
        }
      }
      if (version !== revision.current.value) return;
      setSources((previous) => [...previous, ...loaded]);
      setPages((previous) => [
        ...previous,
        ...loaded.flatMap((source) =>
          Array.from({ length: source.document.getPageCount() }, (_, pageIndex) => ({
            id: `${source.id}-${pageIndex}`,
            sourceId: source.id,
            pageIndex,
            selected: true,
          }))
        ),
      ]);
      setNotice(
        [
          loaded.length
            ? `Added ${loaded.length} PDF${loaded.length === 1 ? "" : "s"}.`
            : "No PDFs were added.",
          ...problems,
        ].join(" ")
      );
    } catch (error) {
      if (version === revision.current.value)
        setNotice(error instanceof Error ? error.message : "Could not load PDFs.");
    } finally {
      if (version === revision.current.value) setBusy(false);
    }
  }
  function clear() {
    revision.current.value++;
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    setDraggedId(null);
    setSources([]);
    setPages([]);
    setRange("");
    setNotice("");
    setBusy(false);
  }
  function move(index: number, direction: number) {
    if (busy || index + direction < 0 || index + direction >= pages.length) return;
    setPages((previous) => arrayMove(previous, index, index + direction));
    setNotice("Page order updated.");
  }
  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggedId(null);
    if (busy || !over || active.id === over.id) return;
    setPages((previous) => {
      const from = previous.findIndex((page) => page.id === active.id);
      const to = previous.findIndex((page) => page.id === over.id);
      return from < 0 || to < 0 ? previous : arrayMove(previous, from, to);
    });
    setNotice("Page order updated.");
  }
  async function exportPdf(split: boolean) {
    const version = ++revision.current.value;
    setBusy(true);
    setNotice("");
    try {
      if (split) {
        const files = await splitPages(sources, selected);
        const { createZip } = await import("@/lib/browser/zip");
        if (version !== revision.current.value) return;
        downloadBlob(
          new Blob([createZip(files).buffer], { type: "application/zip" }),
          "split-pages.zip"
        );
      } else {
        const bytes = await combinePages(sources, selected);
        if (version !== revision.current.value) return;
        downloadBlob(
          new Blob([bytes.buffer], { type: "application/pdf" }),
          sources.length > 1 ? "merged-pages.pdf" : "selected-pages.pdf"
        );
      }
      setNotice(
        split
          ? `Downloaded ${selected.length} single-page PDFs in a ZIP.`
          : `Downloaded a PDF with ${selected.length} selected pages.`
      );
    } catch (error) {
      if (version === revision.current.value)
        setNotice(
          error instanceof Error ? error.message : "Could not export these pages."
        );
    } finally {
      if (version === revision.current.value) setBusy(false);
    }
  }
  const draggedPage = pages.find((page) => page.id === draggedId);
  const draggedSource = sources.find((source) => source.id === draggedPage?.sourceId);
  function pageDescription(id: string | number) {
    const page = pages.find((page) => page.id === id);
    const source = sources.find((source) => source.id === page?.sourceId);
    return page && source
      ? `Source page ${page.pageIndex + 1} from ${source.name}`
      : "Page";
  }
  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader title="PDF Merge & Split" icon={<Files size={24} />} />
      <div
        className={`${styles.dropzone} ${pdfStyles.upload}`}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          void add(Array.from(event.dataTransfer.files));
        }}
      >
        <div>
          <strong>Bring your PDFs together</strong>
          <p className={styles.hint}>Drop your files here, or choose them below.</p>
        </div>
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={16} aria-hidden="true" />
          {busy ? "Processing…" : sources.length ? "Add more PDFs" : "Add PDFs"}
        </button>
        <p className={styles.hint}>
          PDF only · 25 MB per file · 50 MB combined · On-device processing
        </p>
        <input
          hidden
          ref={input}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          aria-label="Choose PDF files"
          onChange={(event) => {
            void add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      <p className={`${styles.hint} ${pdfStyles.compatibility}`}>
        For static, unsigned PDFs. Encrypted files, interactive forms, and signed
        documents are not supported. Bookmarks and other document-level features may not
        be retained.
      </p>
      {sources.length > 0 && (
        <section
          className={`${styles.panel} ${styles.section} ${pdfStyles.organizer}`}
          aria-label="Organize PDF pages"
        >
          <div className={pdfStyles.heading}>
            <div>
              <h2>Organize pages</h2>
              <p className={styles.hint}>
                {selected.length} of {pages.length} pages selected · {sources.length} of
                10 files
              </p>
            </div>
            <ActionButton variant="danger" disabled={busy} onClick={clear}>
              <Trash2 size={14} aria-hidden="true" /> Clear all
            </ActionButton>
          </div>
          <details className={pdfStyles.sources}>
            <summary>
              <Files size={15} aria-hidden="true" />
              <span>Source files</span>
              <span className={pdfStyles.sourceSummary}>
                {sources.length} {sources.length === 1 ? "PDF" : "PDFs"} · {pages.length}{" "}
                pages
              </span>
              <ChevronDown size={14} className={pdfStyles.chevron} aria-hidden="true" />
            </summary>
            <div className={pdfStyles.sourceList}>
              {sources.map((source) => (
                <a
                  className={pdfStyles.sourceFile}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={source.id}
                >
                  <span title={source.name}>{source.name}</span>
                  <small>
                    {source.document.getPageCount()} pages ·{" "}
                    {source.size < 1024 * 1024
                      ? `${(source.size / 1024).toFixed(1)} KB`
                      : `${(source.size / 1024 / 1024).toFixed(2)} MB`}
                  </small>
                </a>
              ))}
            </div>
          </details>
          <div className={pdfStyles.selectionBar}>
            <form
              className={pdfStyles.range}
              onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                try {
                  const selection = parsePageRange(range, pages.length);
                  setPages((previous) =>
                    previous.map((page, index) => ({
                      ...page,
                      selected: selection.has(index),
                    }))
                  );
                  setNotice(`Selected ${selection.size} pages.`);
                } catch (error) {
                  setNotice(
                    error instanceof Error ? error.message : "Invalid page range."
                  );
                }
              }}
            >
              <label className={styles.field}>
                Page range
                <input
                  value={range}
                  onChange={(event) => setRange(event.target.value)}
                  placeholder="e.g. 1-3, 5"
                  disabled={busy}
                  maxLength={1200}
                />
              </label>
              <button type="submit" className="button" disabled={busy || !range.trim()}>
                Apply
              </button>
            </form>
            <label className={pdfStyles.selectAll}>
              <input
                type="checkbox"
                checked={selected.length === pages.length}
                ref={(element) => {
                  if (element)
                    element.indeterminate =
                      selected.length > 0 && selected.length < pages.length;
                }}
                disabled={busy}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPages((previous) =>
                    previous.map((page) => ({ ...page, selected: checked }))
                  );
                }}
              />
              Select all pages
            </label>
          </div>
          <div className={pdfStyles.orderHeading}>
            <h3>Page order</h3>
            <p className={styles.hint}>
              Drag the handle to reorder. Export follows this order.
            </p>
          </div>
          <DndContext
            id={dndId}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Press Space or Enter to pick up a page. Use the arrow keys to change its position, then press Space or Enter to drop it. Press Escape to cancel.",
              },
              announcements: {
                onDragStart: ({ active }) => `${pageDescription(active.id)} picked up.`,
                onDragOver: ({ active, over }) =>
                  over
                    ? `${pageDescription(active.id)} over position ${pages.findIndex((page) => page.id === over.id) + 1} of ${pages.length}.`
                    : "Move over a page to reorder.",
                onDragEnd: ({ active, over }) =>
                  over
                    ? `${pageDescription(active.id)} dropped at position ${pages.findIndex((page) => page.id === over.id) + 1} of ${pages.length}.`
                    : "Page order unchanged.",
                onDragCancel: () => "Reordering cancelled. Page order unchanged.",
              },
            }}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setDraggedId(String(active.id))}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDraggedId(null)}
          >
            <SortableContext
              items={pages.map((page) => page.id)}
              strategy={rectSortingStrategy}
            >
              <div className={pdfStyles.pageGrid} role="group" aria-label="Page order">
                {pages.map((page, index) => {
                  const source = sources.find((source) => source.id === page.sourceId)!;
                  return (
                    <SortablePdfPage
                      key={page.id}
                      id={page.id}
                      index={index}
                      pageIndex={page.pageIndex}
                      name={source.name}
                      url={source.url}
                      selected={page.selected}
                      busy={busy}
                      count={pages.length}
                      onMove={(direction) => move(index, direction)}
                      onSelect={(checked) =>
                        setPages((previous) =>
                          previous.map((item) =>
                            item.id === page.id ? { ...item, selected: checked } : item
                          )
                        )
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {draggedPage && draggedSource ? (
                <PdfPagePreview
                  name={draggedSource.name}
                  pageIndex={draggedPage.pageIndex}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          <div className={pdfStyles.exportBar}>
            <div>
              <strong>Ready to export</strong>
              <p className={styles.hint}>
                {selected.length} selected {selected.length === 1 ? "page" : "pages"} ·
                ZIP supports up to 100 pages and 100 MB
              </p>
            </div>
            <div className={styles.row}>
              <button
                type="button"
                className="button"
                disabled={
                  busy || !selected.length || selected.length > pdfLimits.splitPages
                }
                onClick={() => exportPdf(true)}
              >
                <Download size={14} aria-hidden="true" /> Split pages (ZIP)
              </button>
              <button
                type="button"
                className="button primary"
                disabled={busy || !selected.length}
                onClick={() => exportPdf(false)}
              >
                <Download size={14} aria-hidden="true" />
                {sources.length > 1 ? "Merge selected pages" : "Extract selected pages"}
              </button>
            </div>
          </div>
        </section>
      )}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
    </div>
  );
}
