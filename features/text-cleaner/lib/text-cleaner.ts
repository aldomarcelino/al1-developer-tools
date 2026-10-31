export type CaseStyle =
  "original" | "lower" | "upper" | "title" | "camel" | "snake" | "kebab";
export interface CleanOptions {
  trim: boolean;
  collapse: boolean;
  empty: boolean;
  unique: boolean;
  sort: "none" | "asc" | "desc";
  caseStyle: CaseStyle;
}
export const defaultCleanOptions: CleanOptions = {
  trim: true,
  collapse: false,
  empty: false,
  unique: false,
  sort: "none",
  caseStyle: "original",
};
export function cleanText(text: string, options: CleanOptions): string {
  if (!text) return "";
  let lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (options.trim) lines = lines.map((line) => line.trim());
  if (options.collapse) lines = lines.map((line) => line.replace(/[^\S\n]+/gu, " "));
  if (options.empty) lines = lines.filter((line) => line.trim().length > 0);
  if (options.unique) lines = [...new Set(lines)];
  if (options.sort !== "none") {
    lines.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    if (options.sort === "desc") lines.reverse();
  }
  return lines
    .map((line) => {
      switch (options.caseStyle) {
        case "lower":
          return line.toLowerCase();
        case "upper":
          return line.toUpperCase();
        case "title":
          return line
            .toLowerCase()
            .replace(
              /(^|[^\p{L}\p{N}])(\p{L})/gu,
              (_, prefix: string, letter: string) => prefix + letter.toUpperCase()
            );
        case "camel":
        case "snake":
        case "kebab": {
          const words =
            line
              .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
              .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2")
              .match(/[\p{L}\p{N}]+/gu)
              ?.map((word) => word.toLowerCase()) ?? [];
          return options.caseStyle === "camel"
            ? words
                .map((word, i) =>
                  i ? word.charAt(0).toUpperCase() + word.slice(1) : word
                )
                .join("")
            : words.join(options.caseStyle === "snake" ? "_" : "-");
        }
        default:
          return line;
      }
    })
    .join("\n");
}
