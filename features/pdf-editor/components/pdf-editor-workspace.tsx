"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  FilePenLine,
  MoreHorizontal,
  SlidersHorizontal,
  Check,
  Pencil,
  Hand,
  Maximize2,
  Minimize2,
  ScanLine,
  MousePointer,
  Type,
  Square,
  Highlighter,
  Circle,
  PenTool,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eraser,
  X,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { DropArea } from "@/components/ui/drop-area";
import { CustomSelect } from "@/components/ui/custom-select";
import { ActionButton } from "@/components/ui/action-button";
import { ToolHeader } from "@/components/cummon/tool-header";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { downloadBlob } from "@/lib/browser/download";
import { SignatureModal } from "./signature-modal";
import { AnnotationResizeHandles } from "./annotation-resize-handles";
import {
  getPdfJs,
  exportEditedPdf,
  sanitizeBaseFilename,
  formatFileSize,
  screenToPercent,
  FONT_OPTIONS,
  textFontStyle,
  type PdfFontFamily,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  type PdfAnnotation,
  type EditorToolMode,
} from "../lib/pdf-editor";
import styles from "../styles.module.css";

const FONT_SIZES = [
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96, 120, 144,
];
const ANNOTATION_TOOLS = [
  { value: "hand", label: "Hand", icon: Hand, hint: "Drag to pan the document." },
  {
    value: "select",
    label: "Select",
    icon: MousePointer,
    hint: "Drag an annotation to move it, or drag its corners to resize. Double-click text to edit it.",
  },
  {
    value: "text",
    label: "Text",
    icon: Type,
    hint: "Click the page and start typing. The text box grows with your text.",
  },
  {
    value: "whiteout",
    label: "Whiteout",
    icon: Eraser,
    hint: "Drag to cover an area visually.",
  },
  {
    value: "highlight",
    label: "Highlight",
    icon: Highlighter,
    hint: "Drag over an area to highlight it.",
  },
  {
    value: "rectangle",
    label: "Rectangle",
    icon: Square,
    hint: "Drag to draw a rectangle.",
  },
  { value: "circle", label: "Circle", icon: Circle, hint: "Drag to draw an ellipse." },
] as const;

