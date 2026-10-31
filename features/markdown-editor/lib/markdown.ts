/**
 * Lightweight, secure client-side Markdown to HTML compiler
 * Supports GitHub Flavored Markdown (GFM): tables, task lists, code blocks, callouts, and strikethrough.
 */

export interface MarkdownStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  readingTimeMinutes: number;
}

export const sampleMarkdown = `# Welcome to Markdown Editor & Preview

A distraction-free writing environment with **real-time preview**, rich formatting tools, and instant export.

> [!TIP]
> Everything runs **100% in your browser**. Your content is never uploaded to any server.

---

## ⚡ Key Features

- **Live Split Preview**: Write on the left, inspect formatted output on the right
- **GFM Compatible**: Tables, task lists, strikethrough, and fenced code
- **Instant Stats**: Real-time word count, character count, and reading time
- **Multi-Format Export**: Copy or download as Markdown (\`.md\`) or HTML (\`.html\`)

---

## 📋 Task Checklist

- [x] Create project layout and design tokens
- [x] Build robust JSON Formatter
- [ ] Implement Markdown Editor with live preview
- [ ] Add side-by-side Diff Viewer

---

## 💻 Code Example

\`\`\`typescript
interface UserProfile {
  id: string;
  name: string;
  role: "admin" | "developer";
  createdAt: Date;
}

function greet(user: UserProfile): string {
  return \`Hello, \${user.name}! Welcome to Ramupod.\`;
}
\`\`\`

---

## 📊 Comparison Table

| Feature | Ramupod Editor | Basic Textarea |
| :--- | :---: | :---: |
| Live GFM Preview | ✅ Yes | ❌ No |
| Word & Read Time Stats | ✅ Yes | ❌ No |
| Copy / Download HTML | ✅ Yes | ❌ No |
| Browser-side text processing | ✅ Yes | ✅ Yes |

---

## 🔗 Quotes & Links

> "Simplicity is prerequisite for reliability."  
> - *Edsger W. Dijkstra*

Learn more about formatting by exploring the [CommonMark Specification](https://commonmark.org/).
`;

