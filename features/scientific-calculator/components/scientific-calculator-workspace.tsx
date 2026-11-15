"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator,
  Copy,
  Check,
  RotateCcw,
  History,
  Delete,
  Divide,
  Clock,
  X,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { useSnackbar } from "@/hooks/use-snackbar";
import { Snackbar } from "@/components/ui/snackbar";
import {
  evaluateExpression,
  safeLivePreview,
  isValidMathInput,
  sanitizeMathInput,
  type AngleUnit,
} from "../lib/evaluator";
import { toggleExpressionSign } from "../lib/toggle-sign";
import styles from "./calculator.module.css";

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

const STORAGE_KEY = "ramupod_calc_history";

function revealExpressionEnd(input: HTMLInputElement) {
  if (input.selectionStart === input.value.length) {
    // An unfocused input does not automatically scroll when setSelectionRange
    // moves its caret. Reveal appended keypad input without opening the keyboard.
    input.scrollLeft = input.scrollWidth;
  } else if (input.selectionStart === 0) {
    input.scrollLeft = 0;
  }
}

export function ScientificCalculatorWorkspace() {
  const [expression, setExpression] = useState("");
  const [currentResult, setCurrentResult] = useState<string>("");
  const [isCalculated, setIsCalculated] = useState(false);
  const [ans, setAns] = useState<number>(0);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>("deg");
  const [isSecond, setIsSecond] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearedHistory, setClearedHistory] = useState<HistoryItem[] | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const allowInputFocusRef = useRef<boolean | null>(null);
  const pressedButtonRef = useRef<HTMLButtonElement | null>(null);
  const pressStartedRef = useRef(0);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<HTMLElement>(null);
  const shouldScrollHistoryRef = useRef(false);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  const clearButtonPress = useCallback(() => {
    if (pressTimerRef.current !== null) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
    pressedButtonRef.current?.removeAttribute("data-pressed");
    pressedButtonRef.current = null;
  }, []);

  useEffect(() => clearButtonPress, [clearButtonPress]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    allowInputFocusRef.current = event.pointerType === "mouse";
    if (event.pointerType === "mouse") return;
    clearButtonPress();
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!button || button.disabled) return;
    // Leave text-entry mode when the touch keypad is used, even on browsers
    // that keep the input focused after tapping a button.
    inputRef.current?.blur();
    pressedButtonRef.current = button;
    pressStartedRef.current = performance.now();
    button.setAttribute("data-pressed", "true");
  };

  const handlePointerUp = () => {
    if (!pressedButtonRef.current) return;
    // Make quick taps visible, then always release the feedback automatically.
    const remaining = Math.max(0, 140 - (performance.now() - pressStartedRef.current));
    pressTimerRef.current = setTimeout(clearButtonPress, remaining);
  };

  // Scroll to history on mobile when opened
  useEffect(() => {
    if (showHistory && shouldScrollHistoryRef.current) {
      shouldScrollHistoryRef.current = false;
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        const timer = setTimeout(() => {
          historyRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "start",
          });
        }, 60);
        return () => clearTimeout(timer);
      }
    }
  }, [showHistory]);

  const handleToggleHistory = useCallback(() => {
    if (!showHistory) {
      setShowHistory(true);
      shouldScrollHistoryRef.current = true;
    } else {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < 1024 &&
        historyRef.current
      ) {
        const rect = historyRef.current.getBoundingClientRect();
        if (rect.top > window.innerHeight - 80 || rect.bottom < 80) {
          historyRef.current.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "start",
          });
          return;
        }
      }
      setShowHistory(false);
    }
  }, [showHistory]);

  // Load history from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 50));
        }
      }
    } catch {
      // Local storage unavailable or restricted
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Live preview result calculation
  const livePreview = safeLivePreview(expression, { angleUnit, ans });

  const updateInputSelection = useCallback((start: number, end = start) => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      // Updating the caret does not require focus. Touch/pen input must not
      // open the software keyboard; direct taps on the input still work.
      const allowFocus =
        allowInputFocusRef.current ?? window.matchMedia("(pointer: fine)").matches;
      if (allowFocus) input.focus({ preventScroll: true });
      input.setSelectionRange(start, end);
      revealExpressionEnd(input);
    });
  }, []);

  // Insert text at current cursor position in input
  const insertText = useCallback(
    (textToInsert: string) => {
      setCalcError(null);
      const input = inputRef.current;

      // If calculation just completed and user types fresh content
      if (isCalculated) {
        setIsCalculated(false);
        // If it's an operator (+, -, *, /, ^, %, mod), chain from current answer
        if (/^[+\-*/^%×÷]|^mod/.test(textToInsert.trim())) {
          const chained = (currentResult || ans.toString()) + textToInsert;
          setExpression(chained);
          updateInputSelection(chained.length);
          return;
        } else {
          // Fresh number or function starts fresh expression
          setExpression(textToInsert);
          updateInputSelection(textToInsert.length);
          return;
        }
      }

      if (!input) {
        setExpression((prev) => prev + textToInsert);
        return;
      }

      const start = input.selectionStart ?? expression.length;
      const end = input.selectionEnd ?? expression.length;
      const next = expression.slice(0, start) + textToInsert + expression.slice(end);
      setExpression(next);

      // Re-position cursor after insertion
      const nextPos = start + textToInsert.length;
      updateInputSelection(nextPos);
    },
    [expression, isCalculated, ans, currentResult, updateInputSelection]
  );

  // Backspace / Delete last character or selected text
  const handleDelete = useCallback(() => {
    setCalcError(null);
    setIsCalculated(false);
    const input = inputRef.current;
    if (!input) {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    const start = input.selectionStart ?? expression.length;
    const end = input.selectionEnd ?? expression.length;

    if (start === end) {
      if (start === 0) return;
      // Delete 1 character backwards
      const next = expression.slice(0, start - 1) + expression.slice(end);
      setExpression(next);
      updateInputSelection(start - 1);
    } else {
      // Delete selection
      const next = expression.slice(0, start) + expression.slice(end);
      setExpression(next);
      updateInputSelection(start);
    }
  }, [expression, updateInputSelection]);

  // Clear all (AC)
  const handleClear = useCallback(() => {
    setExpression("");
    setCurrentResult("");
    setIsCalculated(false);
    setCalcError(null);
    updateInputSelection(0);
  }, [updateInputSelection]);

  const replaceExpression = (value: string) => {
    setExpression(value);
    setIsCalculated(false);
    setCurrentResult("");
    setCalcError(null);
    updateInputSelection(value.length);
  };

  const handleToggleSign = () => {
    replaceExpression(toggleExpressionSign(isCalculated ? currentResult : expression));
  };

  // Calculate expression
  const handleCalculate = useCallback(() => {
    if (!expression.trim()) return;

    try {
      const res = evaluateExpression(expression, { angleUnit, ans });
      setAns(res.value);
      setCurrentResult(res.formatted);
      setIsCalculated(true);
      setCalcError(null);

      // Add to history
      const newItem: HistoryItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        expression,
        result: res.formatted,
        timestamp: Date.now(),
      };
      saveHistory([newItem, ...history]);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Calculation error.");
    }
  }, [expression, angleUnit, ans, history, saveHistory]);

  // Memory functions
  const handleMemoryAdd = useCallback(() => {
    try {
      const target = expression.trim() ? expression : ans.toString();
      const res = evaluateExpression(target, { angleUnit, ans });
      const nextMem = memory + res.value;
      setMemory(nextMem);
      showSnackbar(`Added to memory (M = ${nextMem})`);
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "Could not add to memory",
        "error"
      );
    }
  }, [expression, ans, angleUnit, memory, showSnackbar]);

  const handleMemorySub = useCallback(() => {
    try {
      const target = expression.trim() ? expression : ans.toString();
      const res = evaluateExpression(target, { angleUnit, ans });
      const nextMem = memory - res.value;
      setMemory(nextMem);
      showSnackbar(`Subtracted from memory (M = ${nextMem})`);
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "Could not subtract from memory",
        "error"
      );
    }
  }, [expression, ans, angleUnit, memory, showSnackbar]);

  const handleMemoryRecall = useCallback(() => {
    insertText(memory.toString());
  }, [insertText, memory]);

  const handleMemoryClear = useCallback(() => {
    setMemory(0);
    showSnackbar("Memory cleared (M = 0)");
  }, [showSnackbar]);

  // Copy result or expression to clipboard
  const handleCopy = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showSnackbar(`Copied: ${text}`);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showSnackbar("Failed to copy", "error");
      }
    },
    [showSnackbar]
  );

  // Keyboard navigation & math typing guard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      handleCalculate();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
      return;
    }

    // Allow browser shortcuts (Copy, Paste, Select All, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // If calculation just completed and user types on physical keyboard
    if (isCalculated) {
      if (/^[+\-*/^%×÷]/.test(e.key)) {
        e.preventDefault();
        setIsCalculated(false);
        const chained = (currentResult || ans.toString()) + e.key;
        setExpression(chained);
        return;
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setIsCalculated(false);
        return;
      } else if (e.key.length === 1) {
        if (isValidMathInput(e.key)) {
          e.preventDefault();
          setIsCalculated(false);
          setExpression(e.key);
          return;
        }
      }
    }

    // Allow control and navigation keys (Backspace, Delete, Arrows, Tab, Home, End)
    if (e.key.length > 1) {
      return;
    }

    // Check if the typed character produces a valid mathematical expression
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? expression.length;
      const end = input.selectionEnd ?? expression.length;
      const nextText = expression.slice(0, start) + e.key + expression.slice(end);

      if (!isValidMathInput(nextText)) {
        e.preventDefault();
      }
    }
  };

  // Change handler with validation and sanitization for pasting / input methods
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    if (isCalculated) {
      setIsCalculated(false);
    }
    if (isValidMathInput(nextVal)) {
      setExpression(nextVal);
      setCalcError(null);
      return;
    }

    // Attempt sanitization for pasted content with special math symbols
    const sanitized = sanitizeMathInput(nextVal);
    if (sanitized && isValidMathInput(sanitized)) {
      setExpression(sanitized);
      setCalcError(null);
    }
  };

  return (
    <div
      className={`workspace-page page-width utility-tool ${styles.workspace}`}
      onPointerDownCapture={handlePointerDown}
      onPointerUpCapture={handlePointerUp}
      onPointerCancelCapture={clearButtonPress}
      onKeyDownCapture={() => {
        allowInputFocusRef.current = true;
      }}
    >
      <ToolHeader title="Scientific Calculator" icon={<Calculator size={24} />} />

      <div
        className={`${styles.container} ${
          showHistory ? styles.containerWithHistory : ""
        }`}
      >
        {/* Main Calculator */}
        <section className={styles.calcCard} aria-label="Scientific Calculator workspace">
          {/* Display Header & Output */}
          <div className={styles.displaySection}>
            <div className={styles.statusBar}>
              <div className={styles.badges}>
                <div
                  className={`${styles.angleControl} ${angleUnit === "rad" ? styles.angleControlRad : ""}`}
                  role="group"
                  aria-label="Angle unit"
                >
                  <span className={styles.angleIndicator} aria-hidden="true" />
                  {(["deg", "rad"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`${styles.angleOption} ${angleUnit === unit ? styles.angleSelected : ""}`}
                      onClick={() => {
                        setAngleUnit(unit);
                        setIsCalculated(false);
                        setCalcError(null);
                      }}
                      aria-pressed={angleUnit === unit}
                      aria-label={unit === "deg" ? "Degrees" : "Radians"}
                      title={unit === "deg" ? "Use degrees" : "Use radians"}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
                {isSecond && (
                  <span className={`${styles.badge} ${styles.badgeActive}`}>2ND</span>
                )}
                {memory !== 0 && (
                  <span className={styles.badge} title={`Current Memory: ${memory}`}>
                    M: {memory}
                  </span>
                )}
              </div>

              <div className={styles.statusActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() =>
                    handleCopy(
                      isCalculated
                        ? currentResult || ans.toString()
                        : livePreview || expression || "0"
                    )
                  }
                  title="Copy current result or expression"
                  aria-label="Copy to clipboard"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={handleClear}
                  title="Clear all (AC)"
                  aria-label="Clear calculator"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Display Area with Smooth Role & Size Switching */}
            <div
              className={`${styles.inputWrapper} ${isCalculated ? styles.inputWrapperCalculated : ""}`}
            >
              {/* Line 1: Formula Input */}
              <input
                id="calculator-expression"
                name="expression"
                ref={inputRef}
                type="text"
                className={`${styles.expressionInput} ${
                  isCalculated ? styles.formulaSecondary : styles.formulaPrimary
                }`}
                value={expression}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onTransitionEnd={(event) => {
                  if (event.propertyName === "font-size") {
                    revealExpressionEnd(event.currentTarget);
                  }
                }}
                placeholder="0"
                aria-label="Math expression input"
                aria-describedby="calculator-shortcuts"
                aria-invalid={Boolean(calcError)}
                autoComplete="off"
                spellCheck="false"
              />

              {/* Line 2: Result Line Underneath */}
              <div className={styles.resultLine}>
                {calcError ? (
                  <span className={styles.errorMessage} role="alert">
                    {calcError}
                  </span>
                ) : (
                  <div
                    className={`${styles.previewContainer} ${
                      isCalculated ? styles.resultPrimary : styles.resultSecondary
                    }`}
                    aria-live="polite"
                  >
                    {!isCalculated && (livePreview || expression) ? (
                      <span className={styles.previewSymbol}>=</span>
                    ) : null}
                    <span className={styles.previewLabel}>
                      {isCalculated ? currentResult : (livePreview ?? "")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Memory & Function Controls Bar */}
          <div className={styles.controlBar}>
            <div className={styles.memoryGroup}>
              <button
                type="button"
                className={styles.memBtn}
                onClick={handleMemoryClear}
                disabled={memory === 0}
                aria-label="Memory Clear"
                title="Memory Clear (MC)"
              >
                MC
              </button>
              <button
                type="button"
                className={styles.memBtn}
                onClick={handleMemoryRecall}
                disabled={memory === 0}
                aria-label="Memory Recall"
                title="Memory Recall (MR)"
              >
                MR
              </button>
              <button
                type="button"
                className={styles.memBtn}
                onClick={handleMemoryAdd}
                aria-label="Memory Add"
                title="Memory Add (M+)"
              >
                M+
              </button>
              <button
                type="button"
                className={styles.memBtn}
                onClick={handleMemorySub}
                aria-label="Memory Subtract"
                title="Memory Subtract (M-)"
              >
                M-
              </button>
            </div>

            <button
              type="button"
              className={`${styles.historyToggle} ${
                showHistory ? styles.historyToggleActive : ""
              }`}
              onClick={handleToggleHistory}
              aria-label="Toggle calculation history"
              aria-expanded={showHistory}
            >
              <History size={14} />
              <span>History</span>
              {history.length > 0 && (
                <span className={styles.historyBadge}>{history.length}</span>
              )}
            </button>
          </div>

          {/* 5-Column Scientific Keypad */}
          <div className={styles.keypad} role="group" aria-label="Calculator keypad">
            {/* Row 1 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc} ${
                isSecond ? styles.keyActive : ""
              }`}
              onClick={() => setIsSecond((s) => !s)}
              aria-label="Second function shift"
              aria-pressed={isSecond}
              title="Show alternate scientific functions"
            >
              2nd
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText("(")}
              aria-label="Open parenthesis"
            >
              (
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(")")}
              aria-label="Close parenthesis"
            >
              )
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyAction}`}
              onClick={handleDelete}
              aria-label="Backspace"
              title="Backspace"
            >
              <Delete size={18} />
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyAction}`}
              onClick={handleClear}
              aria-label="All Clear"
              title="Clear all"
            >
              AC
            </button>

            {/* Row 2 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "asin(" : "sin(")}
              aria-label={isSecond ? "Arcsine" : "Sine"}
            >
              <span>{isSecond ? "sin⁻¹" : "sin"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "acos(" : "cos(")}
              aria-label={isSecond ? "Arccosine" : "Cosine"}
            >
              <span>{isSecond ? "cos⁻¹" : "cos"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "atan(" : "tan(")}
              aria-label={isSecond ? "Arctangent" : "Tangent"}
            >
              <span>{isSecond ? "tan⁻¹" : "tan"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText("%")}
              aria-label="Percent"
            >
              %
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText("/")}
              aria-label="Divide"
            >
              <Divide size={20} strokeWidth={2.25} aria-hidden="true" />
            </button>

            {/* Row 3 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "e^(" : "ln(")}
              aria-label={isSecond ? "e to the power of x" : "Natural logarithm"}
            >
              <span>{isSecond ? "eˣ" : "ln"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "10^(" : "log(")}
              aria-label={isSecond ? "10 to the power of x" : "Base 10 logarithm"}
            >
              <span>{isSecond ? "10ˣ" : "log"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "^2" : "^")}
              aria-label={isSecond ? "Square" : "Exponentiation power"}
            >
              <span>{isSecond ? "x²" : "xʸ"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "cbrt(" : "sqrt(")}
              aria-label={isSecond ? "Cube root" : "Square root"}
            >
              <span>{isSecond ? "∛" : "√"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText("*")}
              aria-label="Multiply"
            >
              ×
            </button>

            {/* Row 4 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText("pi")}
              aria-label="Pi constant"
            >
              π
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("7")}
            >
              7
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("8")}
            >
              8
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("9")}
            >
              9
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText("-")}
              aria-label="Subtract"
            >
              −
            </button>

            {/* Row 5 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText("e")}
              aria-label="Euler's number e"
            >
              e
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("4")}
            >
              4
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("5")}
            >
              5
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("6")}
            >
              6
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText("+")}
              aria-label="Add"
            >
              +
            </button>

            {/* Row 6 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText(isSecond ? "1/(" : "!")}
              aria-label={isSecond ? "Reciprocal 1/x" : "Factorial"}
            >
              <span>{isSecond ? "1/x" : "x!"}</span>
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("1")}
            >
              1
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("2")}
            >
              2
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("3")}
            >
              3
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyOp}`}
              onClick={() => insertText(" mod ")}
              aria-label="Modulo"
            >
              mod
            </button>

            {/* Row 7 */}
            <button
              type="button"
              className={`${styles.key} ${styles.keyFunc}`}
              onClick={() => insertText("ans")}
              aria-label="Previous answer"
              title="Previous answer"
            >
              Ans
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={handleToggleSign}
              aria-label="Change expression sign"
              title="Change the sign of the expression (±)"
            >
              ±
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText("0")}
            >
              0
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyNumber}`}
              onClick={() => insertText(".")}
              aria-label="Decimal point"
            >
              .
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.keyEquals}`}
              onClick={handleCalculate}
              aria-label="Equals calculate"
            >
              =
            </button>
          </div>
          <div className={styles.shortcutBar} id="calculator-shortcuts">
            <span>
              <kbd>Enter</kbd> / <kbd>=</kbd> Calculate
            </span>
            <span>
              <kbd>Esc</kbd> Clear
            </span>
          </div>
        </section>

        {/* Calculation History Sidebar */}
        {showHistory && (
          <aside
            ref={historyRef}
            className={styles.historyCard}
            aria-label="Calculation history"
          >
            <div className={styles.historyHeader}>
              <span className={styles.historyTitle}>
                <Clock size={16} /> History
              </span>
              <div className={styles.historyHeaderActions}>
                {history.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearHistoryBtn}
                    onClick={() => {
                      setClearedHistory(history);
                      saveHistory([]);
                    }}
                    aria-label="Clear all calculation history"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  className={styles.closeHistoryBtn}
                  onClick={() => setShowHistory(false)}
                  aria-label="Close calculation history"
                  title="Close history"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {clearedHistory && (
              <div className={styles.historyUndo} role="status">
                <span>History cleared.</span>
                <button
                  type="button"
                  onClick={() => {
                    saveHistory([...history, ...clearedHistory].slice(0, 50));
                    setClearedHistory(null);
                  }}
                >
                  Undo
                </button>
              </div>
            )}
            <div className={styles.historyList}>
              {history.length === 0 ? (
                <div className={styles.historyEmpty}>No previous calculations yet.</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={styles.historyItem}>
                    <div className={styles.historyExpr}>{item.expression} =</div>
                    <div className={styles.historyRes}>
                      <span>{item.result}</span>
                    </div>
                    <div className={styles.historyActions}>
                      <button
                        type="button"
                        className={styles.historyActionBtn}
                        onClick={() => insertText(item.result)}
                      >
                        Use result
                      </button>
                      <button
                        type="button"
                        className={styles.historyActionBtn}
                        onClick={() => replaceExpression(item.expression)}
                      >
                        Restore equation
                      </button>
                      <button
                        type="button"
                        className={styles.historyActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.result);
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      <div className={styles.examples} role="group" aria-label="Try an example">
        <span>Try an example</span>
        <button
          type="button"
          onClick={() => {
            setAngleUnit("deg");
            replaceExpression("sin(45)*sqrt(100)");
          }}
        >
          sin(45°) × √100
        </button>
        <button type="button" onClick={() => replaceExpression("(12+8)*5")}>
          (12 + 8) × 5
        </button>
        <button type="button" onClick={() => replaceExpression("ln(e^2)")}>
          ln(e²)
        </button>
      </div>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
