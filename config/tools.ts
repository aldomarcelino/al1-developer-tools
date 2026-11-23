import toolsData from "./tools.json" with { type: "json" };

export const categories = [
  "All tools",
  "Documents",
  "Design",
  "Data",
  "Database",
  "Text",
  "Encoding",
  "Security",
  "Utilities",
  "Network",
  "Image",
];

/** All valid icon keys - must stay in sync with toolIcons in tool-icons.ts. */
export type ToolIcon =
  | "heic"
  | "crop"
  | "video"
  | "bug"
  | "vector"
  | "network"
  | "mock"
  | "ruler"
  | "schedule"
  | "yaml"
  | "calendar"
  | "imagepdf"
  | "pdfcompress"
  | "pdf"
  | "palette"
  | "globe"
  | "table"
  | "percent"
  | "qr"
  | "clean"
  | "image"
  | "json"
  | "markdown"
  | "diff"
  | "key"
  | "token"
  | "binary"
  | "regex"
  | "clock"
  | "hash"
  | "types"
  | "webhook"
  | "database"
  | "terminal"
  | "notes"
  | "lorem"
  | "text"
  | "mic"
  | "volume"
  | "pdfimages"
  | "wordpdf"
  | "pdfword"
  | "pdfmarkdown"
  | "pdfeditor"
  | "calculator"
  | "markdownpdf"
  | "codeimage";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  keywords: readonly string[];
  category: string;
  icon: ToolIcon;
  phase: number;
  status: string;
};

export const tools = toolsData as readonly Tool[];

// Catalog order is editorial: brand fit and everyday usefulness, not measured traffic.
// Keep header shortcuts and popular badges aligned with the first nine available tools.
export const headerTools = tools
  .filter((tool) => tool.status === "available")
  .slice(0, 9);
export const headerToolSlugs = headerTools.map((tool) => tool.slug);

const popularSlugs: ReadonlySet<string> = new Set(headerToolSlugs);
export function isPopularTool(slug: string): boolean {
  return popularSlugs.has(slug);
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Damerau-Levenshtein distance includes adjacent transpositions such as "fomratter".
function matchesTypo(term: string, word: string): boolean {
  if (term.length < 4) return false;
  const tolerance = term.length >= 8 ? 2 : 1;
  if (Math.abs(term.length - word.length) > tolerance) return false;
  const rows = Array.from({ length: term.length + 1 }, (_, index) =>
    Array.from({ length: word.length + 1 }, (_, column) =>
      index === 0 ? column : column === 0 ? index : 0
    )
  );
  for (let row = 1; row <= term.length; row++) {
    for (let column = 1; column <= word.length; column++) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + Number(term[row - 1] !== word[column - 1])
      );
      if (
        row > 1 &&
        column > 1 &&
        term[row - 1] === word[column - 2] &&
        term[row - 2] === word[column - 1]
      ) {
        rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
      }
    }
  }
  return rows[term.length][word.length] <= tolerance;
}

// Shared by homepage discovery and the global search dialog. Keywords stay in code.
export function matchesToolQuery(tool: Tool, query: string): boolean {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const searchable = normalizeSearch(
    [
      tool.name,
      tool.description,
      tool.category,
      tool.slug,
      ...tool.keywords,
      isPopularTool(tool.slug) ? "popular" : "",
    ].join(" ")
  );
  const words = searchable.split(" ");
  return terms.every(
    (term) => searchable.includes(term) || words.some((word) => matchesTypo(term, word))
  );
}

export function getToolSearchScore(tool: Tool, query: string): number {
  const normalizedQuery = normalizeSearch(query).trim();
  if (!normalizedQuery) return 0;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;

  let score = 0;
  const toolNameNorm = normalizeSearch(tool.name);
  const toolSlugNorm = normalizeSearch(tool.slug);
  const toolKeywordsNorm = tool.keywords.map(normalizeSearch);
  const toolDescNorm = normalizeSearch(tool.description);

  // 1. Direct Canonical Calculator Priority:
  // When user searches for "calculator", "kalkulator", "calc", "math calculator",
  // "Scientific Calculator" is the canonical math & computation tool and should be prioritized.
  if (
    tool.slug === "scientific-calculator" &&
    /^(calculator|kalkulator|calc|kalkulator ilmiah|scientific calculator|hitung math|math)$/i.test(
      normalizedQuery
    )
  ) {
    score += 5000;
  }

  // 2. Exact match on slug or name
  if (toolSlugNorm === normalizedQuery) {
    score += 3000;
  } else if (toolSlugNorm.startsWith(normalizedQuery)) {
    score += 1500;
  } else if (toolSlugNorm.includes(normalizedQuery)) {
    score += 800;
  }

  if (toolNameNorm === normalizedQuery) {
    score += 3000;
  } else if (toolNameNorm.startsWith(normalizedQuery)) {
    score += 2000;
  } else if (toolNameNorm.includes(normalizedQuery)) {
    score += 1000;
  }

  // 3. Exact match on keywords
  if (toolKeywordsNorm.includes(normalizedQuery)) {
    score += 1200;
  } else if (toolKeywordsNorm.some((k) => k.startsWith(normalizedQuery))) {
    score += 600;
  } else if (toolKeywordsNorm.some((k) => k.includes(normalizedQuery))) {
    score += 300;
  }

  // 4. Term matches in name vs description
  for (const term of terms) {
    const nameWords = toolNameNorm.split(/\s+/);
    if (nameWords.includes(term)) {
      score += 400;
    } else if (toolNameNorm.includes(term)) {
      score += 200;
    }

    if (toolDescNorm.includes(term)) {
      score += 50;
    }
  }

  // 5. Popular tool slight bump for tie-breaking
  if (isPopularTool(tool.slug)) {
    score += 10;
  }

  return score;
}

export function searchTools(
  toolsList: readonly Tool[],
  query: string,
  category: string = "All"
): Tool[] {
  const q = query.trim();
  const matched = toolsList.filter((tool) => {
    const matchesCategory =
      category === "All" || category === "All tools" || tool.category === category;
    return matchesCategory && matchesToolQuery(tool, q);
  });

  if (!q) return matched;

  return matched
    .map((tool, index) => ({
      tool,
      score: getToolSearchScore(tool, q),
      originalIndex: index,
    }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map((item) => item.tool);
}
