"use client";

import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  FileCode2,
  FileOutput,
  Upload,
  Trash2,
  Sparkles,
} from "lucide-react";
import { ConverterEditor } from "./converter-editor";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
import { downloadBlob } from "@/lib/browser/download";
import type { Conversion, YamlDirection } from "../lib/yaml";
import shared from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";

const samples = {
  "json-to-yaml":
    '{\n  "project": "Ramupod",\n  "enabled": true,\n  "tools": ["JSON", "YAML"],\n  "settings": {"retries": 3, "userId": "00123"}\n}',
  "yaml-to-json":
    '# Project settings\nproject: Ramupod\nenabled: true\ntools:\n  - JSON\n  - YAML\nsettings:\n  retries: 3\n  userId: "00123"\n',
};
export function YamlWorkspace() {
  const [direction, setDirection] = useState<YamlDirection>("json-to-yaml");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Conversion | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"input" | "output" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const toYaml = direction === "json-to-yaml";
  function invalidate() {
    revision.current++;
    setResult(null);
    setError("");
    setNotice("");
    setCopied(null);
  }
  async function convert() {
    invalidate();
    const id = revision.current;
    setLoading(true);
    try {
      const { convertYaml } = await import("../lib/yaml");
      const converted = convertYaml(input, direction);
      if (id === revision.current) {
        setResult(converted);
        setNotice("Converted and validated successfully.");
      }
    } catch (cause) {
      if (id === revision.current)
        setError(cause instanceof Error ? cause.message : "Conversion failed.");
    } finally {
      setLoading(false);
    }
  }
  async function load(file?: File) {
    if (!file) return;
    invalidate();
    const id = revision.current;
    setLoading(true);
    try {
      if (file.size > 512 * 1024) throw new Error("Choose a UTF-8 file up to 512 KB.");
      const value = await file.text();
      if (id === revision.current) {
        setInput(value);
        setNotice(
          `Loaded ${file.name}. Select the matching conversion direction, then convert.`
        );
      }
    } catch (cause) {
      if (id === revision.current)
        setError(cause instanceof Error ? cause.message : "Could not read this file.");
    } finally {
      setLoading(false);
    }
  }
  async function copy(value: string, editor: "input" | "output") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(editor);
      setNotice(`${editor === "input" ? "Input" : "Result"} copied.`);
    } catch {
      setNotice("Could not copy. Select the text and copy manually.");
    }
  }
  function download(value: string, format: "json" | "yaml", name: string) {
    downloadBlob(
      new Blob([value], {
        type:
          format === "yaml"
            ? "application/yaml;charset=utf-8"
            : "application/json;charset=utf-8",
      }),
      `${name}.${format}`
    );
  }
  return (
    <div className={`workspace-page page-width ${shared.toolkit}`}>
      <ToolHeader title="JSON ↔ YAML Converter" icon={<FileCode2 size={24} />} />
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <ActionButton
            variant="primary"
            loading={loading}
            disabled={!input.trim()}
            onClick={convert}
          >
            <FileOutput size={15} aria-hidden="true" /> Convert
          </ActionButton>
          <CustomSelect
            layout="side"
            label="Conversion"
            value={direction}
            disabled={loading}
            onChange={(value) => {
              invalidate();
              setDirection(value as YamlDirection);
            }}
            options={[
              { value: "json-to-yaml", label: "JSON → YAML" },
              { value: "yaml-to-json", label: "YAML → JSON" },
            ]}
          />
          <ActionButton
            disabled={!result || loading}
            onClick={() => {
              if (!result) return;
              const value = result.output;
              invalidate();
              setInput(value);
              setDirection(toYaml ? "yaml-to-json" : "json-to-yaml");
            }}
            title="Use output as input and reverse conversion"
          >
            <ArrowLeftRight size={15} /> Reverse
          </ActionButton>
        </div>
        <div className="toolbar-group">
          <ActionButton disabled={loading} onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> Open file
          </ActionButton>
          <ActionButton
            disabled={loading}
            onClick={() => {
              invalidate();
              setInput(samples[direction]);
            }}
          >
            <Sparkles size={15} /> Try example
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={() => {
              invalidate();
              setInput("");
            }}
          >
            <Trash2 size={15} /> Clear
          </ActionButton>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept=".json,.yaml,.yml,.txt,application/json,text/yaml,text/plain"
            onChange={(e) => {
              void load(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className={`${shared.layout} ${styles.editorGrid}`}>
        <ConverterEditor
          label={toYaml ? "JSON input" : "YAML input"}
          value={input}
          placeholder={toYaml ? '{"name":"Ramu"}' : "name: Ramu"}
          copied={copied === "input"}
          onChange={(value) => {
            invalidate();
            setInput(value);
          }}
          onCopy={() => void copy(input, "input")}
          onDownload={() => download(input, toYaml ? "json" : "yaml", "input")}
        />
        <ConverterEditor
          label={toYaml ? "YAML output" : "JSON output"}
          value={result?.output ?? ""}
          placeholder="Your converted result appears here…"
          readOnly
          copied={copied === "output"}
          onCopy={() => result && void copy(result.output, "output")}
          onDownload={() =>
            result && download(result.output, toYaml ? "yaml" : "json", "converted")
          }
        />
      </div>
      <div className={styles.editorNotes}>
        <p className={shared.hint}>
          Paste text or open a UTF-8 file up to 512 KB. Conversion runs on your device.
        </p>
        {result?.warnings.map((warning) => (
          <p key={warning} className={shared.hint}>
            {warning}
          </p>
        ))}
      </div>
      {error && (
        <p className={`${shared.notice} ${shared.error}`} role="alert">
          {error}
        </p>
      )}
      <p className={shared.notice} role="status">
        {notice}
      </p>
    </div>
  );
}
