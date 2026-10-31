"use client";

import { useState } from "react";
import { Check, Copy, Percent, RotateCcw, Sparkles } from "lucide-react";
import {
  calculatePercentage,
  percentageModes,
  type PercentageMode,
} from "@/features/percentage-calculator/lib/percentage";
import { CustomSelect } from "@/components/ui/custom-select";
import { ToolHeader } from "@/components/cummon/tool-header";
import { NumberInput } from "@/components/ui/number-input";
import { ActionButton } from "@/components/ui/action-button";
const labels = {
  of: ["Percentage (%)", "Number", "Result"],
  ratio: ["Part", "Total", "Percentage"],
  change: ["Original value", "New value", "Percentage change"],
  discount: ["Original price", "Discount (%)", "Price after discount"],
} as const;
export function PercentageWorkspace() {
  const [mode, setMode] = useState<PercentageMode>("of");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [notice, setNotice] = useState("");
  const copied = notice === "Result copied with full precision.";
  let result: ReturnType<typeof calculatePercentage> | undefined;
  let error = "";
  if (first.trim() && second.trim()) {
    try {
      result = calculatePercentage(mode, first, second);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not calculate.";
    }
  }
  const formatted = result
    ? `${new Intl.NumberFormat("en-US", { maximumSignificantDigits: 12 }).format(result.value)}${result.suffix}`
    : "-";
  return (
    <div className="workspace-page page-width utility-tool percentage-workspace">
      <ToolHeader title="Percentage Calculator" icon={<Percent size={24} />} />
      <div className="utility-grid">
        <section className="utility-panel utility-form" aria-label="Percentage settings">
          <CustomSelect
            layout="stacked"
            label="Calculation"
            value={mode}
            onChange={(value) => {
              setMode(value as PercentageMode);
              setNotice("");
            }}
            options={percentageModes}
          />
          <label className="utility-field">
            {labels[mode][0]}
            <NumberInput
              step="any"
              value={first}
              onChange={(e) => {
                setFirst(e.target.value);
                setNotice("");
              }}
              placeholder={mode === "of" ? "20" : "100"}
            />
          </label>
          <label className="utility-field">
            {labels[mode][1]}
            <NumberInput
              step="any"
              value={second}
              onChange={(e) => {
                setSecond(e.target.value);
                setNotice("");
              }}
              placeholder={mode === "discount" ? "20" : "250"}
            />
          </label>
          <div className="utility-toolbar percentage-actions">
            <ActionButton
              onClick={() => {
                setFirst(mode === "of" ? "20" : "100");
                setSecond(mode === "discount" ? "20" : "250");
                setNotice("Example loaded.");
              }}
            >
              <Sparkles aria-hidden="true" />
              Try example
            </ActionButton>
            <ActionButton
              variant="ghost"
              disabled={!first && !second}
              onClick={() => {
                setFirst("");
                setSecond("");
                setNotice("");
              }}
            >
              <RotateCcw aria-hidden="true" />
              Clear
            </ActionButton>
          </div>
          <p className="utility-hint">
            Use a dot for decimals. Results update as you type and display up to 12
            significant digits.
          </p>
        </section>
        <section
          className="utility-panel percentage-result"
          aria-label="Calculation result"
          aria-live="polite"
        >
          <span className="percentage-label">{labels[mode][2]}</span>
          <strong>{formatted}</strong>
          <p className="utility-hint">
            {error || (result ? result.formula : "Enter both values to see your result.")}
          </p>
          {mode === "change" && result && (
            <p className="percentage-direction">
              {result.value > 0
                ? "Increase"
                : result.value < 0
                  ? "Decrease"
                  : "No change"}
            </p>
          )}
          <ActionButton
            variant="primary"
            success={copied}
            disabled={!result}
            onClick={async () => {
              if (!result) return;
              try {
                await navigator.clipboard.writeText(`${result.value}${result.suffix}`);
                setNotice("Result copied with full precision.");
              } catch {
                setNotice("Could not copy. Select and copy the result manually.");
              }
            }}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied!" : "Copy result"}
          </ActionButton>
        </section>
      </div>
      <p className="utility-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