const MOBILE_QUERY = "(max-width: 960px)";
const subscribeMobile = (notify: () => void) => {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getMobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerMobileSnapshot = () => false;

export function PdfEditorWorkspace() {
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot
  );
  const [mobilePanel, setMobilePanel] = useState<"tools" | "settings" | "view" | null>(
    null
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileTextDraft, setMobileTextDraft] = useState("");

  // Document state
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null
  );
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<number[]>([]);

  // Canvas render references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [stageDimensions, setStageDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });

  // Annotations & History
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [history, setHistory] = useState<PdfAnnotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Tool & Properties
  const [activeTool, setActiveTool] = useState<EditorToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [fontSize, setFontSize] = useState<number>(12);
  const [fontFamily, setFontFamily] = useState<PdfFontFamily>("Helvetica");
  const [highlightColor, setHighlightColor] = useState<string>("#fde047");
  const [strokeColor, setStrokeColor] = useState<string>("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  // Dragging / Drawing state
  const isDraggingAnnotation = useRef<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number; annX: number; annY: number }>({
    x: 0,
    y: 0,
    annX: 0,
    annY: 0,
  });

  const isDrawingBox = useRef<boolean>(false);
  const drawStartCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<{
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  } | null>(null);

  // Modal & File Inputs
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const textMeasureRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Push new state to undo/redo history
  const pushToHistory = useCallback(
    (newAnnotations: PdfAnnotation[]) => {
      setAnnotations(newAnnotations);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newAnnotations];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setAnnotations(history[nextIdx]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setAnnotations(history[nextIdx]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  // Load PDF file
  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    const selectedFile = files[0];
    const validation = validatePdfFile(selectedFile);
    if (!validation.valid) {
      showSnackbar(validation.error || "Invalid PDF file.", "error");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const pdfjs = await getPdfJs();
      const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
      const doc = await loadingTask.promise;

      setFile(selectedFile);
      setPdfBytes(bytes);
      setPdfDocProxy(doc);
      setNumPages(doc.numPages);
      setCurrentPage(0);
      setFitToWidth(true);
      setPageRotations({});
      setDeletedPages([]);
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setSelectedId(null);
      setMobilePanel(null);
      setExpanded(window.matchMedia(MOBILE_QUERY).matches);
      setActiveTool(window.matchMedia(MOBILE_QUERY).matches ? "hand" : "select");
      showSnackbar(`Loaded ${selectedFile.name} (${doc.numPages} pages)`, "success");
    } catch {
      showSnackbar(
        "Failed to open PDF. File might be corrupted or password-protected.",
        "error"
      );
    }
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setViewportWidth(viewport.clientWidth));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [file]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const exit = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        if (isSignatureModalOpen) return;
        if (mobilePanel) {
          setMobilePanel(null);
          panelTriggerRef.current?.focus();
          return;
        }
        if (editingTextId) {
          if (isMobile) pushToHistory(annotations);
          setEditingTextId(null);
          return;
        }
        setExpanded(false);
        expandButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", exit);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", exit);
    };
  }, [
    expanded,
    mobilePanel,
    editingTextId,
    isSignatureModalOpen,
    isMobile,
    pushToHistory,
    annotations,
  ]);

  useEffect(() => {
    if (!expanded || !isMobile) return;
    const visualViewport = window.visualViewport;
    const editor = editorRef.current;
    if (!visualViewport || !editor) return;
    const update = () => {
      editor.style.setProperty("--editor-height", `${visualViewport.height}px`);
      editor.style.setProperty("--editor-top", `${visualViewport.offsetTop}px`);
    };
    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
      editor.style.removeProperty("--editor-height");
      editor.style.removeProperty("--editor-top");
    };
  }, [expanded, isMobile]);

  useEffect(() => {
    if (!isMobile || mobilePanel !== "settings" || !selectedId) return;
    const viewport = viewportRef.current;
    const editor = editorRef.current;
    const panel = document.getElementById("pdf-editor-settings");
    const element = overlayRef.current?.querySelector<HTMLElement>(
      '[data-annotation-selected="true"]'
    );
    if (!viewport || !editor || !panel || !element) return;
    const viewportRect = viewport.getBoundingClientRect();
    const visibleBottom = Math.min(
      viewportRect.bottom,
      panel.getBoundingClientRect().top - 12
    );
    const overlap = Math.max(0, viewportRect.bottom - visibleBottom);
    editor.style.setProperty("--mobile-panel-overlap", `${overlap}px`);
    const elementRect = element.getBoundingClientRect();
    if (elementRect.bottom > visibleBottom || elementRect.top < viewportRect.top) {
      viewport.scrollTop +=
        elementRect.top -
        viewportRect.top -
        Math.max(12, (visibleBottom - viewportRect.top - elementRect.height) / 2);
    }
    return () => {
      editor.style.removeProperty("--mobile-panel-overlap");
    };
  }, [isMobile, mobilePanel, selectedId]);

  useEffect(() => {
    if (!isMobile || mobilePanel !== "view") return;
    const outside = (event: Event) => {
      if (
        !(event.target instanceof Element) ||
        event.target.closest("[data-pdf-view-control]")
      )
        return;
      setMobilePanel(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setMobilePanel(null);
      panelTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile, mobilePanel]);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | null = null;
    async function renderPage() {
      if (!pdfDocProxy || !canvasRef.current || !viewportWidth) return;
      try {
        const page = await pdfDocProxy.getPage(currentPage + 1);
        if (cancelled) return;
        const rotation = (page.rotate + (pageRotations[currentPage] || 0)) % 360;
        const base = page.getViewport({ scale: 1, rotation });
        const nextScale = fitToWidth
          ? Math.min(2.5, Math.max(0.1, (viewportWidth - 32) / base.width))
          : scale;
        const viewport = page.getViewport({ scale: nextScale, rotation });
        if (fitToWidth) setScale(nextScale);
        await renderTaskRef.current?.promise.catch(() => {});
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        setStageDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });
        task = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          showSnackbar(
            "Could not display this page. Try another page or reload the PDF.",
            "error"
          );
        }
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [
    pdfDocProxy,
    currentPage,
    scale,
    fitToWidth,
    viewportWidth,
    pageRotations,
    showSnackbar,
  ]);

  // Keyboard shortcuts (Undo, Redo, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an active text area or input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        const updated = annotations.filter((a) => a.id !== selectedId);
        pushToHistory(updated);
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedId, annotations, pushToHistory]);

  // Handle page rotation (+90 degrees clockwise)
  const handleRotatePage = () => {
    setPageRotations((prev) => ({
      ...prev,
      [currentPage]: ((prev[currentPage] || 0) + 90) % 360,
    }));
    showSnackbar(`Page ${currentPage + 1} rotated 90 degrees`, "info");
  };

  // Handle page deletion
  const handleDeletePage = () => {
    const undeleted = Array.from({ length: numPages }, (_, i) => i).filter(
      (idx) => !deletedPages.includes(idx)
    );

    if (undeleted.length <= 1) {
      showSnackbar("Cannot delete all pages in the PDF document.", "error");
      return;
    }

    const nextDeleted = [...deletedPages, currentPage];
    setDeletedPages(nextDeleted);

    // Filter annotations on deleted page
    const nextAnns = annotations.filter((ann) => ann.pageIndex !== currentPage);
    pushToHistory(nextAnns);

    // Move to next available page
    const remaining = undeleted.filter((idx) => idx !== currentPage);
    const nextCurrent =
      remaining.find((idx) => idx > currentPage) ?? remaining[remaining.length - 1];
    setCurrentPage(nextCurrent);
    showSnackbar(`Page ${currentPage + 1} deleted`, "info");
  };

  // Annotation deletion
  const handleDeleteAnnotation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = annotations.filter((a) => a.id !== id);
    pushToHistory(updated);
    if (selectedId === id) setSelectedId(null);
    if (editingTextId === id) setEditingTextId(null);
  };

  // Add signature
  const handleSaveSignature = (dataUrl: string) => {
    const newAnn: PdfAnnotation = {
      id: `ann-${Date.now()}`,
      pageIndex: currentPage,
      type: "draw",
      xPct: 35,
      yPct: 70,
      widthPct: 30,
      heightPct: 15,
      imageDataUrl: dataUrl,
    };
    pushToHistory([...annotations, newAnn]);
    setSelectedId(newAnn.id);
    setActiveTool("select");
    showSnackbar("Signature added to page", "success");
  };

  // Add image stamp
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAnn: PdfAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: currentPage,
        type: "image",
        xPct: 35,
        yPct: 40,
        widthPct: 30,
        heightPct: 20,
        imageDataUrl: dataUrl,
      };
      pushToHistory([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setActiveTool("select");
      showSnackbar("Image inserted", "success");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  function fitTextBox(annotation: PdfAnnotation): PdfAnnotation {
    if (annotation.type !== "text" || !stageDimensions.width || !stageDimensions.height)
      return annotation;
    const context =
      textMeasureRef.current ?? document.createElement("canvas").getContext("2d");
    if (!context) return annotation;
    textMeasureRef.current = context;
    const size = annotation.fontSize || 12;
    const font = textFontStyle(annotation.fontFamily);
    context.font = `${font.fontStyle} ${font.fontWeight} ${size}px ${font.fontFamily}`;
    const lines = (annotation.text || "Click to edit").split("\n");
    const width =
      lines.reduce(
        (longest, line) => Math.max(longest, context.measureText(line).width),
        64
      ) + 4;
    const xPct = Math.min(
      annotation.xPct,
      Math.max(0, 100 - ((68 * scale) / stageDimensions.width) * 100)
    );
    const yPct = Math.min(
      annotation.yPct,
      Math.max(0, 100 - (((size * 1.25 + 4) * scale) / stageDimensions.height) * 100)
    );
    const height = lines.length * size * 1.25 + 4;
    return {
      ...annotation,
      xPct,
      yPct,
      widthPct: Math.min(100 - xPct, ((width * scale) / stageDimensions.width) * 100),
      heightPct: Math.min(100 - yPct, ((height * scale) / stageDimensions.height) * 100),
    };
  }

  // Overlay pointer events for creating or dragging annotations
  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "hand") return;

    if (activeTool === "select") {
      // Clicked blank space deselects
      if (isMobile && editingTextId) pushToHistory(annotations);
      setMobilePanel(null);
      setSelectedId(null);
      setEditingTextId(null);
      return;
    }

    if (activeTool === "text") {
      e.preventDefault();
      const pct = screenToPercent(
        x,
        y,
        180,
        40,
        stageDimensions.width,
        stageDimensions.height
      );
      const newAnn = fitTextBox({
        id: `ann-${Date.now()}`,
        pageIndex: currentPage,
        type: "text",
        xPct: pct.xPct,
        yPct: pct.yPct,
        widthPct: pct.widthPct,
        heightPct: pct.heightPct,
        text: "",
        fontSize,
        fontFamily,
        color: textColor,
      });
      pushToHistory([...annotations, newAnn]);
      setSelectedId(newAnn.id);
      setEditingTextId(newAnn.id);
      setMobileTextDraft("");
      setMobilePanel(null);
      setActiveTool("select");
      return;
    }

    // Shapes & boxes (whiteout, highlight, rectangle, circle)
    isDrawingBox.current = true;
    drawStartCoords.current = { x, y };
    const pct = screenToPercent(
      x,
      y,
      0,
      0,
      stageDimensions.width,
      stageDimensions.height
    );
    setTempBox(pct);
    overlayRef.current.setPointerCapture(e.pointerId);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingBox.current || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const startX = drawStartCoords.current.x;
    const startY = drawStartCoords.current.y;

    const boxX = Math.min(startX, currentX);
    const boxY = Math.min(startY, currentY);
    const boxW = Math.max(15, Math.abs(currentX - startX));
    const boxH = Math.max(10, Math.abs(currentY - startY));

    const pct = screenToPercent(
      boxX,
      boxY,
      boxW,
      boxH,
      stageDimensions.width,
      stageDimensions.height
    );
    setTempBox(pct);
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingBox.current) return;
    isDrawingBox.current = false;
    if (overlayRef.current && overlayRef.current.hasPointerCapture(e.pointerId)) {
      overlayRef.current.releasePointerCapture(e.pointerId);
    }

    if (tempBox && tempBox.widthPct > 1 && tempBox.heightPct > 1) {
      let newAnn: PdfAnnotation | null = null;
      const baseId = `ann-${Date.now()}`;

      switch (activeTool) {
        case "whiteout":
          newAnn = {
            id: baseId,
            pageIndex: currentPage,
            type: "whiteout",
            ...tempBox,
          };
          break;
        case "highlight":
          newAnn = {
            id: baseId,
            pageIndex: currentPage,
            type: "highlight",
            color: highlightColor,
            opacity: 0.35,
            ...tempBox,
          };
          break;
        case "rectangle":
          newAnn = {
            id: baseId,
            pageIndex: currentPage,
            type: "rectangle",
            strokeColor,
            strokeWidth,
            fillColor: "transparent",
            ...tempBox,
          };
          break;
        case "circle":
          newAnn = {
            id: baseId,
            pageIndex: currentPage,
            type: "circle",
            strokeColor,
            strokeWidth,
            fillColor: "transparent",
            ...tempBox,
          };
          break;
      }

      if (newAnn) {
        pushToHistory([...annotations, newAnn]);
        setSelectedId(newAnn.id);
        setActiveTool("select");
      }
    }
    setTempBox(null);
  };

  // Dragging existing annotation
  const startDragAnnotation = (e: React.PointerEvent, ann: PdfAnnotation) => {
    e.stopPropagation();
    setMobilePanel(null);
    setSelectedId(ann.id);
    if (activeTool !== "select") return;

    isDraggingAnnotation.current = true;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      annX: ann.xPct,
      annY: ann.yPct,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const dragAnnotation = (e: React.PointerEvent, ann: PdfAnnotation) => {
    if (!isDraggingAnnotation.current || selectedId !== ann.id) return;
    e.stopPropagation();

    const dxPx = e.clientX - dragStartPos.current.x;
    const dyPx = e.clientY - dragStartPos.current.y;

    const dxPct = (dxPx / stageDimensions.width) * 100;
    const dyPct = (dyPx / stageDimensions.height) * 100;

    const newX = Math.max(
      0,
      Math.min(100 - ann.widthPct, dragStartPos.current.annX + dxPct)
    );
    const newY = Math.max(
      0,
      Math.min(100 - ann.heightPct, dragStartPos.current.annY + dyPct)
    );

    setAnnotations((prev) =>
      prev.map((a) => (a.id === ann.id ? { ...a, xPct: newX, yPct: newY } : a))
    );
  };

  const stopDragAnnotation = (e: React.PointerEvent) => {
    if (!isDraggingAnnotation.current) return;
    isDraggingAnnotation.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    // Record moved state in history
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), annotations]);
    setHistoryIndex((prev) => prev + 1);
  };

  // Export PDF
  const handleExport = async () => {
    if (!pdfBytes || !file) return;
    setIsExporting(true);

    try {
      const exportedBytes = await exportEditedPdf(pdfBytes, {
        annotations,
        pageRotations,
        deletedPages,
      });

      const baseName = sanitizeBaseFilename(file.name);
      const filename = `${baseName}-edited.pdf`;
      const blob = new Blob([new Uint8Array(exportedBytes)], { type: "application/pdf" });

      downloadBlob(blob, filename);
      showSnackbar(
        `Saved ${filename} successfully (${formatFileSize(exportedBytes.length)})`,
        "success"
      );
    } catch {
      showSnackbar("Failed to export edited PDF. Please check your document.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset document
  const handleReset = () => {
    setExpanded(false);
    setFitToWidth(true);
    setMobilePanel(null);
    setFile(null);
    setPdfBytes(null);
    setPdfDocProxy(null);
    setNumPages(0);
    setCurrentPage(0);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setEditingTextId(null);
  };

  // Selected annotation helper
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  // Update selected annotation properties
  const updateSelectedProperty = (patch: Partial<PdfAnnotation>) => {
    if (!selectedId) return;
    const updated = annotations.map((a) =>
      a.id === selectedId ? fitTextBox({ ...a, ...patch }) : a
    );
    pushToHistory(updated);
  };

  const hasToolSettings = ["text", "highlight", "rectangle", "circle"].includes(
    selectedAnnotation?.type || activeTool
  );
  const editingAnnotation = annotations.find((ann) => ann.id === editingTextId);
  const chooseTool = (value: EditorToolMode) => {
    setActiveTool(value);
    setSelectedId(null);
    setEditingTextId(null);
    setMobilePanel(null);
  };
  const finishMobileText = () => {
    pushToHistory(annotations);
    setEditingTextId(null);
  };
  const availablePages = Array.from({ length: numPages }, (_, index) => index).filter(
    (index) => !deletedPages.includes(index)
  );
  const visiblePageIndex = availablePages.indexOf(currentPage);
  const visiblePagesCount = availablePages.length;

  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <Snackbar
        snackbar={snackbar}
        onDismiss={dismissSnackbar}
        className={isMobile && expanded ? styles.mobileSnackbar : undefined}
      />
      <ToolHeader title="PDF Editor" icon={<FilePenLine size={24} />} />

      {!file ? (
        <DropArea
          variant="stacked"
          accept=".pdf,application/pdf"
          label="Add PDF file"
          title="Edit and Annotate PDF"
          description="Drop your PDF here to add text, highlight, whiteout, draw signatures, or insert images."
          hint="PDF only - Up to 50 MB - 100% On-device Processing"
          buttonLabel="Choose PDF File"
          onFiles={handleFiles}
        />
      ) : (
        <div
          ref={editorRef}
          data-editing-text={(isMobile && !!editingAnnotation) || undefined}
          className={`${styles.editorLayout} ${expanded ? styles.expanded : ""}`}
          aria-label="PDF editing workspace"
        >
          {/* =============================================================== */}
          {/* LEFT COLUMN: Main Document Canvas Viewport & Navigation         */}
          {/* =============================================================== */}
          <div className={styles.canvasColumn}>
            {/* Canvas Header: Metadata, Undo/Redo, Zoom, Mobile Export */}
            <div className={styles.canvasHeader}>
              <div className={styles.fileMeta}>
                <span className={styles.fileName} title={file.name}>
                  {file.name}
                </span>
                <span className={styles.fileBadge}>{formatFileSize(file.size)}</span>
                <span className={styles.fileBadge}>
                  {visiblePagesCount} {visiblePagesCount === 1 ? "page" : "pages"}
                </span>
              </div>

              <div className={styles.mobileHeaderActions} data-pdf-view-control>
                <ActionButton
                  iconOnly
                  variant="ghost"
                  aria-label="Undo action"
                  disabled={historyIndex <= 0}
                  onClick={handleUndo}
                >
                  <Undo2 size={18} />
                </ActionButton>
                <ActionButton
                  iconOnly
                  variant="ghost"
                  aria-label="View and history"
                  aria-expanded={mobilePanel === "view"}
                  aria-controls="pdf-editor-view"
                  active={mobilePanel === "view"}
                  onClick={(event) => {
                    panelTriggerRef.current = event.currentTarget;
                    setMobilePanel((panel) => (panel === "view" ? null : "view"));
                  }}
                >
                  <SlidersHorizontal size={18} />
                </ActionButton>
              </div>
              <div
                id="pdf-editor-view"
                className={styles.canvasActions}
                data-open={mobilePanel === "view" || undefined}
                data-pdf-view-control
              >
                <div className={styles.mobileViewHeader}>
                  <span>View & history</span>
                  <ActionButton
                    iconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Close view controls"
                    onClick={() => {
                      setMobilePanel(null);
                      panelTriggerRef.current?.focus();
                    }}
                  >
                    <X size={18} />
                  </ActionButton>
                </div>
                <div className={styles.historyGroup}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo action"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo action"
                  >
                    <Redo2 size={15} />
                    <span className={styles.mobileControlLabel}>Redo</span>
                  </button>
                </div>

                <div className={styles.zoomGroup}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => {
                      setFitToWidth(false);
                      setScale((s) => Math.max(0.25, s - 0.25));
                    }}
                    title="Zoom Out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span className={styles.zoomIndicator}>{Math.round(scale * 100)}%</span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => {
                      setFitToWidth(false);
                      setScale((s) => Math.min(2.5, s + 0.25));
                    }}
                    title="Zoom In"
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <ActionButton
                  size="sm"
                  className={styles.fitWidthAction}
                  aria-label="Fit width"
                  onClick={() => setFitToWidth(true)}
                  active={fitToWidth}
                >
                  <ScanLine size={15} aria-hidden="true" />
                  <span className={styles.fitWidthLabel}>Fit width</span>
                </ActionButton>
                <button
                  ref={expandButtonRef}
                  type="button"
                  className={styles.iconBtn}
                  aria-label={expanded ? "Exit expanded editor" : "Expand editor"}
                  title={expanded ? "Exit expanded editor (Escape)" : "Expand editor"}
                  aria-pressed={expanded}
                  onClick={() => {
                    setMobilePanel(null);
                    setExpanded((value) => !value);
                  }}
                >
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span className={styles.mobileControlLabel}>
                    {expanded ? "Exit full screen" : "Full screen"}
                  </span>
                </button>
              </div>
              {/* Mobile Export button (visible only on <= 960px) */}
              <div className={styles.mobileExportBtn}>
                <ActionButton
                  variant="primary"
                  loading={isExporting}
                  onClick={handleExport}
                >
                  <Download size={14} />
                  Export
                </ActionButton>
              </div>
            </div>

            {/* Interactive Viewport */}
            <div
              ref={viewportRef}
              className={`${styles.viewport} ${activeTool === "hand" ? styles.panViewport : ""}`}
              tabIndex={0}
              role="region"
              aria-label="PDF page canvas"
              onPointerDownCapture={(event) => {
                if (mobilePanel === "view") setMobilePanel(null);
                if (activeTool !== "hand" || event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                const viewport = event.currentTarget;
                panStart.current = {
                  x: event.clientX,
                  y: event.clientY,
                  left: viewport.scrollLeft,
                  top: viewport.scrollTop,
                };
                viewport.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const start = panStart.current;
                if (!start) return;
                event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
                event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
              }}
              onPointerUp={(event) => {
                panStart.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                panStart.current = null;
              }}
            >
              <div
                className={styles.pageStage}
                style={{
                  width: stageDimensions.width ? `${stageDimensions.width}px` : "auto",
                  height: stageDimensions.height ? `${stageDimensions.height}px` : "auto",
                }}
              >
                {/* PDF.js canvas */}
                <canvas ref={canvasRef} className={styles.pdfCanvas} />

                {/* Interactive Annotations Overlay */}
                <div
                  ref={overlayRef}
                  className={styles.annotationOverlay}
                  style={{
                    touchAction: [
                      "whiteout",
                      "highlight",
                      "rectangle",
                      "circle",
                    ].includes(activeTool)
                      ? "none"
                      : undefined,
                    cursor:
                      activeTool === "hand"
                        ? "grab"
                        : activeTool === "select"
                          ? "default"
                          : activeTool === "text"
                            ? "text"
                            : "crosshair",
                  }}
                  onPointerDown={handleOverlayPointerDown}
                  onPointerMove={handleOverlayPointerMove}
                  onPointerUp={handleOverlayPointerUp}
                  onPointerCancel={() => {
                    isDrawingBox.current = false;
                    setTempBox(null);
                  }}
                >
                  {/* Temporary preview box while dragging */}
                  {tempBox && (
                    <div
                      className={styles.annotationBox}
                      style={{
                        left: `${tempBox.xPct}%`,
                        top: `${tempBox.yPct}%`,
                        width: `${tempBox.widthPct}%`,
                        height: `${tempBox.heightPct}%`,
                        border: "2px dashed #2563eb",
                        backgroundColor:
                          activeTool === "whiteout"
                            ? "#ffffff"
                            : activeTool === "highlight"
                              ? `${highlightColor}55`
                              : "transparent",
                      }}
                    />
                  )}

                  {/* Rendered Annotations for current page */}
                  {annotations
                    .filter((ann) => ann.pageIndex === currentPage)
                    .map((ann) => {
                      const isSelected = selectedId === ann.id;
                      const isEditing = editingTextId === ann.id;

                      return (
                        <div
                          key={ann.id}
                          data-annotation-selected={isSelected || undefined}
                          className={`${styles.annotationBox} ${isSelected ? styles.annotationBoxSelected : ""}`}
                          style={{
                            touchAction: "none",
                            left: `${ann.xPct}%`,
                            top: `${ann.yPct}%`,
                            width: `${ann.widthPct}%`,
                            height: `${ann.heightPct}%`,
                          }}
                          onPointerDown={(e) => startDragAnnotation(e, ann)}
                          onPointerMove={(e) => dragAnnotation(e, ann)}
                          onPointerUp={(e) => stopDragAnnotation(e)}
                          onPointerCancel={(e) => stopDragAnnotation(e)}
                        >
                          {isSelected && (
                            <button
                              type="button"
                              className={styles.deleteBadge}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => handleDeleteAnnotation(ann.id, e)}
                              title="Delete Annotation"
                              aria-label="Delete annotation"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          )}

                          {isSelected && (
                            <AnnotationResizeHandles
                              annotation={ann}
                              dimensions={stageDimensions}
                              onStart={() => setEditingTextId(null)}
                              onPreview={(resized) =>
                                setAnnotations((prev) =>
                                  prev.map((item) =>
                                    item.id === ann.id ? resized : item
                                  )
                                )
                              }
                              onCommit={(resized) =>
                                pushToHistory(
                                  annotations.map((item) =>
                                    item.id === ann.id ? resized : item
                                  )
                                )
                              }
                            />
                          )}

                          {ann.type === "whiteout" && (
                            <div className={styles.whiteoutAnnotation} />
                          )}

                          {ann.type === "highlight" && (
                            <div
                              className={styles.highlightAnnotation}
                              style={{
                                backgroundColor: ann.color || "#fde047",
                                opacity: ann.opacity ?? 0.35,
                              }}
                            />
                          )}

                          {ann.type === "text" && (
                            <>
                              {isEditing && !isMobile ? (
                                <textarea
                                  autoFocus
                                  className={styles.textInputInline}
                                  aria-label="Annotation text"
                                  placeholder="Click to edit"
                                  rows={1}
                                  wrap="off"
                                  value={ann.text || ""}
                                  style={{
                                    fontSize: `${(ann.fontSize || 12) * scale}px`,
                                    ...textFontStyle(ann.fontFamily),
                                    color: ann.color || "#000000",
                                  }}
                                  onChange={(e) => {
                                    const textVal = e.target.value;
                                    const resized = fitTextBox({ ...ann, text: textVal });
                                    setAnnotations((prev) =>
                                      prev.map((a) => (a.id === ann.id ? resized : a))
                                    );
                                  }}
                                  onBlur={() => {
                                    setEditingTextId(null);
                                    pushToHistory(annotations);
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div
                                  className={styles.textAnnotation}
                                  style={{
                                    fontSize: `${(ann.fontSize || 12) * scale}px`,
                                    ...textFontStyle(ann.fontFamily),
                                    color: ann.color || "#000000",
                                  }}
                                  onDoubleClick={() => {
                                    setMobileTextDraft(ann.text || "");
                                    setEditingTextId(ann.id);
                                    setMobilePanel(null);
                                  }}
                                >
                                  {ann.text || "Click to edit"}
                                </div>
                              )}
                            </>
                          )}

                          {ann.type === "rectangle" && (
                            <div
                              className={styles.shapeAnnotation}
                              style={{
                                border: `${ann.strokeWidth || 2}px solid ${ann.strokeColor || "#2563eb"}`,
                                backgroundColor:
                                  ann.fillColor && ann.fillColor !== "transparent"
                                    ? ann.fillColor
                                    : "transparent",
                              }}
                            />
                          )}

                          {ann.type === "circle" && (
                            <div
                              className={styles.shapeAnnotation}
                              style={{
                                borderRadius: "50%",
                                border: `${ann.strokeWidth || 2}px solid ${ann.strokeColor || "#2563eb"}`,
                                backgroundColor:
                                  ann.fillColor && ann.fillColor !== "transparent"
                                    ? ann.fillColor
                                    : "transparent",
                              }}
                            />
                          )}

                          {(ann.type === "draw" || ann.type === "image") &&
                            ann.imageDataUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ann.imageDataUrl}
                                alt="PDF Annotation"
                                className={styles.imageAnnotation}
                              />
                            )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Canvas Footer: Page Navigator, Rotate, Delete Page */}
            <div className={styles.canvasFooter}>
              <div className={styles.pageNavControls}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => {
                    setCurrentPage(availablePages[visiblePageIndex - 1]);
                    setSelectedId(null);
                    setMobilePanel(null);
                  }}
                  disabled={visiblePageIndex <= 0}
                  title="Previous Page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.pageIndicator}>
                  Page {visiblePageIndex + 1} of {visiblePagesCount}
                </span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => {
                    setCurrentPage(availablePages[visiblePageIndex + 1]);
                    setSelectedId(null);
                    setMobilePanel(null);
                  }}
                  disabled={visiblePageIndex >= visiblePagesCount - 1}
                  title="Next Page"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className={styles.pageActionControls}>
                <button
                  type="button"
                  className={styles.actionTextBtn}
                  onClick={handleRotatePage}
                  title="Rotate Current Page 90° Clockwise"
                >
                  <RotateCw size={14} />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  className={`${styles.actionTextBtn} ${styles.actionTextBtnDanger}`}
                  onClick={handleDeletePage}
                  title="Delete Current Page"
                >
                  <Trash2 size={14} />
                  <span>Delete Page</span>
                </button>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: Sidebar Controls (Desktop) / Action Panel (Mobile) */}
          {/* =============================================================== */}
          <aside className={styles.controlsSidebar} aria-label="Editor controls">
            {/* Desktop Action Buttons: Export & Reset */}
            <div className={`${styles.sidebarCard} ${styles.sidebarDesktopActions}`}>
              <ActionButton
                variant="primary"
                loading={isExporting}
                onClick={handleExport}
                className={styles.fullWidthAction}
              >
                <Download size={16} />
                Export PDF
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={handleReset}
                className={styles.fullWidthAction}
              >
                <RotateCcw size={15} />
                Change File
              </ActionButton>
            </div>

            {/* Reuse the desktop tools as the mobile overflow panel. */}
            <div
              id="pdf-editor-tools"
              className={`${styles.sidebarCard} ${styles.mobileToolPanel}`}
              data-open={mobilePanel === "tools" || undefined}
            >
              <div className={styles.mobilePanelHeader}>
                <h3>All tools</h3>
                <ActionButton
                  iconOnly
                  size="sm"
                  aria-label="Close tools"
                  onClick={() => {
                    setMobilePanel(null);
                    panelTriggerRef.current?.focus();
                  }}
                >
                  <X size={18} />
                </ActionButton>
              </div>
              <div className={styles.cardHeader}>
                <h3 className={styles.sectionTitle}>Annotation Tools</h3>
              </div>

              <div className={styles.toolGrid} role="group" aria-label="Annotation tools">
                {ANNOTATION_TOOLS.map(({ value, label, icon: Icon, hint }) => (
                  <ActionButton
                    key={value}
                    size="sm"
                    iconOnly
                    aria-label={label}
                    tooltip={`${label} - ${hint}`}
                    active={activeTool === value}
                    aria-pressed={activeTool === value}
                    className={styles.toolAction}
                    onClick={() => chooseTool(value)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className={styles.mobileToolLabel}>{label}</span>
                  </ActionButton>
                ))}
                <ActionButton
                  size="sm"
                  iconOnly
                  aria-label="Sign"
                  tooltip="Draw signature"
                  className={styles.toolAction}
                  onClick={() => {
                    setMobilePanel(null);
                    setIsSignatureModalOpen(true);
                  }}
                >
                  <PenTool size={18} aria-hidden="true" />
                  <span className={styles.mobileToolLabel}>Sign</span>
                </ActionButton>
                <ActionButton
                  size="sm"
                  iconOnly
                  aria-label="Image"
                  tooltip="Insert image"
                  className={styles.toolAction}
                  onClick={() => {
                    setMobilePanel(null);
                    imageInputRef.current?.click();
                  }}
                >
                  <ImageIcon size={18} aria-hidden="true" />
                  <span className={styles.mobileToolLabel}>Image</span>
                </ActionButton>
              </div>
              <p className={styles.toolHint}>
                {ANNOTATION_TOOLS.find((tool) => tool.value === activeTool)?.hint}
              </p>

              <div className={styles.mobileDocumentActions}>
                <ActionButton
                  onClick={() => {
                    handleRotatePage();
                    setMobilePanel(null);
                  }}
                >
                  <RotateCw size={16} /> Rotate page
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => {
                    handleDeletePage();
                    setMobilePanel(null);
                  }}
                >
                  <Trash2 size={16} /> Delete page
                </ActionButton>
                <ActionButton onClick={handleReset}>
                  <RotateCcw size={16} /> Change file
                </ActionButton>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleImageUpload}
              />
            </div>

            {/* Contextual Properties (Text, Highlight, Shapes, or Selected Element) */}
            {(activeTool === "text" ||
              activeTool === "highlight" ||
              activeTool === "rectangle" ||
              activeTool === "circle" ||
              selectedAnnotation) && (
              <div
                id="pdf-editor-settings"
                className={`${styles.sidebarCard} ${styles.mobileSettingsPanel}`}
                data-open={mobilePanel === "settings" || undefined}
              >
                <div className={styles.mobilePanelHeader}>
                  <h3>
                    {selectedAnnotation
                      ? `${selectedAnnotation.type} settings`
                      : "Tool settings"}
                  </h3>
                  <ActionButton
                    iconOnly
                    size="sm"
                    aria-label="Close settings"
                    onClick={() => {
                      setMobilePanel(null);
                      panelTriggerRef.current?.focus();
                    }}
                  >
                    <X size={18} />
                  </ActionButton>
                </div>
                {selectedAnnotation ? (
                  <div className={styles.selectedElementBanner}>
                    <span className={styles.selectedElementTitle}>
                      Selected: {selectedAnnotation.type}
                    </span>
                    <ActionButton
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
                    >
                      <Trash2 size={12} />
                      Delete
                    </ActionButton>
                  </div>
                ) : (
                  <div className={styles.cardHeader}>
                    <h3 className={styles.sectionTitle}>Tool Settings</h3>
                  </div>
                )}

                {/* Text Tool Settings */}
                {(activeTool === "text" || selectedAnnotation?.type === "text") && (
                  <>
                    <div className={styles.propertyRow}>
                      <CustomSelect
                        label="Font Family"
                        layout="stacked"
                        value={selectedAnnotation?.fontFamily || fontFamily}
                        options={FONT_OPTIONS}
                        onChange={(value) => {
                          const family = value as NonNullable<
                            PdfAnnotation["fontFamily"]
                          >;
                          setFontFamily(family);
                          if (selectedAnnotation)
                            updateSelectedProperty({ fontFamily: family });
                        }}
                      />
                    </div>

                    <div className={styles.propertyRow}>
                      <CustomSelect
                        label="Font Size"
                        layout="stacked"
                        value={String(selectedAnnotation?.fontSize || fontSize)}
                        options={[
                          ...new Set([
                            ...FONT_SIZES,
                            selectedAnnotation?.fontSize || fontSize,
                          ]),
                        ]
                          .sort((a, b) => a - b)
                          .map((size) => ({
                            value: String(size),
                            label: `${Number(size.toFixed(1))} pt`,
                          }))}
                        onChange={(value) => {
                          const size = Number(value);
                          setFontSize(size);
                          if (selectedAnnotation)
                            updateSelectedProperty({ fontSize: size });
                        }}
                      />
                    </div>

                    <div className={styles.propertyRow}>
                      <label className={styles.propertyLabel}>Text Color</label>
                      <div className={styles.colorPickerGroup}>
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            className={`${styles.colorSwatch} ${(selectedAnnotation?.color || textColor) === c.value ? styles.colorSwatchSelected : ""}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => {
                              setTextColor(c.value);
                              if (selectedAnnotation)
                                updateSelectedProperty({ color: c.value });
                            }}
                            title={c.label}
                            aria-label={`Select ${c.label} text color`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Highlight Tool Settings */}
                {(activeTool === "highlight" ||
                  selectedAnnotation?.type === "highlight") && (
                  <div className={styles.propertyRow}>
                    <label className={styles.propertyLabel}>Highlight Color</label>
                    <div className={styles.colorPickerGroup}>
                      {HIGHLIGHT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          className={`${styles.colorSwatch} ${(selectedAnnotation?.color || highlightColor) === c.value ? styles.colorSwatchSelected : ""}`}
                          style={{ backgroundColor: c.value }}
                          onClick={() => {
                            setHighlightColor(c.value);
                            if (selectedAnnotation)
                              updateSelectedProperty({ color: c.value });
                          }}
                          title={c.label}
                          aria-label={`Select ${c.label} highlight`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Shape Tool Settings (Rectangle / Circle) */}
                {(activeTool === "rectangle" ||
                  activeTool === "circle" ||
                  selectedAnnotation?.type === "rectangle" ||
                  selectedAnnotation?.type === "circle") && (
                  <>
                    <div className={styles.propertyRow}>
                      <label className={styles.propertyLabel}>Border Color</label>
                      <div className={styles.colorPickerGroup}>
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            className={`${styles.colorSwatch} ${(selectedAnnotation?.strokeColor || strokeColor) === c.value ? styles.colorSwatchSelected : ""}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => {
                              setStrokeColor(c.value);
                              if (selectedAnnotation)
                                updateSelectedProperty({ strokeColor: c.value });
                            }}
                            title={c.label}
                            aria-label={`Select border color ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.propertyRow}>
                      <CustomSelect
                        label="Thickness"
                        layout="stacked"
                        value={String(selectedAnnotation?.strokeWidth || strokeWidth)}
                        options={[1, 2, 4, 6].map((width) => ({
                          value: String(width),
                          label: `${width} px`,
                        }))}
                        onChange={(value) => {
                          const width = Number(value);
                          setStrokeWidth(width);
                          if (selectedAnnotation)
                            updateSelectedProperty({ strokeWidth: width });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {isMobile && editingAnnotation?.type === "text" ? (
              <div className={styles.mobileTextEditor}>
                <div className={styles.mobileTextHeader}>
                  <label htmlFor="mobile-annotation-text">Edit text</label>
                  <ActionButton size="sm" variant="primary" onClick={finishMobileText}>
                    <Check size={16} /> Done
                  </ActionButton>
                </div>
                <textarea
                  id="mobile-annotation-text"
                  aria-label="Annotation text"
                  autoFocus
                  rows={2}
                  value={mobileTextDraft}
                  onChange={(event) => {
                    setMobileTextDraft(event.target.value);
                    const updated = fitTextBox({
                      ...editingAnnotation,
                      text: event.target.value,
                    });
                    setAnnotations((prev) =>
                      prev.map((ann) => (ann.id === updated.id ? updated : ann))
                    );
                  }}
                  placeholder="Enter your text"
                />
              </div>
            ) : (
              <div className={styles.mobileDock}>
                {(hasToolSettings || selectedAnnotation) && (
                  <div className={styles.mobileContextBar}>
                    <span>
                      {selectedAnnotation
                        ? `Selected: ${selectedAnnotation.type}`
                        : `${activeTool} tool`}
                    </span>
                    {selectedAnnotation?.type === "text" && (
                      <ActionButton
                        size="sm"
                        iconOnly
                        aria-label="Edit selected text"
                        onClick={() => {
                          setMobileTextDraft(selectedAnnotation.text || "");
                          setEditingTextId(selectedAnnotation.id);
                          setMobilePanel(null);
                        }}
                      >
                        <Pencil size={17} />
                      </ActionButton>
                    )}
                    {hasToolSettings && (
                      <ActionButton
                        size="sm"
                        aria-label="Element settings"
                        active={mobilePanel === "settings"}
                        aria-expanded={mobilePanel === "settings"}
                        aria-controls="pdf-editor-settings"
                        onClick={(event) => {
                          panelTriggerRef.current = event.currentTarget;
                          setMobilePanel((panel) =>
                            panel === "settings" ? null : "settings"
                          );
                        }}
                      >
                        <SlidersHorizontal size={16} /> Style
                      </ActionButton>
                    )}
                    {selectedAnnotation && (
                      <ActionButton
                        size="sm"
                        iconOnly
                        variant="danger"
                        aria-label="Delete selected element"
                        onClick={() => {
                          handleDeleteAnnotation(selectedAnnotation.id);
                          setMobilePanel(null);
                        }}
                      >
                        <Trash2 size={17} />
                      </ActionButton>
                    )}
                  </div>
                )}
                <div
                  className={styles.mobilePrimaryTools}
                  role="group"
                  aria-label="Quick editing tools"
                >
                  {ANNOTATION_TOOLS.filter((tool) =>
                    ["hand", "select", "text"].includes(tool.value)
                  ).map(({ value, label, icon: Icon }) => (
                    <ActionButton
                      key={value}
                      iconOnly
                      tooltip={false}
                      aria-label={label}
                      active={activeTool === value}
                      aria-pressed={activeTool === value}
                      onClick={() => chooseTool(value)}
                    >
                      <Icon size={21} />
                      <span>{label === "Hand" ? "Move" : label}</span>
                    </ActionButton>
                  ))}
                  <ActionButton
                    iconOnly
                    tooltip={false}
                    aria-label="Sign"
                    onClick={() => {
                      setMobilePanel(null);
                      setIsSignatureModalOpen(true);
                    }}
                  >
                    <PenTool size={21} />
                    <span>Sign</span>
                  </ActionButton>
                  <ActionButton
                    iconOnly
                    tooltip={false}
                    aria-label="More tools"
                    aria-expanded={mobilePanel === "tools"}
                    aria-controls="pdf-editor-tools"
                    active={mobilePanel === "tools"}
                    onClick={(event) => {
                      panelTriggerRef.current = event.currentTarget;
                      setMobilePanel((panel) => (panel === "tools" ? null : "tools"));
                    }}
                  >
                    <MoreHorizontal size={21} />
                    <span>More</span>
                  </ActionButton>
                </div>
                <p className={styles.mobileHint}>
                  {selectedAnnotation
                    ? "Drag to move. Pull a corner to resize."
                    : activeTool === "hand"
                      ? "Drag the page to move around."
                      : activeTool === "text"
                        ? "Tap the page to add text."
                        : activeTool === "select"
                          ? "Tap an element to edit it."
                          : "Drag on the page to draw."}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveSignature}
      />
    </div>
  );
}
