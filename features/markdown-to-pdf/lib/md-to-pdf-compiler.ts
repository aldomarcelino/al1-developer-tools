import type {
  PageSize,
  Orientation,
  MarginOption,
  MarkdownStats,
} from "./md-to-pdf-types.ts";

/**
 * Calculates page dimensions in standard PDF points (72 points per inch).
 */
export function getPageDimensions(
  pageSize: PageSize,
  orientation: Orientation
): { width: number; height: number } {
  let width = 595.28;
  let height = 841.89;

  switch (pageSize) {
    case "a4":
      width = 595.28;
      height = 841.89;
      break;
    case "letter":
      width = 612.0;
      height = 792.0;
      break;
    case "legal":
      width = 612.0;
      height = 1008.0;
      break;
  }

  if (orientation === "landscape") {
    return { width: height, height: width };
  }

  return { width, height };
}

/**
 * Returns margin values for CSS styling and PDF rendering.
 */
export function getMarginPadding(margin: MarginOption): string {
  switch (margin) {
    case "compact":
      return "14mm";
    case "wide":
      return "32mm";
    case "normal":
    default:
      return "22mm";
  }
}

/**
 * Formats file size in human-readable bytes, KB, or MB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates an uploaded Markdown file for extension and size limits.
 */
export function validateMarkdownFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const validExtensions = ["md", "markdown", "txt"];
  if (!extension || !validExtensions.includes(extension)) {
    return {
      valid: false,
      error: "Please upload a valid Markdown (.md, .markdown, or .txt) file.",
    };
  }

  const maxBytes = 10 * 1024 * 1024; // 10 MB limit
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: "File size exceeds the 10 MB limit.",
    };
  }

  return { valid: true };
}

/**
 * Sanitizes the output PDF filename based on the source markdown file name.
 */
export function sanitizePdfFilename(rawName: string): string {
  const base = rawName.replace(/\.(?:md|markdown|txt|pdf)$/i, "").trim();
  const sanitized = base
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/, "")
    .slice(0, 120);
  return sanitized ? `${sanitized}.pdf` : "document.pdf";
}

/**
 * Calculates writing statistics for markdown content.
 */
export function calculateMarkdownStats(text: string): MarkdownStats {
  const trimmed = text.trim();
  const words = trimmed ? (trimmed.match(/\S+/g) || []).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const lines = text ? text.split("\n").length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    characters,
    charactersNoSpaces,
    lines,
    readingTimeMinutes,
  };
}

/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes URLs to prevent javascript: or data: injection.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) {
    return trimmed;
  }
  return "#unsafe-url";
}

/**
 * Parses inline markdown: bold, italic, code, links, images, strikethrough.
 */
export function parseInlineMarkdown(text: string): string {
  return renderInline(text, 0);
}

function renderInline(text: string, depth: number): string {
  if (depth >= 20) return escapeHtml(text);
  const tokens =
    /`([^`]+)`|!\[([^\]\n]*)\]\(([^)\n]*)\)|\[([^\]\n]*)\]\(([^)\n]*)\)|(\*\*\*|___)(.+?)\6|(\*\*|__)(.+?)\8|(?<!\w)(\*|_)(.+?)\10(?!\w)|~~(.+?)~~/g;
  let result = "";
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    result += escapeHtml(text.slice(cursor, match.index));
    const [full] = match;
    cursor = match.index + full.length;

    // Inline code
    if (match[1] !== undefined) {
      result += `<code class="md-inline-code">${escapeHtml(match[1])}</code>`;
    }
    // Image
    else if (match[2] !== undefined && match[3] !== undefined) {
      const alt = escapeHtml(match[2]);
      const src = escapeHtml(sanitizeUrl(match[3]));
      result += `<img src="${src}" alt="${alt}" class="md-image" loading="lazy" />`;
    }
    // Link
    else if (match[4] !== undefined && match[5] !== undefined) {
      const linkText = renderInline(match[4], depth + 1);
      const href = escapeHtml(sanitizeUrl(match[5]));
      result += `<a href="${href}" class="md-link" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    }
    // Bold Italic (*** or ___)
    else if (match[7] !== undefined) {
      result += `<strong><em>${renderInline(match[7], depth + 1)}</em></strong>`;
    }
    // Bold (** or __)
    else if (match[9] !== undefined) {
      result += `<strong>${renderInline(match[9], depth + 1)}</strong>`;
    }
    // Italic (* or _)
    else if (match[11] !== undefined) {
      result += `<em>${renderInline(match[11], depth + 1)}</em>`;
    }
    // Strikethrough (~~)
    else if (match[12] !== undefined) {
      result += `<del>${renderInline(match[12], depth + 1)}</del>`;
    }
  }
  result += escapeHtml(text.slice(cursor));
  return result;
}

