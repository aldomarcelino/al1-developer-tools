"use client";
import { useState } from "react";
import { ArrowLeftRight, Copy, Ruler } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { NumberInput } from "@/components/ui/number-input";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import {
  categories,
  units,
  convertUnit,
  formatUnitValue,
  type Category,
} from "../lib/units";
import shared from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";
export function UnitWorkspace() {
  const [category, setCategory] = useState<Category>("length");
  const [from, setFrom] = useState("km");
  const [to, setTo] = useState("m");
  const [input, setInput] = useState("1");
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  let output: number | null = null,
    error = "";
  try {
    output = convertUnit(input, category, from, to);
  } catch (cause) {
    error = (cause as Error).message;
  }
  const fromUnit = units[category].find((unit) => unit.value === from)!;
  const toUnit = units[category].find((unit) => unit.value === to)!;
  const relation = `1 ${fromUnit.symbol} = ${formatUnitValue(convertUnit("1", category, from, to))} ${toUnit.symbol}`;
  return (
    <div className={`workspace-page page-width ${shared.toolkit} ${styles.scope}`}>
      <ToolHeader title="Unit Converter" icon={<Ruler size={24} />} />
      <div className={styles.tabs}>
        <SegmentedTabs
          value={category}
          ariaLabel="Unit category"
          options={categories}
          onChange={(value) => {
            setCategory(value);
            setFrom(units[value][0].value);
            setTo(units[value][1].value);
            dismissSnackbar();
          }}
        />
      </div>
      <div className={styles.panels}>
        <section
          className={`${shared.panel} ${styles.panel}`}
          aria-label="Conversion input"
        >
          <div className={styles.heading}>
            <h2>Convert a value</h2>
            <span className={shared.badge}>
              {categories.find((item) => item.value === category)?.label}
            </span>
          </div>
          <label className={shared.field}>
            Value
            <NumberInput
              value={input}
              step="any"
              aria-invalid={!!error}
              aria-describedby="unit-validation"
              onChange={(event) => {
                setInput(event.target.value);
                dismissSnackbar();
              }}
            />
          </label>
          <div className={styles.unitRow}>
            <CustomSelect
              layout="stacked"
              label="From"
              value={from}
              options={units[category]}
              onChange={setFrom}
            />
            <ActionButton
              iconOnly
              title="Swap units"
              aria-label="Swap source and destination units"
              onClick={() => {
                setFrom(to);
                setTo(from);
                dismissSnackbar();
              }}
            >
              <ArrowLeftRight size={17} aria-hidden="true" />
            </ActionButton>
            <CustomSelect
              layout="stacked"
              label="To"
              value={to}
              options={units[category]}
              onChange={setTo}
            />
          </div>
          <p className={shared.hint}>
            {category === "data"
              ? "Decimal: 1 KB = 1,000 B. Binary: 1 KiB = 1,024 B."
              : category === "temperature"
                ? "Celsius, Fahrenheit, and Kelvin. Values must be at or above absolute zero."
                : "Results update as you type."}
          </p>
        </section>
        <section
          className={`${shared.panel} ${styles.panel} ${styles.result}`}
          aria-label="Conversion result"
        >
          <div className={styles.heading}>
            <h2>Result</h2>
            <ActionButton
              iconOnly
              title="Copy result"
              aria-label="Copy conversion result"
              disabled={output === null}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(String(output));
                  showSnackbar("Result copied.");
                } catch {
                  showSnackbar(
                    "Could not copy. Select the result to copy manually.",
                    "error"
                  );
                }
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </ActionButton>
          </div>
          <div className={styles.resultBody} aria-live="polite">
            <output className={styles.value}>
              {output === null ? "—" : formatUnitValue(output)}
            </output>
            <span className={styles.symbol}>{toUnit.symbol}</span>
          </div>
          <p
            id="unit-validation"
            className={`${shared.hint} ${error ? shared.error : ""}`}
            role={error ? "alert" : undefined}
          >
            {error || relation}
          </p>
          <p className={shared.hint}>
            Display: up to 15 significant digits. Copy retains JavaScript number
            precision.
          </p>
        </section>
      </div>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
