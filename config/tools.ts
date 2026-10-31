import toolsData from "./tools.json";

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

/** All valid icon keys — must stay in sync with toolIcons in tool-icons.ts. */
export type ToolIcon =
  | "bug"
  | "vector"
  | "network"
  | "mock"
  | "ruler"
  | "schedule"
  | "yaml"
  | "calendar"
  | "imagepdf"
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
  | "text";

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
  "image-compressor",
  "json-formatter",
  "qr-code-generator",
  "text-cleaner",
  "notes",
  "character-counter",
  "markdown-editor",
  "diff-viewer",
  "uuid-generator",
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
  return terms.every((term) => searchable.includes(term));
}
