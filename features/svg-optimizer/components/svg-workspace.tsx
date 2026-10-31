"use client";
import { useRef, useState } from "react";
import {
  VectorSquare,
  Upload,
  Sparkles,
  Copy,
  Download,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { DropArea } from "@/components/ui/drop-area";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { downloadBlob } from "@/lib/browser/download";
import { formatBytes } from "@/lib/format/file-size";
import {
  defaultOptions,
  isComponentName,
  optionLabels,
  svgLimits,
  exportFormats,
  sampleSvg,
  type ExportFormat,
} from "../lib/options";
import { useSvgOptimizer } from "../hooks/use-svg-optimizer";
import { SvgPreview } from "./svg-preview";
import styles from "../styles.module.css";
export function SvgWorkspace() {
  const [source, setSource] = useState("");
  const [options, setOptions] = useState(defaultOptions);
  const [componentName, setComponentName] = useState("SvgIcon");
  const [format, setFormat] = useState<ExportFormat>("svg");
  const [filename, setFilename] = useState("optimized");
  const revision = useRef(0);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const validName = isComponentName(componentName);
  const reactFormat = format === "jsx" || format === "tsx";
  const { result, error, pending } = useSvgOptimizer(
    source,
    options,
    validName ? componentName : "SvgIcon"
  );
  const output = reactFormat && !validName ? "" : (result?.exports[format] ?? "");
  const selectedFormat = exportFormats.find((item) => item.value === format)!;
  const saved = result ? (1 - result.optimizedBytes / result.originalBytes) * 100 : 0;
  function edit(value: string) {
    revision.current++;
    setSource(value);
    dismissSnackbar();
  }
  async function loadFile(file?: File) {
    if (!file) return;
    const version = ++revision.current;
    if (!/\.svg$/i.test(file.name)) {
      showSnackbar("Choose a .svg file.", "error");
      return;
    }
    if (file.size > svgLimits.inputBytes) {
      showSnackbar("Keep SVG files within 512 KB.", "error");
      return;
    }
    try {
      const text = await file.text();
      if (version !== revision.current) return;
      setFilename(
        file.name
          .replace(/\.svg$/i, "")
          .replace(/[^a-zA-Z0-9_-]/g, "-")
          .slice(0, 60) || "optimized"
      );
      setSource(text);
      dismissSnackbar();
    } catch {
      showSnackbar("Could not read this SVG file.", "error");
    }
  }
  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <ToolHeader
        title="SVG Optimizer, Viewer & JSX Converter"
        icon={<VectorSquare size={24} />}
      />
      <DropArea
        variant="compact"
        label="Upload SVG"
        title="Give your SVG a lighter footprint"
        description="Drop a .svg file or paste code below · Up to 512 KB · Processed on your device"
        accept=".svg,image/svg+xml"
        buttonLabel="Upload SVG"
        buttonIcon={<Upload size={15} />}
        inputLabel="Choose SVG file"
        onFiles={(files) => {
          if (files.length > 1) {
            showSnackbar("Choose one SVG at a time.", "error");
            return;
          }
          void loadFile(files[0]);
        }}
        actions={
          <ActionButton
            onClick={() => {
              edit(sampleSvg);
              setFilename("sample");
            }}
          >
            <Sparkles size={15} aria-hidden="true" /> Load Sample SVG
          </ActionButton>
        }
      />
      <div className={styles.stats} aria-live="polite">
        <div>
          <span>Original</span>
          <strong>{result ? formatBytes(result.originalBytes) : "—"}</strong>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
        <div>
          <span>Optimized</span>
          <strong>{result ? formatBytes(result.optimizedBytes) : "—"}</strong>
        </div>
        <div className={styles.saving} data-increased={saved < 0}>
          <span>{saved < 0 ? "Size increase" : "Saved"}</span>
          <strong>{result ? `${Math.abs(saved).toFixed(1)}%` : "—"}</strong>
        </div>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.workspaces}>
        <section className={styles.panel} aria-label="SVG input">
          <div className={styles.sectionHeading}>
            <h2>Source SVG</h2>
            <ActionButton
              size="sm"
              iconOnly
              title="Clear SVG source"
              disabled={!source}
              onClick={() => edit("")}
            >
              <Trash2 size={15} aria-hidden="true" />
            </ActionButton>
          </div>
          <textarea
            className={`${styles.editor} ${styles.sourceEditor}`}
            value={source}
            aria-label="SVG source code"
            aria-invalid={!!error}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            placeholder={
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <!-- Paste your SVG here -->\n</svg>'
            }
            onChange={(event) => edit(event.target.value)}
          />
          <p className={styles.hint} role="status">
            {pending
              ? "Optimizing locally…"
              : result
                ? "SVG ready. Preview and exports update automatically."
                : "Upload an SVG, paste code, or load the sample."}
          </p>
        </section>
        <SvgPreview result={result} pending={pending} />
      </div>
      <section className={styles.panel} aria-label="Optimization settings">
        <div className={styles.sectionHeading}>
          <h2>Optimization</h2>
          <ActionButton size="sm" onClick={() => setOptions(defaultOptions)}>
            Reset settings
          </ActionButton>
        </div>
        <div className={styles.options}>
          {optionLabels.map((item) => (
            <label className={styles.check} key={item.key}>
              <input
                type="checkbox"
                checked={options[item.key]}
                onChange={(event) =>
                  setOptions((previous) => ({
                    ...previous,
                    [item.key]: event.target.checked,
                  }))
                }
              />
              {item.label}
            </label>
          ))}
        </div>
        <label className={styles.precision}>
          Decimal precision <strong>{options.precision}</strong>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            disabled={!options.numbers}
            value={options.precision}
            onChange={(event) =>
              setOptions((previous) => ({
                ...previous,
                precision: Number(event.target.value),
              }))
            }
          />
          <span className={styles.hint}>1 smaller · 5 more precise</span>
        </label>
        {result?.warnings.length ? (
          <ul className={styles.warnings}>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className={styles.panel} aria-label="SVG exports">
        <div className={styles.sectionHeading}>
          <h2>Export</h2>
          <div className="flex items-center gap-2">
            <ActionButton
              size="sm"
              iconOnly
              title="Copy output code"
              aria-label="Copy output code"
              disabled={!output || pending}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(output);
                  showSnackbar(`${selectedFormat.label} copied.`);
                } catch {
                  showSnackbar(
                    "Could not copy. Select the output to copy manually.",
                    "error"
                  );
                }
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </ActionButton>
            <ActionButton
              size="sm"
              disabled={!output || pending}
              onClick={() =>
                downloadBlob(
                  new Blob([output], { type: selectedFormat.mime }),
                  `${format === "jsx" || format === "tsx" ? componentName : filename}.${selectedFormat.extension}`
                )
              }
            >
              <Download size={15} aria-hidden="true" /> Download
            </ActionButton>
          </div>
        </div>
        <div className={styles.tabs}>
          <SegmentedTabs
            value={format}
            onChange={setFormat}
            options={exportFormats}
            ariaLabel="SVG output format"
            size="sm"
          />
        </div>
        {reactFormat ? (
          <label className={styles.componentName}>
            React component name
            <input
              value={componentName}
              maxLength={60}
              onChange={(event) => setComponentName(event.target.value)}
              spellCheck={false}
              aria-label="React component name"
              aria-invalid={!validName}
              aria-describedby={!validName ? "svg-name-error" : undefined}
            />
            {!validName ? (
              <span id="svg-name-error" role="alert" className={styles.hint}>
                Use an uppercase letter followed by letters or digits; avoid React and
                SVGProps.
              </span>
            ) : null}
          </label>
        ) : null}
        <textarea
          className={styles.editor}
          readOnly
          value={output}
          aria-label={`${selectedFormat.label} output code`}
          spellCheck={false}
          wrap="off"
          placeholder={
            pending ? "Generating output…" : "Your optimized code will appear here."
          }
        />
        <p className={styles.hint}>
          React uses the modern JSX runtime. Vue includes v-pre to keep SVG text literal.
          Paste Data URIs into an img src or CSS url("…").
        </p>
      </section>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
