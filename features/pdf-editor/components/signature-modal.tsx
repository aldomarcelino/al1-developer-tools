"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Eraser, Check } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import styles from "../styles.module.css";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

const PEN_COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#1e3a8a", label: "Navy Blue" },
  { value: "#b91c1c", label: "Dark Red" },
] as const;

const STROKE_WIDTHS = [
  { value: 2, label: "Fine" },
  { value: 3.5, label: "Medium" },
  { value: 5, label: "Thick" },
] as const;

export function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const hasStrokes = useRef(false);
  const [penColor, setPenColor] = useState<string>("#000000");
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    // Initialize canvas on open
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
    hasStrokes.current = false;
    setErrorMessage("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previousFocus?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)"
      );
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    isDrawing.current = true;
    hasStrokes.current = true;
    setErrorMessage("");
    canvas.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    hasStrokes.current = false;
    setErrorMessage("");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes.current) {
      setErrorMessage("Please draw your signature before adding.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crop signature to bounding box
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alphaIndex = (y * w + x) * 4 + 3;
        if (data[alphaIndex] > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      setErrorMessage("Canvas is empty. Draw a signature first.");
      return;
    }

    const padding = 12 * dpr;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(w - cropX, maxX - minX + padding * 2);
    const cropH = Math.min(h - cropY, maxY - minY + padding * 2);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");

    if (!cropCtx) {
      onSave(canvas.toDataURL("image/png"));
      onClose();
      return;
    }

    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dataUrl = cropCanvas.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
    >
      <div ref={dialogRef} className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <h3 id="signature-modal-title">Draw Signature</h3>
            <p>Draw your signature with your finger, stylus, or mouse pointer.</p>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            title="Close modal"
            aria-label="Close signature dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.signatureToolbar}>
            <div className={styles.signatureOptionGroup}>
              <span className={styles.optionLabel}>Pen Color:</span>
              <div className={styles.colorPills}>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`${styles.colorPill} ${penColor === c.value ? styles.colorPillActive : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setPenColor(c.value)}
                    title={c.label}
                    aria-label={`Select color ${c.label}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.signatureOptionGroup}>
              <span className={styles.optionLabel}>Thickness:</span>
              <div className={styles.widthButtons}>
                {STROKE_WIDTHS.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    className={`${styles.smallTabBtn} ${strokeWidth === sw.value ? styles.tabBtnActive : ""}`}
                    onClick={() => setStrokeWidth(sw.value)}
                  >
                    {sw.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear canvas"
            >
              <Eraser size={14} />
              Clear
            </button>
          </div>

          <div className={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              aria-label="Signature drawing area"
              className={styles.signatureCanvas}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
            />
            <div className={styles.signatureGuideLine}>
              <span>Sign above this line</span>
            </div>
          </div>

          {errorMessage && <p className={styles.modalError}>{errorMessage}</p>}
        </div>

        <div className={styles.modalFooter}>
          <ActionButton variant="secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton variant="primary" onClick={handleSave}>
            <Check size={16} />
            Apply Signature
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
