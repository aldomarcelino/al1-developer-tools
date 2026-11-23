import type { CodeToImageSettings } from "./code-to-image-types.ts";
import { THEMES, BACKGROUND_PRESETS } from "./code-to-image-types.ts";
import { tokenizeCode, getTokenColor, escapeHtml, type Token } from "./code-highlighter.ts";

export function sanitizeFilename(title: string, fallback = "code-snippet"): string {
  const clean = title
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")
    .trim();
  return clean || fallback;
}

interface RenderSubline {
  lineIndex: number;
  isFirstSubline: boolean;
  tokens: Token[];
}

function wrapTokensLine(lineTokens: Token[], maxChars = 65): Token[][] {
  const sublines: Token[][] = [];
  let currentSubline: Token[] = [];
  let currentLen = 0;

  for (const token of lineTokens) {
    let val = token.value;
    while (val.length > 0) {
      const spaceLeft = maxChars - currentLen;
      if (val.length <= spaceLeft || spaceLeft <= 0) {
        if (spaceLeft <= 0 && currentSubline.length > 0) {
          sublines.push(currentSubline);
          currentSubline = [];
          currentLen = 0;
          continue;
        }
        currentSubline.push({ type: token.type, value: val });
        currentLen += val.length;
        val = "";
      } else {
        let breakIdx = val.lastIndexOf(" ", spaceLeft);
        if (breakIdx === -1 || breakIdx === 0) {
          breakIdx = Math.max(
            val.lastIndexOf(",", spaceLeft),
            val.lastIndexOf(";", spaceLeft),
            val.lastIndexOf(".", spaceLeft),
            val.lastIndexOf("(", spaceLeft)
          );
        }
        if (breakIdx <= 0 || breakIdx < spaceLeft * 0.4) {
          breakIdx = spaceLeft;
        } else {
          breakIdx = breakIdx + 1;
        }

        const chunk = val.slice(0, breakIdx);
        currentSubline.push({ type: token.type, value: chunk });
        sublines.push(currentSubline);
        currentSubline = [];
        currentLen = 0;
        val = val.slice(breakIdx);
      }
    }
  }

  if (currentSubline.length > 0) {
    sublines.push(currentSubline);
  }

  return sublines.length > 0 ? sublines : [[]];
}

