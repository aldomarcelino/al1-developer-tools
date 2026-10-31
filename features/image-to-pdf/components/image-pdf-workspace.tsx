"use client";
import { useState } from "react";
import { FileImage, Upload, Download, Trash2 } from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { downloadBlob } from "@/lib/browser/download";
import { usePdfImages } from "../hooks/use-pdf-images";
import type { PageOptions } from "../lib/image-pdf";
import { PdfImageList } from "./pdf-image-list";
import styles from "@/styles/shared/toolkit.module.css";
import local from "../styles.module.css";

export function ImagePdfWorkspace() {
  const queue = usePdfImages();
  const [options, setOptions] = useState<PageOptions>({
    size: "a4",
    orientation: "auto",
    margin: 24,
  });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = queue.loading || exporting;
  async function exportPdf() {
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const { createImagePdf } = await import("../lib/image-pdf");
      const bytes = await createImagePdf(queue.images, options);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "images.pdf");
      setNotice(
        `Downloaded a PDF with ${queue.images.length} page(s) in the displayed order.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create this PDF.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader title="Image to PDF" icon={<FileImage size={24} />} />
      <DropArea
        variant="stacked"
        label="Add images to PDF"
        title="Turn your images into one PDF"
        description="Drop JPG or PNG images here. One image per page, in your chosen order."
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        multiple
        buttonLabel="Add images"
        buttonIcon={<Upload size={15} />}
        loading={queue.loading}
        disabled={exporting}
        onFiles={(files) => {
          setError("");
          setNotice("");
          void queue.add(files);
        }}
      />
      <p className={`${styles.hint} ${styles.section}`}>
        Up to 20 images · 10 MB each · 50 MB total · 16 megapixels per image / 64
        megapixels total. Images are re-encoded locally to respect orientation and remove
        metadata. No uploads.
      </p>
      <section
        className={`${styles.panel} ${styles.section} ${local.settings}`}
        aria-label="PDF settings"
      >
        <div className={local.settingsHeading}>
          <h2>Page settings</h2>
          <p className={styles.hint}>Choose how your images appear on each page.</p>
        </div>
        <div className={local.settingsGrid}>
          <div className={local.settingField}>
            <CustomSelect
              layout="stacked"
              label="Page size"
              value={options.size}
              disabled={busy}
              onChange={(value) =>
                setOptions((prev) => ({ ...prev, size: value as PageOptions["size"] }))
              }
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "US Letter" },
                { value: "image", label: "Fit image (96 px/in)" },
              ]}
            />
            <p className={styles.hint}>
              {options.size === "image"
                ? "Matches each image’s proportions at 96 px/in."
                : options.size === "a4"
                  ? "210 × 297 mm · Standard document size."
                  : "8.5 × 11 in · US document size."}
            </p>
          </div>
          <div className={local.settingField}>
            <CustomSelect
              layout="stacked"
              label="Orientation"
              value={options.orientation}
              disabled={busy || options.size === "image"}
              onChange={(value) =>
                setOptions((prev) => ({
                  ...prev,
                  orientation: value as PageOptions["orientation"],
                }))
              }
              options={[
                { value: "auto", label: "Auto per image" },
                { value: "portrait", label: "Portrait" },
                { value: "landscape", label: "Landscape" },
              ]}
            />
            <p className={styles.hint}>
              {options.size === "image"
                ? "Determined by the image’s proportions."
                : "Auto chooses portrait or landscape for each image."}
            </p>
          </div>
          <div className={local.settingField}>
            <CustomSelect
              layout="stacked"
              label="Margin"
              value={String(options.margin)}
              disabled={busy}
              onChange={(value) =>
                setOptions((prev) => ({ ...prev, margin: Number(value) }))
              }
              options={[
                { value: "0", label: "None" },
                { value: "12", label: "Small · 12 pt" },
                { value: "24", label: "Normal · 24 pt" },
                { value: "36", label: "Wide · 36 pt" },
              ]}
            />
            <p className={styles.hint}>White space around the image on each page.</p>
          </div>
        </div>
        <div className={local.settingsFooter}>
          <p className={styles.hint}>
            Images fit without cropping or stretching, on a white background.
          </p>
          <div className={local.settingsActions}>
            <ActionButton
              variant="primary"
              loading={exporting}
              disabled={!queue.images.length || queue.loading}
              onClick={exportPdf}
            >
              <Download size={15} /> Download PDF ({queue.images.length} pages)
            </ActionButton>
            <ActionButton
              variant="danger"
              disabled={busy || !queue.images.length}
              onClick={() => {
                queue.clear();
                setError("");
                setNotice("");
              }}
            >
              <Trash2 size={15} /> Clear images
            </ActionButton>
          </div>
        </div>
      </section>
      <PdfImageList
        images={queue.images}
        disabled={busy}
        move={queue.move}
        remove={queue.remove}
      />
      {error && (
        <p className={`${styles.notice} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      <p className={styles.notice} role="status">
        {notice ||
          queue.notice ||
          "Add images to get started. Use the arrow buttons to arrange PDF pages."}
      </p>
    </div>
  );
}
