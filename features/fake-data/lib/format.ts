import { numericTypes, type Field, type Format, type MockRow } from "./schema.ts";
export type OutputOptions = {
  format: Format;
  pretty: boolean;
  delimiter: "," | ";";
  table: string;
  safeCsv: boolean;
};
function csvCell(value: MockRow[string], delimiter: string, safe: boolean): string {
  let text = value === null ? "" : String(value);
  if (safe && typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return text.includes(delimiter) || /["\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
export function serializeRows(
  rows: MockRow[],
  fields: Field[],
  options: OutputOptions
): string {
  const json = JSON.stringify(rows, null, options.pretty ? 2 : undefined);
  if (options.format === "json") return json;
  if (options.format === "csv")
    return [
      fields
        .map((entry) => csvCell(entry.name, options.delimiter, options.safeCsv))
        .join(options.delimiter),
      ...rows.map((row) =>
        fields
          .map((entry) => csvCell(row[entry.name], options.delimiter, options.safeCsv))
          .join(options.delimiter)
      ),
    ].join("\r\n");
  if (options.format === "sql") {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(options.table))
      throw new Error(
        "Table name must start with a letter or underscore and contain up to 63 letters, digits, or underscores."
      );
    const columns = fields.map((entry) => quoteIdentifier(entry.name)).join(", ");
    return rows
      .map(
        (row) =>
          `INSERT INTO ${quoteIdentifier(options.table)} (${columns}) VALUES (${fields
            .map((entry) => {
              const v = row[entry.name];
              return v === null
                ? "NULL"
                : typeof v === "number"
                  ? String(v)
                  : typeof v === "boolean"
                    ? v
                      ? "TRUE"
                      : "FALSE"
                    : `'${v.replaceAll("'", "''")}'`;
            })
            .join(", ")});`
      )
      .join("\n");
  }
  const members = fields
    .map((entry) => {
      const type =
        entry.nullPercent === 100
          ? "null"
          : (numericTypes.has(entry.type)
              ? "number"
              : entry.type === "boolean"
                ? "boolean"
                : "string") + (entry.nullPercent > 0 ? " | null" : "");
      return `  ${JSON.stringify(entry.name)}: ${type};`;
    })
    .join("\n");
  return `export interface MockRecord {\n${members}\n}\n\nexport const data: MockRecord[] = ${json};\n`;
}
export const outputFiles: Record<Format, { extension: string; mime: string }> = {
  json: { extension: "json", mime: "application/json" },
  csv: { extension: "csv", mime: "text/csv" },
  sql: { extension: "sql", mime: "application/sql" },
  ts: { extension: "ts", mime: "text/typescript" },
};