export function generateSvgString(settings: CodeToImageSettings): string {
  const theme = THEMES[settings.theme] || THEMES["one-dark"];
  const bgPreset = BACKGROUND_PRESETS[settings.background] || BACKGROUND_PRESETS.palette;
  const rawTokenLines = tokenizeCode(settings.code, settings.language);

  const shouldWrap = settings.autoWrap !== false;
  const maxAllowedChars = 65;

  // Flatten into RenderSubline[]
  const renderLines: RenderSubline[] = [];
  rawTokenLines.forEach((tokens, lineIdx) => {
    if (!shouldWrap) {
      renderLines.push({ lineIndex: lineIdx, isFirstSubline: true, tokens });
    } else {
      const wrapped = wrapTokensLine(tokens, maxAllowedChars);
      wrapped.forEach((subTokens, subIdx) => {
        renderLines.push({
          lineIndex: lineIdx,
          isFirstSubline: subIdx === 0,
          tokens: subTokens,
        });
      });
    }
  });

  const charWidth = settings.fontSize * 0.6;
  const lineHeight = settings.fontSize * 1.6;

  // Measure code content dimensions
  let maxLineLength = settings.title.length + 8;
  renderLines.forEach((line) => {
    const lineLen = line.tokens.reduce((sum, t) => sum + t.value.length, 0);
    if (lineLen > maxLineLength) maxLineLength = lineLen;
  });

  const lineNumGutterWidth = settings.showLineNumbers
    ? (String(rawTokenLines.length).length + 2) * charWidth + 16
    : 0;
  const innerCodeWidth = Math.max(340, Math.round(maxLineLength * charWidth + lineNumGutterWidth + 32));
  const headerHeight = settings.showWindowHeader ? 40 : 0;
  const codeContentHeight = renderLines.length * lineHeight + 32;
  const windowHeight = headerHeight + codeContentHeight;

  // Window card width
  const windowWidth = innerCodeWidth;

  // Outer padding
  const padding = settings.padding;
  let outerWidth = windowWidth + padding * 2;
  let outerHeight = windowHeight + padding * 2;

  // Aspect ratio adjustments if specified
  if (settings.aspectRatio === "16:9") {
    const targetRatio = 16 / 9;
    if (outerWidth / outerHeight < targetRatio) {
      outerWidth = Math.round(outerHeight * targetRatio);
    } else {
      outerHeight = Math.round(outerWidth / targetRatio);
    }
  } else if (settings.aspectRatio === "1:1") {
    const size = Math.max(outerWidth, outerHeight);
    outerWidth = size;
    outerHeight = size;
  } else if (settings.aspectRatio === "4:5") {
    const targetRatio = 4 / 5;
    if (outerWidth / outerHeight < targetRatio) {
      outerWidth = Math.round(outerHeight * targetRatio);
    } else {
      outerHeight = Math.round(outerWidth / targetRatio);
    }
  }

  // Coordinates to center window inside outer box
  const windowX = Math.round((outerWidth - windowWidth) / 2);
  const windowY = Math.round((outerHeight - windowHeight) / 2);

  // Background definition
  let bgDefs = "";
  let bgRect = "";
  if (settings.background === "transparent") {
    bgRect = "";
  } else if (settings.background === "custom") {
    const customBg = settings.customBackground || "#6366f1";
    bgRect = `<rect width="${outerWidth}" height="${outerHeight}" fill="${customBg}" />`;
  } else {
    const gradId = `bg-grad-${Math.random().toString(36).substring(2, 8)}`;
    const angleRad = (bgPreset.angle * Math.PI) / 180;
    const x1 = Math.round(50 - Math.cos(angleRad) * 50);
    const y1 = Math.round(50 - Math.sin(angleRad) * 50);
    const x2 = Math.round(50 + Math.cos(angleRad) * 50);
    const y2 = Math.round(50 + Math.sin(angleRad) * 50);

    const stopsHtml = bgPreset.stops
      .map((stop, idx) => {
        const offset = Math.round((idx / (bgPreset.stops.length - 1)) * 100);
        return `<stop offset="${offset}%" stop-color="${stop}" />`;
      })
      .join("");

    bgDefs = `
      <linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${stopsHtml}
      </linearGradient>
    `;
    bgRect = `<rect width="${outerWidth}" height="${outerHeight}" fill="url(#${gradId})" />`;
  }

  // Shadow filters
  let shadowFilter = "";
  let shadowAttr = "";
  if (settings.shadow !== "none") {
    const shadowId = "card-shadow";
    const blur = settings.shadow === "glow" ? 20 : settings.shadow === "dramatic" ? 28 : settings.shadow === "medium" ? 16 : 8;
    const dy = settings.shadow === "glow" ? 0 : settings.shadow === "dramatic" ? 18 : settings.shadow === "medium" ? 10 : 4;
    const alpha = settings.shadow === "glow" ? 0.45 : settings.shadow === "dramatic" ? 0.35 : 0.22;
    shadowFilter = `
      <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="rgba(0,0,0,${alpha})" />
      </filter>
    `;
    shadowAttr = `filter="url(#${shadowId})"`;
  }

  // Window Controls
  let controlsHtml = "";
  if (settings.showWindowHeader) {
    if (settings.windowStyle === "macos") {
      controlsHtml = `
        <circle cx="${windowX + 20}" cy="${windowY + 20}" r="6" fill="#ff5f56" />
        <circle cx="${windowX + 40}" cy="${windowY + 20}" r="6" fill="#ffbd2e" />
        <circle cx="${windowX + 60}" cy="${windowY + 20}" r="6" fill="#27c93f" />
      `;
    } else if (settings.windowStyle === "windows") {
      controlsHtml = `
        <rect x="${windowX + windowWidth - 64}" y="${windowY + 14}" width="12" height="12" fill="none" stroke="${theme.comment}" stroke-width="1.5" />
        <line x1="${windowX + windowWidth - 44}" y1="${windowY + 20}" x2="${windowX + windowWidth - 34}" y2="${windowY + 20}" stroke="${theme.comment}" stroke-width="1.5" />
        <line x1="${windowX + windowWidth - 22}" y1="${windowY + 14}" x2="${windowX + windowWidth - 12}" y2="${windowY + 24}" stroke="${theme.comment}" stroke-width="1.5" />
        <line x1="${windowX + windowWidth - 12}" y1="${windowY + 14}" x2="${windowX + windowWidth - 22}" y2="${windowY + 24}" stroke="${theme.comment}" stroke-width="1.5" />
      `;
    } else if (settings.windowStyle === "minimal") {
      controlsHtml = `
        <circle cx="${windowX + 20}" cy="${windowY + 20}" r="4.5" fill="${theme.comment}" opacity="0.4" />
        <circle cx="${windowX + 36}" cy="${windowY + 20}" r="4.5" fill="${theme.comment}" opacity="0.4" />
        <circle cx="${windowX + 52}" cy="${windowY + 20}" r="4.5" fill="${theme.comment}" opacity="0.4" />
      `;
    }
  }

  // Title text in header
  const titleHtml =
    settings.showWindowHeader && settings.title
      ? `<text x="${windowX + windowWidth / 2}" y="${windowY + 24}" text-anchor="middle" fill="${theme.comment}" font-family="'JetBrains Mono', monospace" font-size="12" opacity="0.85">${escapeHtml(settings.title)}</text>`
      : "";

  // Code lines
  const codeStartY = windowY + headerHeight + 24;
  const codeStartX = windowX + 24;

  const linesHtml = renderLines
    .map((line, renderIdx) => {
      const curY = codeStartY + renderIdx * lineHeight;
      let lineNumTspan = "";
      if (settings.showLineNumbers) {
        if (line.isFirstSubline) {
          const lineNumStr = String(settings.startLineNumber + line.lineIndex).padStart(
            String(rawTokenLines.length).length,
            " "
          );
          lineNumTspan = `<tspan fill="${theme.lineNumber}" opacity="0.5" x="${codeStartX}">${lineNumStr}  </tspan>`;
        }
      }

      const tokensTspan = line.tokens
        .map((tok) => `<tspan fill="${getTokenColor(tok, theme)}">${escapeHtml(tok.value)}</tspan>`)
        .join("");

      const contentStartX = settings.showLineNumbers ? codeStartX + lineNumGutterWidth : codeStartX;
      return `<text y="${curY}" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="${settings.fontSize}">
        ${lineNumTspan}
        <tspan x="${contentStartX}">${tokensTspan || " "}</tspan>
      </text>`;
    })
    .join("\n");

  // Watermark
  const watermarkHtml =
    settings.showWatermark && settings.watermark
      ? `<text x="${outerWidth - 24}" y="${outerHeight - 16}" text-anchor="end" fill="rgba(255,255,255,0.7)" font-family="'Inter', sans-serif" font-size="12" font-weight="500">${escapeHtml(settings.watermark)}</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outerWidth}" height="${outerHeight}" viewBox="0 0 ${outerWidth} ${outerHeight}">
    <defs>
      ${bgDefs}
      ${shadowFilter}
    </defs>
    ${bgRect}
    <g ${shadowAttr}>
      <!-- Window Background -->
      <rect x="${windowX}" y="${windowY}" width="${windowWidth}" height="${windowHeight}" rx="${settings.borderRadius}" fill="${theme.background}" />
      ${
        settings.showWindowHeader
          ? `<rect x="${windowX}" y="${windowY}" width="${windowWidth}" height="${headerHeight}" rx="${settings.borderRadius}" fill="${theme.headerBackground}" />
             <rect x="${windowX}" y="${windowY + headerHeight - 10}" width="${windowWidth}" height="10" fill="${theme.headerBackground}" />
             <line x1="${windowX}" y1="${windowY + headerHeight}" x2="${windowX + windowWidth}" y2="${windowY + headerHeight}" stroke="${theme.headerBorder}" stroke-width="1" />`
          : ""
      }
      ${controlsHtml}
      ${titleHtml}
      ${linesHtml}
    </g>
    ${watermarkHtml}
  </svg>`;
}

