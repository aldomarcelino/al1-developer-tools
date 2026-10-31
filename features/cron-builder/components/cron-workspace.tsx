"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, RefreshCw } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { NumberInput } from "@/components/ui/number-input";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import {
  fields,
  presets,
  toBuilder,
  buildExpression,
  validateCron,
  describeCron,
  getTimezones,
  type BuilderField,
  type FieldMode,
} from "../lib/cron";
import { useCronPreview } from "../hooks/use-cron-preview";
import shared from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";
const modes: { value: FieldMode; label: string }[] = [
  { value: "every", label: "Every value" },
  { value: "value", label: "Specific value" },
  { value: "interval", label: "Interval" },
  { value: "range", label: "Range" },
];
export function CronWorkspace() {
  const [mode, setMode] = useState<"builder" | "expression">("builder");
  const [expression, setExpression] = useState("*/5 * * * *");
  const [builder, setBuilder] = useState<BuilderField[]>(() => toBuilder("*/5 * * * *")!);
  const [timezone, setTimezone] = useState("UTC");
  const [after, setAfter] = useState("");
  const zones = useMemo(() => getTimezones(), []);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  useEffect(() => {
    setAfter(new Date().toISOString());
  }, []);
  let error = "",
    description: ReturnType<typeof describeCron> | null = null;
  try {
    validateCron(expression);
    description = describeCron(expression);
  } catch (cause) {
    error = (cause as Error).message;
  }
  const preview = useCronPreview(expression, timezone, after, !error);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "longOffset",
      }),
    [timezone]
  );
  function updateField(index: number, patch: Partial<BuilderField>) {
    const next = builder.map((field, position) =>
      index === position ? { ...field, ...patch } : field
    );
    setBuilder(next);
    setExpression(buildExpression(next));
    dismissSnackbar();
  }
  return (
    <div className={`workspace-page page-width ${shared.toolkit} ${styles.scope}`}>
      <ToolHeader title="Cron Builder & Explainer" icon={<CalendarClock size={24} />} />
      <div className={styles.layout}>
        <section className={`${shared.panel} ${styles.panel}`} aria-label="Cron settings">
          <div className={styles.heading}>
            <h2>Build your schedule</h2>
            <SegmentedTabs
              size="sm"
              ariaLabel="Cron input mode"
              value={mode}
              options={[
                { value: "builder", label: "Builder" },
                { value: "expression", label: "Expression" },
              ]}
              onChange={(value) => {
                if (value === "builder") {
                  const parsed = toBuilder(expression);
                  if (!parsed) {
                    showSnackbar(
                      "This expression cannot be represented by Builder. It is unchanged; keep editing in Expression or choose a preset.",
                      "info"
                    );
                    return;
                  }
                  setBuilder(parsed);
                }
                setMode(value);
                dismissSnackbar();
              }}
            />
          </div>
          <CustomSelect
            layout="stacked"
            label="Preset"
            value={
              presets.some((preset) => preset.value === expression)
                ? expression
                : "custom"
            }
            options={[
              { value: "custom", label: "Custom schedule", disabled: true },
              ...presets,
            ]}
            onChange={(value) => {
              setExpression(value);
              setBuilder(toBuilder(value)!);
              dismissSnackbar();
            }}
          />
          {mode === "builder" ? (
            <div className={styles.builder}>
              {fields.map((field, index) => (
                <div className={styles.fieldRow} key={field.label}>
                  <div className={styles.fieldName}>
                    <strong>{field.label}</strong>
                    <span>
                      {field.min}–{field.max}
                      {index === 4 ? " · Sun = 0 or 7" : ""}
                    </span>
                  </div>
                  <CustomSelect
                    ariaLabel={`${field.label} mode`}
                    value={builder[index].mode}
                    options={modes}
                    onChange={(value) => updateField(index, { mode: value as FieldMode })}
                  />
                  <div className={styles.fieldValues}>
                    {builder[index].mode === "every" ? (
                      <span className={shared.hint}>
                        Every {field.label.toLowerCase()}
                      </span>
                    ) : builder[index].mode === "interval" ? (
                      <label>
                        Every
                        <NumberInput
                          aria-label={`${field.label} interval`}
                          min={1}
                          max={field.max - field.min + 1}
                          step={1}
                          value={builder[index].step}
                          onChange={(event) =>
                            updateField(index, { step: event.target.value })
                          }
                        />
                      </label>
                    ) : (
                      <>
                        <NumberInput
                          aria-label={`${field.label} ${builder[index].mode === "range" ? "range start" : "value"}`}
                          min={field.min}
                          max={field.max}
                          step={1}
                          value={builder[index].start}
                          onChange={(event) =>
                            updateField(index, { start: event.target.value })
                          }
                        />
                        {builder[index].mode === "range" ? (
                          <>
                            <span>to</span>
                            <NumberInput
                              aria-label={`${field.label} range end`}
                              min={field.min}
                              max={field.max}
                              step={1}
                              value={builder[index].end}
                              onChange={(event) =>
                                updateField(index, { end: event.target.value })
                              }
                            />
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <label className={shared.field}>
              Cron expression
              <textarea
                value={expression}
                maxLength={250}
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby="cron-validation"
                onChange={(event) => {
                  setExpression(event.target.value);
                  dismissSnackbar();
                }}
                placeholder="*/5 * * * *"
              />
              <span className={shared.hint}>
                minute · hour · day of month · month · day of week
              </span>
            </label>
          )}
          <div className={styles.expressionBar}>
            <code>{expression || "—"}</code>
            <ActionButton
              iconOnly
              title="Copy cron expression"
              aria-label="Copy cron expression"
              disabled={!!error}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(expression.trim());
                  showSnackbar("Cron expression copied.");
                } catch {
                  showSnackbar(
                    "Could not copy. Select the expression to copy manually.",
                    "error"
                  );
                }
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </ActionButton>
          </div>
          <div
            id="cron-validation"
            role={error ? "alert" : undefined}
            className={error ? shared.error : styles.explanation}
          >
            {error || description?.summary}
          </div>
          <p className={shared.hint}>
            Numeric five-field cron: *, lists, ranges, and / steps. No seconds, Quartz, or
            extensions.
          </p>
          <details className={styles.semantics}>
            <summary>Day matching & daylight saving</summary>
            <p>
              If day of month and day of week both differ from *, either may match (OR).
              Otherwise the restricted field must match. Month always applies. Sunday is 0
              or 7.
            </p>
            <p>
              Times use the selected IANA zone. The parser moves a skipped DST hour
              forward and avoids executing a repeated hour twice. Actual schedulers may
              use different DST rules. This tool only previews schedules; it does not run
              jobs.
            </p>
          </details>
        </section>
        <section
          className={`${shared.panel} ${styles.panel}`}
          aria-label="Next executions"
        >
          <div className={styles.heading}>
            <div>
              <h2>Next 10 executions</h2>
              <p className={shared.hint}>
                Timezone: <strong>{timezone}</strong>
              </p>
            </div>
            <ActionButton
              iconOnly
              title="Refresh preview from now"
              aria-label="Refresh next executions from now"
              onClick={() => setAfter(new Date().toISOString())}
            >
              <RefreshCw size={15} aria-hidden="true" />
            </ActionButton>
          </div>
          <CustomSelect
            layout="stacked"
            label="Preview timezone"
            value={timezone}
            options={zones}
            onChange={setTimezone}
          />
          <p className={shared.hint}>
            After {after ? formatter.format(new Date(after)) : "loading…"}
          </p>
          {error ? (
            <p className={shared.hint}>Correct the expression to preview its schedule.</p>
          ) : !preview ? (
            <p role="status" className={shared.hint}>
              Calculating next executions…
            </p>
          ) : preview.error ? (
            <p role="alert" className={shared.error}>
              {preview.error}
            </p>
          ) : (
            <>
              <ol className={styles.executions}>
                {preview.result?.times.map((instant, index) => (
                  <li key={instant}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <time dateTime={instant}>{formatter.format(new Date(instant))}</time>
                  </li>
                ))}
              </ol>
              {preview.result?.limited ? (
                <p role="status" className={shared.hint}>
                  {preview.result.times.length
                    ? "No further executions found within the preview limits."
                    : "No executions found within the preview limits. Check the selected days and months."}
                </p>
              ) : null}
            </>
          )}
          <p className={`${shared.hint} ${styles.limit}`}>
            Preview searches up to 50 years ahead, with a 3-second processing limit. All
            calculations stay in your browser.
          </p>
        </section>
      </div>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
