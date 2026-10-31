"use client";

import styles from "../styles.module.css";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardPaste,
  Copy,
  LoaderCircle,
  Sparkles,
  TextCursorInput,
  Trash2,
  Undo2,
} from "lucide-react";
import { countText } from "@/features/character-counter/lib/character-count";
import { ToolHeader } from "@/components/cummon/tool-header";

const sample =
  "Hello, Ramupod! 👋\nA little clarity. More room to build.\nTry café, 你好, or a family emoji: 👨‍👩‍👧‍👦";
const maxLength = 200_000;
const format = (value: number) => value.toLocaleString("en-US");

export function CharacterCounterWorkspace() {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [clearedText, setClearedText] = useState<string | null>(null);
  const [pending, setPending] = useState<"paste" | "copy" | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const copied = notice === "Text copied.";
  const counts = useMemo(() => countText(text), [text]);

  async function paste() {
    setPending("paste");
    try {
      const value = await navigator.clipboard.readText();
      if (!value) {
        setNotice("Your clipboard is empty. Copy some text first.");
        return;
      }
      setText(value.slice(0, maxLength));
      setClearedText(null);
      input.current?.focus();
      setNotice(
        value.length > maxLength
          ? "Pasted the first 200,000 UTF-16 units."
          : "Text pasted."
      );
    } catch {
      setNotice("Clipboard access is unavailable. Paste directly into the text field.");
      input.current?.focus();
    } finally {
      setPending(null);
    }
  }

  async function copy() {
    setPending("copy");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Text copied.");
    } catch {
      setNotice("Could not copy. Select the text and copy it manually.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={`workspace-page page-width character-counter ${styles.scope}`}>
      <ToolHeader title="Character Counter" icon={<TextCursorInput size={24} />} />
      <div className="counter-layout">
        <section className="counter-editor" aria-label="Text input">
          <div className="counter-toolbar">
            <label htmlFor="counter-text">Your text</label>
            <div className="counter-actions" role="group" aria-label="Text actions">
              <button
                type="button"
                className="button primary counter-action"
                onClick={paste}
                disabled={pending !== null}
                aria-busy={pending === "paste"}
              >
                {pending === "paste" ? (
                  <LoaderCircle size={15} className="counter-spinner" />
                ) : (
                  <ClipboardPaste size={15} />
                )}
                Paste text
              </button>
              <button
                type="button"
                className={`button counter-action${copied ? " is-copied" : ""}`}
                onClick={copy}
                disabled={!text || pending !== null}
                aria-busy={pending === "copy"}
              >
                {pending === "copy" ? (
                  <LoaderCircle size={15} className="counter-spinner" />
                ) : copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
                {copied ? "Copied" : "Copy text"}
              </button>
              <button
                type="button"
                className="button counter-action counter-clear"

                onClick={() => {
                  setClearedText(text);
                  setText("");
                  setNotice("Text cleared.");
                }}
                disabled={!text || pending !== null}
              >
                <Trash2 size={15} /> Clear
              </button>
            </div>
          </div>
          <textarea
            id="counter-text"
            ref={input}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setNotice("");
              setClearedText(null);
            }}
            maxLength={maxLength}
            placeholder="Paste your text, draft, or code here…"
            spellCheck={false}
            aria-describedby="counter-limit"
          />
          <div className="counter-editor-footer">
            <span id="counter-limit">{format(text.length)} / 200,000 UTF-16 units</span>
            <button
              type="button"
              className="counter-example"
              disabled={pending !== null}
              onClick={() => {
                setText(sample);
                setClearedText(null);
                input.current?.focus();
                setNotice("Sample text loaded.");
              }}
            >
              <Sparkles size={14} /> Try example
            </button>
          </div>
        </section>
        <aside className="counter-results" aria-label="Text statistics">
          <div className="counter-total">
            <span className="counter-eyebrow">A LITTLE TEXT, MEASURED</span>
            <strong>{format(counts.characters)}</strong>
            <span>Characters</span>
            <p>Includes spaces and line breaks. Combined emoji count as one.</p>
          </div>
          <dl className="counter-stat-grid">
            {(
              [
                ["Without whitespace", counts.withoutWhitespace],
                ["Words", counts.words],
                ["Lines", counts.lines],
                ["UTF-8 bytes", counts.bytes],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{format(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="counter-technical">
            <span>
              <span>Unicode code points</span>
              <strong>{format(counts.codePoints)}</strong>
            </span>
            <span>
              <span>UTF-16 units</span>
              <strong>{format(counts.codeUnits)}</strong>
            </span>
          </div>
        </aside>
      </div>
      <div className="counter-feedback">
        <p className="counter-notice" role="status">
          {notice}
        </p>
        {clearedText !== null && !text && (
          <button
            type="button"
            className="counter-undo"
            onClick={() => {
              setText(clearedText);
              setClearedText(null);
              setNotice("Text restored.");
              input.current?.focus();
            }}
          >
            <Undo2 size={14} /> Undo clear
          </button>
        )}
      </div>
    </div>
  );
}
