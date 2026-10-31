"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Dices,
  Check,
  Copy,
  Download,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { useNotice } from "@/hooks/use-notice";
import { downloadBlob } from "@/lib/browser/download";
import { generateRows } from "../lib/generate";
import { outputFiles, serializeRows } from "../lib/format";
import {
  field,
  loadPreset,
  maxFields,
  presetLabels,
  type Field,
  type Format,
  type Locale,
  type MockRow,
  type Preset,
} from "../lib/schema";
import { DataTypePicker } from "./data-type-picker";
import styles from "../styles.module.css";

type Generated = { rows: MockRow[]; fields: Field[]; key: string };
export function FakeDataWorkspace() {
  const [fields, setFields] = useState<Field[]>(() => loadPreset("users"));
  const [rows, setRows] = useState("10");
  const [locale, setLocale] = useState<Locale>("en_US");
  const [format, setFormat] = useState<Format>("json");
  const [pretty, setPretty] = useState(true);
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [table, setTable] = useState("users");
  const [safeCsv, setSafeCsv] = useState(true);
  const [started, setStarted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, showCopied] = useNotice("", 2000);
  const [notice, showNotice] = useNotice();
  const sequence = useRef(0);
  const key = JSON.stringify({ fields, rows, locale, generation });
  const current = generated?.key === key;
  useEffect(() => {
    if (!started) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await generateRows(fields, Number(rows), locale, controller.signal);
        if (!controller.signal.aborted) setGenerated({ rows: data, fields, key });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setGenerated(null);
          setError(
            cause instanceof Error ? cause.message : "Could not generate data. Try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fields, rows, locale, generation, key, started]);
  const result = useMemo(() => {
    if (!current || !generated) return { output: "", error: "" };
    try {
      return {
        output: serializeRows(generated.rows, generated.fields, {
          format,
          pretty,
          delimiter,
          table,
          safeCsv,
        }),
        error: "",
      };
    } catch (cause) {
      return {
        output: "",
        error: cause instanceof Error ? cause.message : "Could not format this output.",
      };
    }
  }, [generated, current, format, pretty, delimiter, table, safeCsv]);
  function patch(id: string, changes: Partial<Field>) {
    setError("");
    setFields((old) =>
      old.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry))
    );
  }
  function move(index: number, offset: number) {
    setFields((old) => {
      const next = [...old];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
    showNotice(`Field moved ${offset < 0 ? "up" : "down"}.`);
  }
  const busy = started && (!current || loading) && !error;
  const activePreset = (Object.keys(presetLabels) as Preset[]).find(
    (preset) => JSON.stringify(loadPreset(preset)) === JSON.stringify(fields)
  );
  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <ToolHeader title="Fake Data & Mock Generator" icon={<Dices size={24} />} />
      <div className={styles.templates}>
        <span>Start with a template</span>
        {(Object.keys(presetLabels) as Preset[]).map((preset) => (
          <ActionButton
            key={preset}
            size="sm"
            variant="secondary"
            active={activePreset === preset}
            aria-pressed={activePreset === preset}
            onClick={() => {
              setFields(loadPreset(preset));
              setTable(preset);
              setError("");
              showNotice(`${presetLabels[preset]} template loaded.`);
            }}
          >
            {activePreset === preset && <Check size={13} aria-hidden="true" />}
            {presetLabels[preset]}
          </ActionButton>
        ))}
      </div>
      <div className={styles.layout}>
        <section className={styles.builder} aria-label="Schema builder and settings">
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>01 / DEFINE YOUR DATA</span>
              <h2>
                Schema builder <span>{fields.length} fields</span>
              </h2>
            </div>
            <ActionButton
              variant="secondary"
              size="sm"
              disabled={fields.length >= maxFields}
              onClick={() => {
                const id = `custom-${++sequence.current}`;
                const names = new Set(fields.map((entry) => entry.name));
                let name = `field_${fields.length + 1}`;
                while (names.has(name)) name += "_";
                setError("");
                setFields((old) => [...old, field(id, name, "fullName")]);
              }}
            >
              <Plus size={14} />
              Add field
            </ActionButton>
          </div>
          <div className={styles.fields}>
            {fields.map((entry, index) => (
              <div className={styles.field} key={entry.id}>
                <div className={styles.fieldTop}>
                  <span className={styles.index}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <label className={styles.nameLabel}>
                    <span>Field name</span>
                    <input
                      value={entry.name}
                      maxLength={80}
                      onChange={(event) => patch(entry.id, { name: event.target.value })}
                      placeholder="field_name"
                      spellCheck={false}
                    />
                  </label>
                  <div className={styles.rowActions}>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      iconOnly
                      title={`Move ${entry.name || "field"} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={14} />
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      iconOnly
                      title={`Move ${entry.name || "field"} down`}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={14} />
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="danger"
                      iconOnly
                      title={`Remove ${entry.name || "field"}`}
                      onClick={() => {
                        setError("");
                        setFields((old) => old.filter((item) => item.id !== entry.id));
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionButton>
                  </div>
                </div>
                <div className={styles.fieldOptions}>
                  <div className={styles.typeLabel}>
                    <span>Data type</span>
                    <DataTypePicker
                      value={entry.type}
                      fieldName={entry.name}
                      onChange={(type) => patch(entry.id, { type })}
                    />
                  </div>
                  <label className={styles.nullLabel}>
                    <span>Null %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Number.isNaN(entry.nullPercent) ? "" : entry.nullPercent}
                      onChange={(event) =>
                        patch(entry.id, { nullPercent: event.target.valueAsNumber })
                      }
                    />
                  </label>
                </div>
                {entry.type === "number" && (
                  <div className={styles.range}>
                    <label>
                      Minimum
                      <input
                        type="number"
                        min={-1e9}
                        max={1e9}
                        step={1}
                        value={Number.isNaN(entry.min) ? "" : entry.min}
                        onChange={(event) =>
                          patch(entry.id, { min: event.target.valueAsNumber })
                        }
                      />
                    </label>
                    <label>
                      Maximum
                      <input
                        type="number"
                        min={-1e9}
                        max={1e9}
                        step={1}
                        value={Number.isNaN(entry.max) ? "" : entry.max}
                        onChange={(event) =>
                          patch(entry.id, { max: event.target.valueAsNumber })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
            {!fields.length && (
              <p className={styles.hint}>
                Add a field or choose a template to get started.
              </p>
            )}
          </div>
          <div className={styles.config}>
            <span className={styles.eyebrow}>02 / OUTPUT SETTINGS</span>
            <div className={styles.configGrid}>
              <label>
                Rows (1–1,000)
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={rows}
                  onChange={(event) => {
                    setError("");
                    setRows(event.target.value);
                  }}
                />
              </label>
              <CustomSelect
                label="Locale"
                layout="stacked"
                value={locale}
                onChange={(value) => {
                  setError("");
                  setLocale(value as Locale);
                }}
                options={[
                  { value: "en_US", label: "English (en_US)" },
                  { value: "id_ID", label: "Indonesia (id_ID)" },
                  { value: "ja", label: "Japanese (ja)" },
                ]}
              />
              <CustomSelect
                label="Output format"
                layout="stacked"
                value={format}
                onChange={(value) => setFormat(value as Format)}
                options={[
                  { value: "json", label: "JSON" },
                  { value: "csv", label: "CSV" },
                  { value: "sql", label: "SQL INSERT" },
                  { value: "ts", label: "TypeScript" },
                ]}
              />
              {(format === "json" || format === "ts") && (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={pretty}
                    onChange={(event) => setPretty(event.target.checked)}
                  />
                  Pretty print
                </label>
              )}
              {format === "csv" && (
                <CustomSelect
                  label="Delimiter"
                  layout="stacked"
                  value={delimiter}
                  onChange={(value) => setDelimiter(value as "," | ";")}
                  options={[
                    { value: ",", label: "Comma (,)" },
                    { value: ";", label: "Semicolon (;)" },
                  ]}
                />
              )}
              {format === "sql" && (
                <label>
                  Table name
                  <input
                    value={table}
                    maxLength={63}
                    onChange={(event) => setTable(event.target.value)}
                    spellCheck={false}
                  />
                </label>
              )}
            </div>
            {format === "csv" && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={safeCsv}
                  onChange={(event) => setSafeCsv(event.target.checked)}
                />
                Protect spreadsheet formulas
              </label>
            )}
            <ActionButton
              variant="primary"
              onClick={() => {
                setError("");
                setStarted(true);
                setGeneration((value) => value + 1);
              }}
            >
              <Sparkles size={15} />
              {busy ? "Generating…" : "Generate Data"}
            </ActionButton>
            <p className={styles.hint}>
              Up to 40 fields. After the first generation, preview updates as you edit.
              Some locale fields fall back to English.
            </p>
          </div>
        </section>
        <section
          className={styles.preview}
          aria-label="Live code preview"
          aria-busy={busy}
        >
          <div className={styles.previewHeading}>
            <div>
              <span className={styles.eyebrow}>03 / YOUR MOCK DATA</span>
              <h2>
                Live preview{" "}
                <span className={styles.formatBadge}>{format.toUpperCase()}</span>
              </h2>
            </div>
            <div className={styles.previewActions}>
              <ActionButton
                variant="ghost"
                size="sm"
                iconOnly
                title={copied ? "Copied!" : "Copy to Clipboard"}
                success={Boolean(copied)}
                disabled={!result.output || busy}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.output);
                    showCopied("copied");
                    showNotice("Output copied.");
                  } catch {
                    showNotice(
                      "Clipboard unavailable. Select and copy the preview manually."
                    );
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={!result.output || busy}
                onClick={() => {
                  const file = outputFiles[format];
                  downloadBlob(
                    new Blob([result.output], { type: `${file.mime};charset=utf-8` }),
                    `mock-data.${file.extension}`
                  );
                }}
              >
                <Download size={14} />
                Download
              </ActionButton>
            </div>
          </div>
          <label className="sr-only" htmlFor="mock-output">
            Generated code
          </label>
          <textarea
            id="mock-output"
            value={busy ? "" : result.output}
            readOnly
            spellCheck={false}
            placeholder={
              busy
                ? "Loading locale and generating data…"
                : "Define your schema, then generate data.\nYour preview will appear here."
            }
          />
          <div className={styles.previewMeta}>
            <span>
              {busy
                ? "Updating preview…"
                : current && generated
                  ? `${generated.rows.length.toLocaleString()} rows · ${fields.length} fields`
                  : "Ready when you are"}
            </span>
            <span>100% in your browser</span>
          </div>
          {(error || result.error) && (
            <p className={styles.error} role="alert">
              {error || result.error}
            </p>
          )}
          {format === "sql" && (
            <p className={styles.hint}>
              Standard SQL with double-quoted identifiers and escaped strings. Review
              compatibility with your database before executing.
            </p>
          )}
          {format === "csv" && (
            <p className={styles.hint}>
              Null becomes an empty cell. Formula protection prefixes risky text with an
              apostrophe.
            </p>
          )}
          <p className={styles.hint}>
            Synthetic data for testing. Generated passwords, payment numbers, and
            identities are not production credentials. Avatar URLs are exported as text;
            images are not fetched.
          </p>
        </section>
      </div>
      <p className={styles.hint} role="status">
        {notice}
      </p>
    </div>
  );
}