/**
 * Compiles GitHub Flavored Markdown to HTML suitable for document and PDF rendering.
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockBuffer: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];
  let inTable = false;
  let tableHeaderParsed = false;
  let tableAlignments: ("left" | "center" | "right")[] = [];

  const closeList = () => {
    if (inList) {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      const content = blockquoteBuffer.join("\n").trim();
      const alertMatch = content.match(
        /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*\n?([\s\S]*)$/i
      );
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        const alertBody = alertMatch[2];
        html.push(
          `<div class="md-alert md-alert-${alertType.toLowerCase()}"><div class="md-alert-title">${alertType}</div><div class="md-alert-body">${renderMarkdownToHtml(alertBody)}</div></div>`
        );
      } else {
        html.push(`<blockquote>${renderMarkdownToHtml(content)}</blockquote>`);
      }
      inBlockquote = false;
      blockquoteBuffer = [];
    }
  };

  const closeTable = () => {
    if (inTable) {
      html.push("</tbody></table></div>");
      inTable = false;
      tableHeaderParsed = false;
      tableAlignments = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Fenced Code Blocks (```)
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = escapeHtml(codeBlockBuffer.join("\n"));
        const langClass = codeBlockLang ? ` language-${escapeHtml(codeBlockLang)}` : "";
        const langBadge = codeBlockLang
          ? `<span class="code-lang-badge">${escapeHtml(codeBlockLang)}</span>`
          : "";
        html.push(
          `<div class="md-code-wrapper">${langBadge}<pre class="md-code-block"><code class="${langClass}">${codeText}</code></pre></div>`
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockBuffer = [];
      } else {
        closeList();
        closeBlockquote();
        closeTable();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // 2. Blockquotes (> ...)
    if (trimmed.startsWith(">")) {
      closeList();
      closeTable();
      inBlockquote = true;
      const quoteText = rawLine.replace(/^\s*>\s?/, "");
      blockquoteBuffer.push(quoteText);
      continue;
    } else if (inBlockquote) {
      closeBlockquote();
    }

    // 3. Tables (| Col1 | Col2 | ...)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closeList();
      if (!inTable) {
        inTable = true;
        tableHeaderParsed = false;
        html.push('<div class="md-table-wrapper"><table class="md-table">');

        // Parse Header Row
        const headerCells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        html.push("<thead><tr>");
        for (const cell of headerCells) {
          html.push(`<th>${parseInlineMarkdown(cell)}</th>`);
        }
        html.push("</tr></thead><tbody>");
        continue;
      }

      // Check for delimiter line (|:---|:---:|---:|)
      if (!tableHeaderParsed) {
        const delimiterCells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        const isDelimiter = delimiterCells.every((c) => /^:?-+:?$/.test(c));
        if (isDelimiter) {
          tableAlignments = delimiterCells.map((c) => {
            if (c.startsWith(":") && c.endsWith(":")) return "center";
            if (c.endsWith(":")) return "right";
            return "left";
          });
          tableHeaderParsed = true;
          continue;
        }
      }

      // Body Row
      const bodyCells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      html.push("<tr>");
      for (let c = 0; c < bodyCells.length; c++) {
        const align = tableAlignments[c] ? ` align="${tableAlignments[c]}"` : "";
        html.push(`<td${align}>${parseInlineMarkdown(bodyCells[c])}</td>`);
      }
      html.push("</tr>");
      continue;
    } else if (inTable) {
      closeTable();
    }

    // 4. Horizontal Rules (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      html.push('<hr class="md-hr" />');
      continue;
    }

    // 5. Headings (# H1 to ###### H6)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const headingContent = parseInlineMarkdown(headingMatch[2]);
      html.push(`<h${level} class="md-h${level}">${headingContent}</h${level}>`);
      continue;
    }

    // 6. Task Lists (- [ ] or - [x])
    const taskMatch = rawLine.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        inList = true;
        listType = "ul";
        html.push('<ul class="md-list md-task-list">');
      }
      const isChecked = taskMatch[1].toLowerCase() === "x";
      const taskBody = parseInlineMarkdown(taskMatch[2]);
      const checkedAttr = isChecked ? ' checked="checked"' : "";
      const classAttr = isChecked ? "md-task-done" : "";
      html.push(
        `<li class="md-task-item ${classAttr}"><input type="checkbox" disabled${checkedAttr} class="md-task-checkbox" /> <span>${taskBody}</span></li>`
      );
      continue;
    }

    // 7. Unordered Lists (- or * or +)
    const unorderedMatch = rawLine.match(/^\s*[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        inList = true;
        listType = "ul";
        html.push('<ul class="md-list">');
      }
      html.push(`<li>${parseInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    // 8. Ordered Lists (1. 2. 3.)
    const orderedMatch = rawLine.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        inList = true;
        listType = "ol";
        html.push('<ol class="md-list md-ordered-list">');
      }
      html.push(`<li>${parseInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    // 9. Blank Lines
    if (!trimmed) {
      closeList();
      continue;
    }

    // 10. Paragraphs
    closeList();
    html.push(`<p class="md-p">${parseInlineMarkdown(trimmed)}</p>`);
  }

  if (inCodeBlock) {
    html.push(
      `<div class="md-code-wrapper"><pre class="md-code-block"><code>${escapeHtml(codeBlockBuffer.join("\n"))}</code></pre></div>`
    );
  }
  closeList();
  closeBlockquote();
  closeTable();

  return html.join("\n");
}
