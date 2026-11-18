import { downloadBlob } from "@/lib/browser/download";
import { sanitizeMarkdownFilename } from "./markdown";

function canvasToJpegBuffer(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Failed to export canvas to JPEG image."));
          return;
        }
        const arrayBuf = await blob.arrayBuffer();
        resolve(new Uint8Array(arrayBuf));
      },
      "image/jpeg",
      0.96
    );
  });
}

/**
 * Exports rendered Markdown HTML to an A4 PDF document client-side using html2canvas & pdf-lib.
 */
export async function exportMarkdownToPdf(
  renderedHtml: string,
  rawFilename: string
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const { PDFDocument, rgb } = await import("pdf-lib");

  const cleanFilename = sanitizeMarkdownFilename(rawFilename);

  // Create temporary off-screen container with crisp, professional document styling
  const container = document.createElement("div");
  container.className = "markdown-pdf-render-root";
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    width: 794px; /* Standard A4 width at 96 DPI */
    min-height: 1123px; /* Standard A4 height at 96 DPI */
    padding: 48px 52px;
    background-color: #ffffff;
    color: #1e293b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13.5px;
    line-height: 1.65;
    box-sizing: border-box;
    z-index: -9999;
  `;

  // Inject stylesheet and HTML content
  container.innerHTML = `
    <style>
      .markdown-pdf-render-root * {
        box-sizing: border-box;
      }
      .markdown-pdf-render-root h1 {
        font-size: 24px;
        font-weight: 700;
        margin: 24px 0 14px;
        padding-bottom: 8px;
        border-bottom: 1.5px solid #e2e8f0;
        color: #0f172a;
      }
      .markdown-pdf-render-root h1:first-child {
        margin-top: 0;
      }
      .markdown-pdf-render-root h2 {
        font-size: 19px;
        font-weight: 650;
        margin: 20px 0 12px;
        padding-bottom: 6px;
        border-bottom: 1px solid #e2e8f0;
        color: #0f172a;
      }
      .markdown-pdf-render-root h3 {
        font-size: 15px;
        font-weight: 650;
        margin: 16px 0 8px;
        color: #0f172a;
      }
      .markdown-pdf-render-root h4,
      .markdown-pdf-render-root h5,
      .markdown-pdf-render-root h6 {
        font-size: 13px;
        font-weight: 650;
        margin: 14px 0 6px;
        color: #1e293b;
      }
      .markdown-pdf-render-root p {
        margin: 10px 0;
        color: #334155;
      }
      .markdown-pdf-render-root a {
        color: #0d9488;
        text-decoration: underline;
      }
      .markdown-pdf-render-root strong {
        font-weight: 650;
        color: #0f172a;
      }
      .markdown-pdf-render-root em {
        font-style: italic;
      }
      .markdown-pdf-render-root del {
        text-decoration: line-through;
        color: #94a3b8;
      }
      .markdown-pdf-render-root blockquote {
        margin: 14px 0;
        padding: 10px 16px;
        background: #f8fafc;
        border-left: 3.5px solid #0e363c;
        border-radius: 0 6px 6px 0;
        color: #1e293b;
      }
      .markdown-pdf-render-root hr.md-hr {
        margin: 22px 0;
        border: 0;
        border-top: 1px solid #e2e8f0;
      }
      .markdown-pdf-render-root ul.md-list,
      .markdown-pdf-render-root ol.md-list {
        margin: 10px 0;
        padding-left: 24px;
        color: #334155;
      }
      .markdown-pdf-render-root ul.md-task-list {
        list-style: none;
        padding-left: 4px;
        margin: 10px 0;
      }
      .markdown-pdf-render-root .md-task-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 6px 0;
      }
      .markdown-pdf-render-root .md-code-wrapper {
        position: relative;
        margin: 14px 0;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        padding: 12px 14px;
      }
      .markdown-pdf-render-root .code-lang-badge {
        position: absolute;
        top: 6px;
        right: 10px;
        font-family: ui-monospace, monospace;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748b;
      }
      .markdown-pdf-render-root pre.md-code-block {
        margin: 0;
        padding: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.55;
        color: #0f172a;
      }
      .markdown-pdf-render-root code.md-inline-code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        background: #f1f5f9;
        color: #0f172a;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
      }
      .markdown-pdf-render-root .md-table-wrapper {
        margin: 14px 0;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .markdown-pdf-render-root table.md-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12.5px;
      }
      .markdown-pdf-render-root table.md-table th {
        background: #f1f5f9;
        padding: 8px 12px;
        font-weight: 650;
        color: #0f172a;
        border-bottom: 1px solid #e2e8f0;
      }
      .markdown-pdf-render-root table.md-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #e2e8f0;
        color: #334155;
      }
      .markdown-pdf-render-root table.md-table tr:last-child td {
        border-bottom: 0;
      }
      .markdown-pdf-render-root .md-alert {
        margin: 14px 0;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid;
      }
      .markdown-pdf-render-root .md-alert-title {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .markdown-pdf-render-root .md-alert-body {
        font-size: 12.5px;
        line-height: 1.5;
      }
      .markdown-pdf-render-root .md-alert-note {
        border-color: rgba(59, 130, 246, 0.4);
        background: #eff6ff;
        color: #1e40af;
      }
      .markdown-pdf-render-root .md-alert-tip {
        border-color: rgba(34, 197, 94, 0.4);
        background: #f0fdf4;
        color: #166534;
      }
      .markdown-pdf-render-root .md-alert-warning {
        border-color: rgba(245, 158, 11, 0.4);
        background: #fffbeb;
        color: #92400e;
      }
      .markdown-pdf-render-root .md-alert-important {
        border-color: rgba(168, 85, 247, 0.4);
        background: #faf5ff;
        color: #6b21a8;
      }
      .markdown-pdf-render-root .md-alert-caution {
        border-color: rgba(239, 68, 68, 0.4);
        background: #fef2f2;
        color: #991b1b;
      }
      .markdown-pdf-render-root img.md-img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 10px 0;
      }
    </style>
    <div>${renderedHtml}</div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for any images to load
    const images = Array.from(container.querySelectorAll("img"));
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          });
        })
      );
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(cleanFilename);
    pdfDoc.setCreator("Ramupod Markdown Editor");

    const pageWidth = 595.28; // Standard A4 points
    const pageHeight = 841.89;
    const pageRatio = pageHeight / pageWidth;
    const sliceHeight = Math.round(canvas.width * pageRatio);

    if (canvas.height <= sliceHeight * 1.05) {
      // Single page PDF
      const imgBytes = await canvasToJpegBuffer(canvas);
      const embeddedImg = await pdfDoc.embedJpg(imgBytes);
      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

      pdfPage.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: rgb(1, 1, 1),
      });

      pdfPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    } else {
      // Multi-page PDF slicing
      const totalSlices = Math.ceil(canvas.height / sliceHeight);
      for (let s = 0; s < totalSlices; s++) {
        const y = s * sliceHeight;
        const currentSliceHeight = Math.min(sliceHeight, canvas.height - y);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            y,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );
        }

        const imgBytes = await canvasToJpegBuffer(sliceCanvas);
        const embeddedImg = await pdfDoc.embedJpg(imgBytes);
        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

        pdfPage.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(1, 1, 1),
        });

        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    downloadBlob(pdfBlob, `${cleanFilename}.pdf`);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
