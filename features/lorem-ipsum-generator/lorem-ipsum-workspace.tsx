"use client";

import { Check, Copy, FileDown, WandSparkles } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { NumberInput } from "@/components/ui/number-input";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { downloadBlob } from "@/lib/browser/download";
import {
  defaultAmount,
  generateLoremIpsum,
  limits,
  sampleText,
  type Unit,
} from "./lorem-ipsum";
import styles from "./styles.module.css";

const units = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
] as const;

export function LoremIpsumWorkspace() {
  const [unit, setUnit] = useState<Unit>("paragraphs");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [classicStart, setClassicStart] = useState(true);
  const [result, setResult] = useState(sampleText);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  const copied = snackbar?.message === "Placeholder text copied.";

  async function copyText() {
    try {
      await navigator.clipboard.writeText(result);
      showSnackbar("Placeholder text copied.");
    } catch {
      showSnackbar(
        "Could not copy. Select the generated text to copy it manually.",
        "error"
      );
    }
  }

  return (
    <div className={`utility-tool utility-panel ${styles.workspace}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      <form
        className={styles.settings}
        onSubmit={(event) => {
          event.preventDefault();
          setResult(generateLoremIpsum(unit, Number(amount), classicStart));
          showSnackbar("Placeholder text generated.");
        }}
      >
        <CustomSelect
          label="Generate by"
          layout="side"
          className={styles.field}
          value={unit}
          options={units}
          onChange={(value) => {
            const nextUnit = value as Unit;
            setUnit(nextUnit);
            if (Number(amount) > limits[nextUnit]) setAmount(String(limits[nextUnit]));
          }}
        />
        <label className={`utility-field ${styles.field} ${styles.amount}`}>
          Amount
          <span className={styles.amountControl}>
            <NumberInput
              aria-label={`Amount (1–${limits[unit]})`}
              min={1}
              max={limits[unit]}
              step={1}
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span aria-hidden="true">1–{limits[unit]}</span>
          </span>
        </label>
        <label className={`utility-check ${styles.opening}`}>
          <input
            type="checkbox"
            checked={classicStart}
            onChange={(event) => setClassicStart(event.target.checked)}
          />
          Start with “Lorem ipsum…”
        </label>
        <ActionButton variant="primary" type="submit">
          <WandSparkles size={16} aria-hidden="true" /> Generate text
        </ActionButton>
      </form>

      <section className={styles.output} aria-label="Output">
        <div className="utility-panel-heading">
          <label htmlFor="lorem-ipsum-output">Generated text</label>
          <div className={styles.actions} role="group" aria-label="Text actions">
            <ActionButton size="sm" success={copied} onClick={copyText}>
              {copied ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy text"}
            </ActionButton>
            <ActionButton
              iconOnly
              size="sm"
              aria-label="Download TXT"
              onClick={() =>
                downloadBlob(
                  new Blob([result], { type: "text/plain;charset=utf-8" }),
                  "lorem-ipsum.txt"
                )
              }
            >
              <FileDown size={16} aria-hidden="true" />
            </ActionButton>
          </div>
        </div>
        <textarea
          className={styles.preview}
          id="lorem-ipsum-output"
          value={result}
          readOnly
          spellCheck={false}
        />
      </section>
    </div>
  );
}
