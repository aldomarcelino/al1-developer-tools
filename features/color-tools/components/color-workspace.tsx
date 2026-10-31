"use client";
import { useState } from "react";
import { Palette, Copy, Check, ArrowLeftRight } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { parseColor, colorFormats, contrastRatio } from "../lib/color";
import styles from "@/styles/shared/toolkit.module.css";
import local from "../styles.module.css";
function inspect(value: string) {
  try {
    const rgb = parseColor(value);
    return { rgb, formats: colorFormats(rgb), error: "" };
  } catch (error) {
    return {
      rgb: null,
      formats: null,
      error: error instanceof Error ? error.message : "Invalid color.",
    };
  }
}
export function ColorWorkspace() {
  const [value, setValue] = useState("#103E3B");
  const [foreground, setForeground] = useState("#103E3B");
  const [background, setBackground] = useState("#F5F9EF");
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const [copied, setCopied] = useState("");
  const color = inspect(value),
    fg = inspect(foreground),
    bg = inspect(background);
  const ratio = fg.rgb && bg.rgb ? contrastRatio(fg.rgb, bg.rgb) : null;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      showSnackbar(`Copied ${text}.`);
    } catch {
      showSnackbar("Could not copy. Select the value and copy it manually.", "error");
    }
  }
  return (
    <div className={`workspace-page page-width ${styles.toolkit}`}>
      <ToolHeader title="Color Tools" icon={<Palette size={24} />} />
      <div className={`${styles.layout} ${local.layout}`}>
        <section
          className={`${styles.panel} ${local.panel}`}
          aria-label="Color converter"
        >
          <div className={local.heading}>
            <h2>Convert a color</h2>
          </div>
          <div className={styles.colorInput}>
            <label className={styles.field}>
              HEX, RGB, or HSL
              <input
                value={value}
                maxLength={100}
                spellCheck={false}
                onChange={(event) => {
                  setValue(event.target.value);
                  setCopied("");
                  dismissSnackbar();
                }}
                aria-invalid={!!color.error}
              />
            </label>
            <input
              type="color"
              aria-label="Pick color"
              value={color.formats?.hex ?? "#103e3b"}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          {color.formats ? (
            <>
              <div
                className={local.swatch}
                style={{ backgroundColor: color.formats.hex }}
                aria-label={`Color preview ${color.formats.hex}`}
              />
              <div className={local.formats}>
                {Object.entries(color.formats).map(([label, text]) => (
                  <div className={`${styles.codeRow} ${local.formatRow}`} key={label}>
                    <div>
                      <small>{label.toUpperCase()}</small>
                      <code>{text}</code>
                    </div>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      iconOnly
                      success={copied === text && !!snackbar}
                      title={
                        copied === text && snackbar
                          ? `${label.toUpperCase()} copied`
                          : `Copy ${label.toUpperCase()}`
                      }
                      onClick={() => copy(text)}
                    >
                      {copied === text && snackbar ? (
                        <Check size={15} aria-hidden="true" />
                      ) : (
                        <Copy size={15} aria-hidden="true" />
                      )}
                    </ActionButton>
                  </div>
                ))}
              </div>
              <div className={local.transfer}>
                <p className={styles.hint}>Try this color in the contrast checker</p>
                <div className={styles.row}>
                  <ActionButton onClick={() => setForeground(color.formats!.hex)}>
                    Use as text
                  </ActionButton>
                  <ActionButton onClick={() => setBackground(color.formats!.hex)}>
                    Use as background
                  </ActionButton>
                </div>
              </div>
            </>
          ) : (
            <p className={`${styles.hint} ${styles.error}`} role="alert">
              {color.error}
            </p>
          )}
          <p className={`${styles.hint} ${local.footer}`}>
            Accepts 3- or 6-digit HEX, RGB values or percentages, and HSL. Colors are
            opaque; HSL output is rounded to one decimal.
          </p>
        </section>
        <section
          className={`${styles.panel} ${local.panel}`}
          aria-label="Contrast checker"
        >
          <div className={local.heading}>
            <h2>Check text contrast</h2>
          </div>
          <div className={local.contrastInputs}>
            {(
              [
                ["Text color", foreground, setForeground, fg],
                ["Background color", background, setBackground, bg],
              ] as const
            ).map(([label, text, update, info]) => (
              <div className={styles.colorInput} key={label}>
                <label className={styles.field}>
                  {label}
                  <input
                    value={text}
                    maxLength={100}
                    onChange={(event) => update(event.target.value)}
                    aria-invalid={!!info.error}
                    spellCheck={false}
                  />
                </label>
                <input
                  type="color"
                  aria-label={`Pick ${label.toLowerCase()}`}
                  value={info.formats?.hex ?? "#ffffff"}
                  onChange={(event) => update(event.target.value)}
                />
              </div>
            ))}
          </div>
          <div className={local.swapRow}>
            <ActionButton
              size="sm"
              onClick={() => {
                setForeground(background);
                setBackground(foreground);
              }}
            >
              <ArrowLeftRight size={14} />
              Swap colors
            </ActionButton>
          </div>
          {ratio !== null ? (
            <>
              <div
                className={styles.contrastPreview}
                style={{ color: fg.formats!.hex, backgroundColor: bg.formats!.hex }}
              >
                <strong>A little more clarity.</strong>
                <p>
                  Useful tools. Less effort. The quick brown fox jumps over the lazy dog.
                </p>
              </div>
              <div>
                <strong className={styles.ratio}>{ratio.toFixed(2)}:1</strong>
                <p className={styles.hint}>Contrast ratio · WCAG 2 text thresholds</p>
              </div>
              <div className={styles.checkGrid}>
                {[
                  ["AA normal", 4.5],
                  ["AAA normal", 7],
                  ["AA large", 3],
                  ["AAA large", 4.5],
                ].map(([label, threshold]) => (
                  <div className={styles.check} key={label}>
                    <span>{label}</span>
                    <strong
                      className={ratio >= Number(threshold) ? styles.pass : styles.fail}
                    >
                      {ratio >= Number(threshold) ? "Pass" : "Fail"}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={`${styles.hint} ${styles.error}`} role="alert">
              {fg.error || bg.error}
            </p>
          )}
          <p className={`${styles.hint} ${local.footer}`}>
            Large text is at least 24 px regular or about 19 px bold. Pass/fail uses the
            unrounded ratio and checks this color pair only.
          </p>
        </section>
      </div>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
