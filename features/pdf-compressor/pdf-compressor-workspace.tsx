"use client";

import { ArrowRight, CheckCircle2, FileArchive, FileDown, FileText } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Accordion } from "@/components/ui/accordion";
import { DropArea } from "@/components/ui/drop-area";
import { NumberInput } from "@/components/ui/number-input";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { downloadBlob } from "@/lib/browser/download";
import { formatBytes } from "@/lib/format/file-size";
import { compressPdf, type Preset } from "./compress-pdf";
import styles from "./styles.module.css";

const levels = [
  { value: "light", label: "Light", description: "Sharper images, smaller savings." },
  {
    value: "balanced",
    label: "Balanced",
    description: "Good image quality with a smaller file.",
  },
  { value: "strong", label: "Strong", description: "Smaller file, softer images." },
] as const satisfies readonly { value: Preset; label: string; description: string }[];

export function PdfCompressorWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<Blob | null | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function selectFiles(files: File[]) {
    if (files.length !== 1) {
      setError("Choose one PDF at a time.");
      return;
    }
    const validation = validatePdfFile(files[0]);
    setError(validation.error ?? "");
    if (validation.valid) {
      setFile(files[0]);
      setResult(undefined);
    }
  }

  async function compress(source: File) {
    setBusy(true);
    setError("");
    try {
      setResult(await compressPdf(source, preset));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not compress this PDF.");
    } finally {
      setBusy(false);
    }
  }

  const resultSize = result?.size ?? file?.size ?? 0;
  const targetBytes = Number(target) * 1_000_000;

  return (
    <div className={styles.workspace}>
      <DropArea
        accept=".pdf,application/pdf"
        variant={file ? "compact" : "stacked"}
        title={file?.name ?? "Add a PDF to Compress"}
        description={
          file
            ? formatBytes(file.size)
            : "Drag and drop a PDF here or choose one from your device."
        }
        hint={file ? undefined : "One PDF up to 50 MB · Processed on your device"}
        icon={<FileText size={24} />}
        buttonLabel={file ? "Replace PDF" : "Choose PDF"}
        buttonVariant={file ? "secondary" : "primary"}
        disabled={busy}
        onFiles={selectFiles}
      />
      <div role="status">{error ? <p className={styles.error}>{error}</p> : null}</div>

      {file && result === undefined ? (
        <form
          className="utility-panel utility-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void compress(file);
          }}
        >
          <fieldset className={styles.levels} disabled={busy}>
            <legend>Compression Level</legend>
            <div className={styles.options}>
              {levels.map(({ value, label, description }) => (
                <label className={styles.option} key={value}>
                  <input
                    type="radio"
                    name="compression-level"
                    checked={preset === value}
                    onChange={() => setPreset(value)}
                  />
                  <span>
                    <strong>{label}</strong>
                    {value === "balanced" ? (
                      <span className={styles.badge}>Recommended</span>
                    ) : null}
                    <span className={styles.description}>{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Accordion
            title="Check an Upload Limit"
            description="Optional"
            variant="inline"
            className={styles.limit}
          >
            <label className="utility-field">
              Maximum File Size (MB)
              <NumberInput
                name="upload-limit"
                autoComplete="off"
                inputMode="decimal"
                min={0.01}
                step="any"
                max={50}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                onInvalid={(event) => {
                  const details = event.currentTarget.closest("details");
                  if (details) details.open = true;
                }}
                aria-describedby="pdf-limit-description"
              />
            </label>
            <p className="utility-hint" id="pdf-limit-description">
              Enter your upload limit, for example 1 for 1 MB or 0.2 for 200 KB. We’ll
              check the result against it.
            </p>
          </Accordion>
          <div>
            <ActionButton type="submit" variant="primary" loading={busy}>
              {busy ? null : <FileArchive size={16} aria-hidden="true" />}
              {busy ? "Compressing…" : "Compress PDF"}
            </ActionButton>
          </div>
        </form>
      ) : null}

      <div role="status">
        {file && result !== undefined ? (
          <section
            className="utility-panel utility-form"
            aria-labelledby="pdf-result-heading"
          >
            <div className={styles.resultHeading}>
              {result ? <CheckCircle2 size={22} aria-hidden="true" /> : null}
              <h2 id="pdf-result-heading">
                {result ? "Your Compressed PDF Is Ready" : "File Size Stayed the Same"}
              </h2>
            </div>
            {result ? (
              <div className={styles.comparison}>
                <div>
                  <span>Original</span>
                  <strong>{formatBytes(file.size)}</strong>
                </div>
                <ArrowRight size={18} aria-hidden="true" />
                <div>
                  <span>Compressed</span>
                  <strong>{formatBytes(result.size)}</strong>
                </div>
                <span className={styles.badge}>
                  {((1 - result.size / file.size) * 100).toFixed(1)}% smaller
                </span>
              </div>
            ) : (
              <p className="utility-hint">
                The original is {formatBytes(file.size)}.{" "}
                {preset === "strong"
                  ? "It may already be optimized."
                  : "Try Strong for a smaller file."}
              </p>
            )}
            {targetBytes > 0 ? (
              <p className="utility-hint">
                {resultSize <= targetBytes
                  ? `Fits your ${target} MB upload limit.`
                  : `Exceeds your ${target} MB upload limit.`}
              </p>
            ) : null}
            <div className={styles.actions}>
              {result ? (
                <ActionButton
                  variant="primary"
                  onClick={() =>
                    downloadBlob(result, `${file.name.slice(0, -4)}-compressed.pdf`)
                  }
                >
                  <FileDown size={16} aria-hidden="true" /> Download PDF
                </ActionButton>
              ) : null}
              <ActionButton onClick={() => setResult(undefined)}>
                Try Another Level
              </ActionButton>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
