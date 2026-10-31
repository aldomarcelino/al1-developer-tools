"use client";

import styles from "../styles.module.css";

import { ActionButton } from "@/components/ui/action-button";
import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  TableProperties,
  Upload,
  Copy,
  Download,
  Trash2,
  Sparkles,
  Check,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { CustomSelect } from "@/components/ui/custom-select";
import { downloadBlob } from "@/lib/browser/download";
import {
  convertTabular,
  maxInputBytes,
  type ConversionDirection,
  type Delimiter,
  type TabularResult,
} from "../lib/csv-json";

const csvSample =
  'name,team,note\r\nRamu,Product,"Hello, world"\r\nDina,Engineering,"Keeps IDs like 00123 as text"';
const jsonSample =
  '[\n  {"name":"Ramu","team":"Product","note":"Hello, world"},\n  {"name":"Dina","team":"Engineering","note":"Keeps IDs like 00123 as text"}\n]';
export function CsvJsonWorkspace() {
  const [direction, setDirection] = useState<ConversionDirection>("csv-to-json");
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [safe, setSafe] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TabularResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const reading = useRef(0);
  const toJson = direction === "csv-to-json";
  function invalidate() {
    setResult(null);
    setCopied(false);
    setError("");
    setNotice("");
  }
  function convert() {
    invalidate();
    try {
      const next = convertTabular(input, direction, delimiter, safe);
      setResult(next);
      setNotice(
        `Converted ${next.rows.toLocaleString()} rows and ${next.columns.toLocaleString()} columns.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not convert this data.");
    }
  }
  async function load(file?: File) {
    if (!file) return;
    const id = ++reading.current;
    invalidate();
    setLoading(true);
    try {
      if (file.size > maxInputBytes)
        throw new Error("Choose a UTF-8 text file no larger than 2 MB.");
      const text = await file.text();
      if (id === reading.current) {
        setInput(text);
        setNotice(`Loaded ${file.name}.`);
      }
    } catch (cause) {
      if (id === reading.current)
        setError(cause instanceof Error ? cause.message : "Could not read this file.");
    } finally {
      if (id === reading.current) setLoading(false);
    }
  }
  return (
    <div className={`workspace-page page-width utility-tool ${styles.scope}`}>
      <ToolHeader title="CSV ↔ JSON Converter" icon={<TableProperties size={24} />} />
      <div className="workspace-toolbar csv-json-toolbar">
        <div className="toolbar-group">
          <ActionButton
            variant="primary"
            disabled={!input.trim() || loading}
            onClick={convert}
          >
            <ArrowLeftRight size={15} />
            Convert
          </ActionButton>
          <CustomSelect
            layout="side"
            label="Conversion"
            value={direction}
            disabled={loading}
            onChange={(value) => {
              invalidate();
              setDirection(value as ConversionDirection);
            }}
            options={[
              { value: "csv-to-json", label: "CSV → JSON" },
              { value: "json-to-csv", label: "JSON → CSV" },
            ]}
          />
          <CustomSelect
            layout="side"
            label="CSV delimiter"
            value={delimiter}
            disabled={loading}
            onChange={(value) => {
              invalidate();
              setDelimiter(value as Delimiter);
            }}
            options={[
              { value: ",", label: "Comma (,)" },
              { value: ";", label: "Semicolon (;)" },
              { value: "\t", label: "Tab (TSV)" },
            ]}
          />

          <ActionButton
            variant="ghost"
            disabled={loading}
            onClick={() => {
              invalidate();
              setInput(toJson ? csvSample : jsonSample);
              if (toJson) setDelimiter(",");
            }}
          >
            <Sparkles size={15} />
            Try example
          </ActionButton>
        </div>
        <div className="toolbar-group csv-json-file-action">
          <ActionButton
            variant="secondary"
            disabled={loading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
            {loading ? "Reading…" : "Open file"}
          </ActionButton>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={
            toJson
              ? ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              : ".json,.txt,application/json,text/plain"
          }
          hidden
          onChange={(event) => {
            void load(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {!toJson && (
        <div className="utility-checks">
          <label>
            <input
              type="checkbox"
              checked={safe}
              onChange={(event) => {
                invalidate();
                setSafe(event.target.checked);
              }}
            />
            Protect spreadsheet formulas
          </label>
          <span className="utility-hint">
            Prefixes formula-like text with an apostrophe. Numeric JSON values stay
            unchanged.
          </span>
        </div>
      )}
      <div className="utility-columns">
        <section className="utility-panel">
          <div className="utility-panel-heading">
            <label htmlFor="csv-json-input">{toJson ? "CSV input" : "JSON input"}</label>
            <ActionButton
              variant="danger"
              size="sm"
              iconOnly
              title="Clear input"
              disabled={!input || loading}
              onClick={() => {
                invalidate();
                setInput("");
              }}
            >
              <Trash2 size={16} />
            </ActionButton>
          </div>
          <textarea
            id="csv-json-input"
            value={input}
            maxLength={maxInputBytes}
            disabled={loading}
            onChange={(event) => {
              invalidate();
              setInput(event.target.value);
            }}
            placeholder={
              toJson ? "name,team\nRamu,Product" : '[{"name":"Ramu","team":"Product"}]'
            }
            spellCheck={false}
          />
          <div className="utility-meta">
            UTF-8 · Up to 2 MB, 10,000 rows, and 200 columns
          </div>
        </section>
        <section className="utility-panel">
          <div className="utility-panel-heading">
            <label htmlFor="csv-json-output">
              {toJson ? "JSON output" : "CSV output"}
            </label>
            <ActionButton
              variant="ghost"
              size="sm"
              iconOnly
              success={copied}
              title={copied ? "Copied output" : "Copy output"}
              disabled={!result?.output}
              onClick={async () => {
                if (!result) return;
                try {
                  await navigator.clipboard.writeText(result.output);
                  setNotice("Result copied.");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setNotice("Could not copy. Select and copy the output manually.");
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </ActionButton>
          </div>
          <textarea
            id="csv-json-output"
            value={result?.output ?? ""}
            readOnly
            placeholder="Convert to see your result here…"
            spellCheck={false}
          />
          <div className="utility-meta">
            {result
              ? `${result.rows.toLocaleString()} data rows · ${result.columns.toLocaleString()} columns`
              : "Your result appears here"}
          </div>
        </section>
      </div>
      <div className="workspace-toolbar utility-bottom">
        <ActionButton
          variant="secondary"
          disabled={!result?.output || loading}
          onClick={() => {
            if (!result) return;
            setInput(result.output);
            setDirection(toJson ? "json-to-csv" : "csv-to-json");
            invalidate();
          }}
        >
          <ArrowLeftRight size={14} />
          Use result as input
        </ActionButton>
        <ActionButton
          variant="primary"
          disabled={!result?.output}
          onClick={() =>
            result &&
            downloadBlob(
              new Blob([result.output], {
                type: toJson
                  ? "application/json;charset=utf-8"
                  : delimiter === "\t"
                    ? "text/tab-separated-values;charset=utf-8"
                    : "text/csv;charset=utf-8",
              }),
              toJson
                ? "converted.json"
                : delimiter === "\t"
                  ? "converted.tsv"
                  : "converted.csv"
            )
          }
        >
          <Download size={14} />
          Download {toJson ? "JSON" : delimiter === "\t" ? "TSV" : "CSV"}
        </ActionButton>
      </div>
      <p className="utility-hint">
        {toJson
          ? "The first record supplies the column names. CSV values stay strings, preserving IDs, leading zeros, and dates. Blank lines are skipped."
          : "Use an array of objects. All keys become columns; missing values and null become empty cells. Nested objects and arrays become JSON text inside cells."}
      </p>
      {error && (
        <p className="utility-notice" role="alert">
          {error}
        </p>
      )}
      <p className="utility-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
