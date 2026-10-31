export const dataTypes = [
  ["uuid", "UUID", "ID / UUID"],
  ["id", "Sequential ID", "ID / UUID"],
  ["fullName", "Full name", "Person"],
  ["firstName", "First name", "Person"],
  ["email", "Email", "Person"],
  ["phone", "Phone", "Person"],
  ["avatar", "Avatar URL", "Person"],
  ["username", "Username", "Internet"],
  ["ipv4", "IPv4", "Internet"],
  ["url", "URL", "Internet"],
  ["password", "Password", "Internet"],
  ["city", "City", "Address"],
  ["country", "Country", "Address"],
  ["zipCode", "Zip code", "Address"],
  ["latitude", "Latitude", "Address"],
  ["longitude", "Longitude", "Address"],
  ["price", "Price", "Commerce"],
  ["productName", "Product name", "Commerce"],
  ["company", "Company", "Commerce"],
  ["past", "Past date", "Date"],
  ["future", "Future date", "Date"],
  ["recent", "Recent date", "Date"],
  ["creditCard", "Credit card (test data)", "Finance"],
  ["iban", "IBAN (test data)", "Finance"],
  ["boolean", "Boolean", "Custom"],
  ["number", "Number range (integer)", "Custom"],
  ["sentence", "Sentence", "Text"],
  ["paragraph", "Paragraph", "Text"],
] as const;
export type DataType = (typeof dataTypes)[number][0];
export type Field = {
  id: string;
  name: string;
  type: DataType;
  nullPercent: number;
  min: number;
  max: number;
};
export type Locale = "en_US" | "id_ID" | "ja";
export type Format = "json" | "csv" | "sql" | "ts";
export type MockRow = Record<string, string | number | boolean | null>;
export const numericTypes: ReadonlySet<DataType> = new Set([
  "id",
  "latitude",
  "longitude",
  "price",
  "number",
]);
export const maxFields = 40;
export function field(id: string, name: string, type: DataType): Field {
  return { id, name, type, nullPercent: 0, min: 0, max: 100 };
}
const templates = {
  users: [
    ["user_id", "uuid"],
    ["full_name", "fullName"],
    ["email", "email"],
    ["phone", "phone"],
    ["avatar", "avatar"],
    ["city", "city"],
    ["created_at", "past"],
  ],
  products: [
    ["product_id", "uuid"],
    ["name", "productName"],
    ["price", "price"],
    ["company", "company"],
    ["in_stock", "boolean"],
    ["created_at", "recent"],
  ],
  posts: [
    ["post_id", "uuid"],
    ["author", "fullName"],
    ["title", "sentence"],
    ["body", "paragraph"],
    ["comment", "paragraph"],
    ["published_at", "recent"],
  ],
  transactions: [
    ["transaction_id", "uuid"],
    ["account_holder", "fullName"],
    ["iban", "iban"],
    ["credit_card", "creditCard"],
    ["amount", "price"],
    ["settled", "boolean"],
    ["transaction_date", "past"],
  ],
} as const;
export type Preset = keyof typeof templates;
export const presetLabels: Record<Preset, string> = {
  users: "User Profile",
  products: "E-Commerce Products",
  posts: "Blog Posts / Comments",
  transactions: "Financial Transactions",
};
export function loadPreset(preset: Preset): Field[] {
  return templates[preset].map(([name, type], index) =>
    field(`preset-${preset}-${index}`, name, type)
  );
}
export function validateSchema(fields: Field[], rows: number) {
  if (!Number.isInteger(rows) || rows < 1 || rows > 1000)
    throw new Error("Choose between 1 and 1,000 rows.");
  if (!fields.length || fields.length > maxFields)
    throw new Error(`Add between 1 and ${maxFields} fields.`);
  const names = new Set<string>();
  for (const entry of fields) {
    if (
      !entry.name.trim() ||
      entry.name !== entry.name.trim() ||
      entry.name.length > 80 ||
      /[\x00-\x1f\x7f]/.test(entry.name)
    )
      throw new Error(
        "Field names must contain 1–80 characters, with no outer whitespace or control characters."
      );
    if (["__proto__", "constructor", "prototype"].includes(entry.name))
      throw new Error("Choose a different field name; this name is reserved.");
    if (names.has(entry.name)) throw new Error(`Duplicate field name: ${entry.name}`);
    names.add(entry.name);
    if (!dataTypes.some(([type]) => type === entry.type))
      throw new Error("Choose a supported data type.");
    if (
      !Number.isFinite(entry.nullPercent) ||
      entry.nullPercent < 0 ||
      entry.nullPercent > 100
    )
      throw new Error("Null probability must be between 0% and 100%.");
    if (
      entry.type === "number" &&
      (!Number.isSafeInteger(entry.min) ||
        !Number.isSafeInteger(entry.max) ||
        entry.min > entry.max ||
        entry.min < -1e9 ||
        entry.max > 1e9)
    )
      throw new Error(
        "Number ranges need whole numbers between -1 billion and 1 billion, with minimum ≤ maximum."
      );
  }
}
