import test from "node:test";
import assert from "node:assert/strict";
import { dataTypes, field, loadPreset, validateSchema, type Locale } from "./schema.ts";
import { generateRows } from "./generate.ts";
import { serializeRows, type OutputOptions } from "./format.ts";
const defaults: OutputOptions = {
  format: "json",
  pretty: true,
  delimiter: ",",
  table: "users",
  safeCsv: false,
};

test("all Faker data types generate successfully for each supported locale", async () => {
  const fields = dataTypes.map(([type], i) => field(String(i), type, type));
  for (const locale of ["en_US", "id_ID", "ja"] as Locale[]) {
    const rows = await generateRows(fields, 2, locale);
    assert.equal(rows.length, 2);
    assert.equal(Object.keys(rows[0]).length, fields.length);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[1].id, 2);
    assert.equal(typeof rows[0].boolean, "boolean");
    assert.equal(typeof rows[0].price, "number");
    assert.ok(new Date(rows[0].past as string).getTime() < Date.now());
    assert.ok(new Date(rows[0].future as string).getTime() > Date.now());
  }
});

test("row limits, duplicate fields, reserved keys and invalid ranges are rejected", () => {
  const fields = loadPreset("users");
  for (const n of [0, 1001, 1.5, NaN]) assert.throws(() => validateSchema(fields, n));
  assert.throws(() => validateSchema([], 1));
  assert.throws(
    () => validateSchema([...fields, { ...fields[0], id: "duplicate" }], 1),
    /Duplicate/
  );
  assert.throws(() => validateSchema([field("1", "__proto__", "uuid")], 1), /reserved/);
  assert.throws(() => validateSchema([{ ...fields[0], nullPercent: 101 }], 1), /Null/);
  assert.throws(
    () => validateSchema([{ ...field("1", "age", "number"), min: 100, max: 1 }], 1),
    /range/
  );
});

test("null endpoints, number range, maximum rows and cancellation", async () => {
  const fields = [
    { ...field("1", "empty", "email"), nullPercent: 100 },
    { ...field("2", "fixed", "number"), min: 42, max: 42 },
  ];
  const rows = await generateRows(fields, 1000, "en_US");
  assert.equal(rows.length, 1000);
  assert.ok(rows.every((row) => row.empty === null && row.fixed === 42));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generateRows(fields, 1, "en_US", controller.signal), {
    name: "AbortError",
  });
});

test("export preserves quoting, column order and schema-based nullability", () => {
  const fields = [
    field("1", "full_name", "fullName"),
    { ...field("2", "score", "number"), nullPercent: 50 },
    field("3", "active", "boolean"),
  ];
  const rows = [{ full_name: 'O\'Brien, "Test"\nNext', score: null, active: true }];
  assert.deepEqual(JSON.parse(serializeRows(rows, fields, defaults)), rows);
  assert.equal(
    serializeRows(rows, fields, { ...defaults, format: "json", pretty: false }),
    JSON.stringify(rows)
  );
  const csv = serializeRows(rows, fields, { ...defaults, format: "csv" });
  assert.equal(csv, 'full_name,score,active\r\n"O\'Brien, ""Test""\nNext",,true');
  const sql = serializeRows(rows, fields, { ...defaults, format: "sql" });
  assert.match(sql, /O''Brien/);
  assert.match(sql, /NULL, TRUE/);
  assert.throws(
    () =>
      serializeRows(rows, fields, {
        ...defaults,
        format: "sql",
        table: "users; DROP TABLE x",
      }),
    /Table name/
  );
  const ts = serializeRows(rows, fields, { ...defaults, format: "ts" });
  assert.match(ts, /"score": number \| null/);
  assert.match(ts, /"active": boolean/);
  const reversed = serializeRows(rows, [...fields].reverse(), {
    ...defaults,
    format: "csv",
    delimiter: ";",
  });
  assert.ok(reversed.startsWith("active;score;full_name"));
});

test("CSV formula protection is optional and preserves numeric negatives", () => {
  const fields = [field("1", "value", "fullName"), field("2", "amount", "number")];
  const rows = [{ value: "=SUM(1;2)", amount: -1 }];
  assert.match(
    serializeRows(rows, fields, { ...defaults, format: "csv", safeCsv: true }),
    /'=SUM/
  );
  assert.ok(
    serializeRows(rows, fields, { ...defaults, format: "csv" }).includes("=SUM(1;2),-1")
  );
});