export async function svgToPngBlob(svgString: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.documentElement;
    const width = parseFloat(svgEl.getAttribute("width") || "800");
    const height = parseFloat(svgEl.getAttribute("height") || "600");

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas context is unavailable."));
      return;
    }

    ctx.scale(scale, scale);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to PNG blob."));
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG for rasterization."));
    };

    img.src = url;
  });
}

export async function svgToWebpBlob(svgString: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.documentElement;
    const width = parseFloat(svgEl.getAttribute("width") || "800");
    const height = parseFloat(svgEl.getAttribute("height") || "600");

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas context is unavailable."));
      return;
    }

    ctx.scale(scale, scale);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to WebP blob."));
      }, "image/webp", 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG for WebP rasterization."));
    };

    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard || !window.ClipboardItem) {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
  return true;
}

export async function exportCodeToPng(settings: CodeToImageSettings, scale = 2): Promise<void> {
  const svg = generateSvgString(settings);
  const blob = await svgToPngBlob(svg, scale);
  const name = `${sanitizeFilename(settings.title || "code-snippet")}.png`;
  downloadBlob(blob, name);
}

export function exportCodeToSvg(settings: CodeToImageSettings): void {
  const svg = generateSvgString(settings);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const name = `${sanitizeFilename(settings.title || "code-snippet")}.svg`;
  downloadBlob(blob, name);
}

export async function exportCodeToWebp(settings: CodeToImageSettings, scale = 2): Promise<void> {
  const svg = generateSvgString(settings);
  const blob = await svgToWebpBlob(svg, scale);
  const name = `${sanitizeFilename(settings.title || "code-snippet")}.webp`;
  downloadBlob(blob, name);
}

export async function copyCodeImageToClipboard(settings: CodeToImageSettings, scale = 2): Promise<boolean> {
  const svg = generateSvgString(settings);
  const blob = await svgToPngBlob(svg, scale);
  return copyImageToClipboard(blob);
}