/**
 * Calculates writing statistics for a markdown document.
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
 * Escapes HTML entities to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes unsafe HTML URLs (prevents javascript:, data:, vbscript: XSS vectors).
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Allow safe web protocols: https, http, mailto, tel, or relative/anchor paths
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

// Parse source tokens once. Never run Markdown replacements over generated HTML:
// markup in a URL/alt/code span must not become HTML attribute delimiters.
function renderInline(text: string, depth: number, allowLinks = true): string {
  if (depth >= 20) return escapeHtml(text);
  const tokens =
    /`([^`]+)`|!\[([^\]\n]*)\]\(([^)\n]*)\)|\[([^\]\n]*)\]\(([^)\n]*)\)|(\*\*\*|___)(.+?)\6|(\*\*|__)(.+?)\8|(?<!\w)(\*|_)(.+?)\10(?!\w)|~~(.+?)~~/g;
  let result = "";
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    result += escapeHtml(text.slice(cursor, match.index));
    const [
      ,
      code,
      alt,
      imageUrl,
      label,
      linkUrl,
      triple,
      tripleText,
      bold,
      boldText,
      italic,
      italicText,
      deleted,
    ] = match;
    if (code !== undefined) {
      result += `<code class="md-inline-code">${escapeHtml(code)}</code>`;
    } else if (alt !== undefined) {
      result += `<img src="${escapeHtml(sanitizeUrl(imageUrl))}" alt="${escapeHtml(alt)}" class="md-img" loading="lazy" referrerpolicy="no-referrer" />`;
    } else if (label !== undefined) {
      result += allowLinks
        ? `<a href="${escapeHtml(sanitizeUrl(linkUrl))}" target="_blank" rel="noopener noreferrer">${renderInline(label, depth + 1, false)}</a>`
        : escapeHtml(match[0]);
    } else if (triple) {
      result += `<strong><em>${renderInline(tripleText, depth + 1, allowLinks)}</em></strong>`;
    } else if (bold) {
      result += `<strong>${renderInline(boldText, depth + 1, allowLinks)}</strong>`;
    } else if (italic) {
      result += `<em>${renderInline(italicText, depth + 1, allowLinks)}</em>`;
    } else {
      result += `<del>${renderInline(deleted, depth + 1, allowLinks)}</del>`;
    }
    cursor = match.index + match[0].length;
  }
  return result + escapeHtml(text.slice(cursor));
}

/**
 * Parses full Markdown document to HTML string.
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
  let tableBuffer: string[] = [];
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
      // Check for alert callouts: [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION]
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
      tableBuffer = [];
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

    // 3. Tables (| cell | cell |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closeList();
      closeBlockquote();

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Check if this line is a separator row (| --- | :---: | ---: |)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator && !tableHeaderParsed && tableBuffer.length > 0) {
        // Parse column alignments
        tableAlignments = cells.map((c) => {
          if (c.startsWith(":") && c.endsWith(":")) return "center";
          if (c.endsWith(":")) return "right";
          return "left";
        });

        // The previous line was the header
        const headerCells = tableBuffer[0]
          .slice(1, -1)
          .split("|")
          .map((c, idx) => {
            const align = tableAlignments[idx] || "left";
            return `<th style="text-align:${align}">${parseInlineMarkdown(c.trim())}</th>`;
          })
          .join("");

        html.push(
          `<div class="md-table-wrapper"><table class="md-table"><thead><tr>${headerCells}</tr></thead><tbody>`
        );
        inTable = true;
        tableHeaderParsed = true;
        tableBuffer = [];
        continue;
      }

      if (!tableHeaderParsed) {
        tableBuffer.push(trimmed);
        continue;
      }

      if (tableHeaderParsed) {
        const bodyCells = cells
          .map((c, idx) => {
            const align = tableAlignments[idx] || "left";
            return `<td style="text-align:${align}">${parseInlineMarkdown(c)}</td>`;
          })
          .join("");
        html.push(`<tr>${bodyCells}</tr>`);
        continue;
      }
    } else if (inTable) {
      closeTable();
    }

    // 4. Horizontal Rules (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      closeBlockquote();
      closeTable();
      html.push('<hr class="md-hr" />');
      continue;
    }

    // 5. Headings (# H1 - ###### H6)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      closeTable();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      html.push(`<h${level} id="${slug}">${parseInlineMarkdown(text)}</h${level}>`);
      continue;
    }

    // 6. Task Lists (- [ ] or - [x])
    const taskMatch = trimmed.match(/^([-*+])\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      closeBlockquote();
      closeTable();
      if (!inList || listType !== "ul") {
        closeList();
        html.push('<ul class="md-task-list">');
        inList = true;
        listType = "ul";
      }
      const checked = taskMatch[2].toLowerCase() === "x";
      const itemText = taskMatch[3];
      html.push(
        `<li class="md-task-item"><input type="checkbox" disabled ${
          checked ? "checked" : ""
        } /> <span>${parseInlineMarkdown(itemText)}</span></li>`
      );
      continue;
    }

    // 7. Unordered Lists (- item, * item, + item)
    const ulMatch = trimmed.match(/^([-*+])\s+(.+)$/);
    if (ulMatch) {
      closeBlockquote();
      closeTable();
      if (!inList || listType !== "ul") {
        closeList();
        html.push('<ul class="md-list">');
        inList = true;
        listType = "ul";
      }
      html.push(`<li>${parseInlineMarkdown(ulMatch[2])}</li>`);
      continue;
    }

    // 8. Ordered Lists (1. item, 2. item)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      closeBlockquote();
      closeTable();
      if (!inList || listType !== "ol") {
        closeList();
        html.push('<ol class="md-list">');
        inList = true;
        listType = "ol";
      }
      html.push(`<li>${parseInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    // 9. Blank Lines
    if (!trimmed) {
      closeList();
      closeBlockquote();
      closeTable();
      continue;
    }

    // 10. Paragraphs
    closeList();
    closeBlockquote();
    closeTable();
    html.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
  }

  // Close any unclosed tags at the end of the document
  if (inCodeBlock) {
    html.push(
      `<div class="md-code-wrapper"><pre class="md-code-block"><code>${escapeHtml(
        codeBlockBuffer.join("\n")
      )}</code></pre></div>`
    );
  }
  closeList();
  closeBlockquote();
  closeTable();

  return html.join("\n");
}
