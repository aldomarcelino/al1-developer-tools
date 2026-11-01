"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import {
  type PageSettings,
  renderDocxToElement,
} from "../lib/word-to-pdf";
import styles from "../word-to-pdf.module.css";

interface DocumentPreviewProps {
  arrayBuffer: ArrayBuffer | null;
  settings: PageSettings;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: (pageCount: number) => void;
  onError?: (error: string) => void;
}

export function DocumentPreview({
  arrayBuffer,
  settings,
  containerRef,
  onReady,
  onError,
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!arrayBuffer) return;

    let canceled = false;
    setLoading(true);

    async function parseAndRender() {
      try {
        if (!mountRef.current || !arrayBuffer) return;
        await renderDocxToElement(arrayBuffer, mountRef.current);
        if (canceled) return;

        // Detect number of section elements
        const sections = mountRef.current.querySelectorAll("section.docx");
        const count = Math.max(1, sections.length);
        setPageCount(count);
        onReady?.(count);
      } catch (cause) {
        if (canceled) return;
        const msg =
          cause instanceof Error ? cause.message : "Failed to parse Word document.";
        onError?.(msg);
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    void parseAndRender();

    return () => {
      canceled = true;
    };
  }, [arrayBuffer, onReady, onError]);

  return (
    <div className={styles.previewSection}>
      <div className={styles.previewHeader}>
        <div className={styles.previewTitle}>
          <FileText size={18} />
          <span>Document Preview</span>
          {pageCount > 0 && (
            <span className={styles.previewBadge}>
              {pageCount} {pageCount === 1 ? "Section" : "Sections"}
            </span>
          )}
        </div>
      </div>

      <div className={styles.previewViewport}>
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            <LoaderCircle size={20} className="animate-spin" />
            <span>Parsing and rendering Word document...</span>
          </div>
        )}

        <div
          ref={(node) => {
            mountRef.current = node;
            if (containerRef) {
              containerRef.current = node;
            }
          }}
          className={styles.previewPaper}
          data-page-size={settings.pageSize}
          data-orientation={settings.orientation}
          data-margin={settings.margin}
          style={{ display: loading ? "none" : "flex" }}
        />
      </div>
    </div>
  );
}
