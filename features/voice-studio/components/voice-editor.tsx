"use client";

import React, { useCallback, useMemo } from "react";
import { Copy, Trash2, Download, ArrowRight, Type, FileText, Clock } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { calculateTextMetrics, transformCase } from "../lib/text-metrics";
import { downloadBlob } from "@/lib/browser/download";
import styles from "../voice-studio.module.css";

interface VoiceEditorProps {
  text: string;
  setText: (text: string) => void;
  mode: "stt" | "tts";
  interimTranscript: string;
  onSwitchMode: (mode: "stt" | "tts") => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelectionChange: (selected: string) => void;
  onNotify: (msg: string) => void;
}

export function VoiceEditor({
  text,
  setText,
  mode,
  interimTranscript,
  onSwitchMode,
  textareaRef,
  onSelectionChange,
  onNotify,
}: VoiceEditorProps) {
  const metrics = useMemo(() => calculateTextMetrics(text), [text]);

  const handleSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start !== end) {
      onSelectionChange(text.slice(start, end));
    } else {
      onSelectionChange("");
    }
  }, [text, textareaRef, onSelectionChange]);

  const handleCopy = useCallback(async () => {
    if (!text) {
      onNotify("No text to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onNotify("Text copied to clipboard.");
    } catch {
      onNotify("Failed to copy text. Please copy manually.");
    }
  }, [text, onNotify]);

  const handleClear = useCallback(() => {
    if (!text) return;
    setText("");
    onSelectionChange("");
    onNotify("Editor cleared.");
  }, [text, setText, onSelectionChange, onNotify]);

  const handleCase = useCallback(
    (style: "upper" | "lower" | "title") => {
      if (!text) return;
      setText(transformCase(text, style));
      onNotify(
        `Converted to ${style === "upper" ? "UPPERCASE" : style === "lower" ? "lowercase" : "Title Case"}.`
      );
    },
    [text, setText, onNotify]
  );

  const handleDownload = useCallback(
    (format: "txt" | "md") => {
      if (!text) {
        onNotify("No text to export.");
        return;
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `voice-studio-${timestamp}.${format}`;
      const mime =
        format === "txt" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";
      const blob = new Blob([text], { type: mime });
      downloadBlob(blob, filename);
      onNotify(`Downloaded as .${format}`);
    },
    [text, onNotify]
  );

  return (
    <div className={styles.editorCard}>
      {/* Editor Header Toolbar */}
      <div className={styles.editorHeader}>
        <span className={styles.editorHeaderTitle}>Text Editor</span>

        <div className={styles.editorActions}>
          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={handleCopy}
            title="Copy all text to clipboard"
          >
            <Copy size={13} />
            <span>Copy</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={() => handleCase("upper")}
            title="Convert to UPPERCASE"
          >
            <Type size={13} />
            <span>UPPER</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={() => handleCase("lower")}
            title="Convert to lowercase"
          >
            <Type size={13} />
            <span>lower</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={() => handleCase("title")}
            title="Convert to Title Case"
          >
            <Type size={13} />
            <span>Title</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={() => handleDownload("txt")}
            title="Download as Plain Text file"
          >
            <Download size={13} />
            <span>.TXT</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="secondary"
            disabled={!text}
            onClick={() => handleDownload("md")}
            title="Download as Markdown file"
          >
            <FileText size={13} />
            <span>.MD</span>
          </ActionButton>

          <ActionButton
            size="sm"
            variant="danger"
            disabled={!text}
            onClick={handleClear}
            title="Clear editor"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </ActionButton>
        </div>
      </div>

      {/* Interim Live Transcript Preview Banner */}
      {interimTranscript && mode === "stt" && (
        <div className={styles.interimBanner}>
          <span>Listening… &ldquo;{interimTranscript}&rdquo;</span>
        </div>
      )}

      {/* Main Textarea */}
      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onMouseUp={handleSelect}
          className={styles.textarea}
          placeholder={
            mode === "stt"
              ? "Click 'Start Dictation' and begin speaking, or type/paste your text here..."
              : "Type or paste your text here, then click 'Play' to hear it spoken aloud..."
          }
          spellCheck
        />
      </div>

      {/* Editor Footer: Real-time Statistics & Quick Mode Handoff */}
      <div className={styles.editorFooter}>
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span>Characters:</span>
            <strong>{metrics.characters}</strong>
          </div>
          <div className={styles.statItem}>
            <span>Words:</span>
            <strong>{metrics.words}</strong>
          </div>
          <div className={styles.statItem}>
            <span>Sentences:</span>
            <strong>{metrics.sentences}</strong>
          </div>
          <div className={styles.statItem}>
            <Clock size={12} style={{ color: "var(--muted)" }} />
            <span>Est. Speech Time:</span>
            <strong>{metrics.formattedSpeakingTime}</strong>
          </div>
        </div>

        {text.trim().length > 0 && mode === "stt" && (
          <button
            type="button"
            className={styles.quickSwitchBtn}
            onClick={() => onSwitchMode("tts")}
          >
            <span>Listen to this text in Text-to-Speech</span>
            <ArrowRight size={13} />
          </button>
        )}

        {text.trim().length > 0 && mode === "tts" && (
          <button
            type="button"
            className={styles.quickSwitchBtn}
            onClick={() => onSwitchMode("stt")}
          >
            <span>Continue dictating with Speech-to-Text</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
