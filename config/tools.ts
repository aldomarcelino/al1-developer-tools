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
  | "pdfmarkdown";

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

// Curated for everyday usefulness; this order does not imply measured traffic.
export const headerToolSlugs = [
  "screen-recorder",
  "image-compressor",
  "speech-to-text",
  "pdf-merge-split",
  "json-formatter",
  "text-to-speech",
  "qa-bug-report",
  "qr-code-generator",
  "svg-optimizer",
] as const satisfies readonly Tool["slug"][];

export const headerTools = headerToolSlugs.flatMap((slug) => {
  const tool = tools.find((entry) => entry.slug === slug && entry.status === "available");
  return tool ? [tool] : [];
});

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
