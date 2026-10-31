export type ConversionDirection = "csv-to-json" | "json-to-csv";
export type Delimiter = "," | ";" | "\t";
export const maxInputBytes = 2 * 1024 * 1024;
const maxRows = 10000;
const maxColumns = 200;
export interface TabularResult {
  output: string;
  rows: number;
  columns: number;
}

function parseCsv(input: string, delimiter: Delimiter): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    touched = false;
  function finishField() {
    row.push(field);
    field = "";
    closed = false;
    if (row.length > maxColumns) throw new Error("Use no more than 200 columns.");
  }
  function finishRow() {
    if (touched || row.length || field.length) {
      finishField();
      rows.push(row);
      if (rows.length > maxRows + 1)
        throw new Error("Use no more than 10,000 data rows.");
    }
    row = [];
    field = "";
    closed = false;
    touched = false;
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
      continue;
    }
    if (char === delimiter) {
      finishField();
      touched = true;
    } else if (char === "\r" || char === "\n") {
      finishRow();
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else if (char === '"') {
      if (closed || field.length)
        throw new Error(
          `Unexpected quote in CSV record ${rows.length + 1}. Quote the entire field and escape quotes as double quotes.`
        );
      quoted = true;
      touched = true;
    } else {
      if (closed)
        throw new Error(
          `Unexpected content after a closing quote in CSV record ${rows.length + 1}.`
        );
      field += char;
      touched = true;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field. Add its closing double quote.");
  finishRow();
  return rows;
}
export function convertTabular(
  input: string,
  direction: ConversionDirection,
  delimiter: Delimiter,
  spreadsheetSafe = false
): TabularResult {
  if (![",", ";", "\t"].includes(delimiter))
    throw new Error("Choose a supported delimiter.");
  if (new TextEncoder().encode(input).byteLength > maxInputBytes)
    throw new Error("Keep input within 2 MB of UTF-8 text.");
  if (!input.trim()) throw new Error("Enter some data first.");
  if (direction === "csv-to-json") {
    const [headers, ...data] = parseCsv(input, delimiter);
    if (!headers?.length || headers.some((header) => !header.trim()))
      throw new Error("The first CSV record must contain a name for every column.");
    if (new Set(headers).size !== headers.length)
      throw new Error("Column names must be unique. Rename duplicate headers.");
    const objects = data.map((values, index) => {
      if (values.length !== headers.length)
        throw new Error(
          `CSV record ${index + 2} has ${values.length} fields; expected ${headers.length}. Check the delimiter or quote fields that contain it.`
        );
      return Object.fromEntries(
        headers.map((header, column) => [header, values[column]])
      );
    });
    return {
      output: JSON.stringify(objects, null, 2),
      rows: data.length,
      columns: headers.length,
    };
  }
  const data: unknown = JSON.parse(input);
  if (
    !Array.isArray(data) ||
    data.some((row) => row === null || typeof row !== "object" || Array.isArray(row))
  )
    throw new Error('JSON must be an array of objects, such as [{"name":"Ramu"}].');
  if (data.length > maxRows) throw new Error("Use no more than 10,000 data rows.");
  const records = data as Record<string, unknown>[];
  const columns = new Set<string>();
  for (const record of records)
    for (const key of Object.keys(record)) {
      if (!key.trim()) throw new Error("Object keys must contain a column name.");
      columns.add(key);
      if (columns.size > maxColumns) throw new Error("Use no more than 200 columns.");
    }
  const headers = [...columns];
  if (records.length && !headers.length)
    throw new Error("Add at least one named property to your objects.");
  function escape(value: unknown): string {
    let text =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    if (spreadsheetSafe && typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text))
      text = "'" + text;
    return text.includes(delimiter) || /["\r\n]/.test(text)
      ? `"${text.replaceAll('"', '""')}"`
      : text;
  }
  const output = headers.length
    ? [
        headers.map(escape).join(delimiter),
        ...records.map((row) =>
          headers
            .map((header) => escape(Object.hasOwn(row, header) ? row[header] : undefined))
            .join(delimiter)
        ),
      ].join("\r\n")
    : "";
  return { output, rows: records.length, columns: headers.length };
}
