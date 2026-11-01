"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Mic, Volume2, Globe } from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { SegmentedTabs, type TabOption } from "@/components/ui/segmented-tabs";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { SttPanel } from "./stt-panel";
import { TtsPanel } from "./tts-panel";
import { VoiceEditor } from "./voice-editor";
import { SUPPORTED_LANGUAGES } from "../lib/voice-languages";
import styles from "../voice-studio.module.css";

export interface VoiceStudioCoreProps {
  defaultMode?: "stt" | "tts";
}

export function VoiceStudioCore({ defaultMode = "stt" }: VoiceStudioCoreProps) {
  const [mode, setMode] = useState<"stt" | "tts">(defaultMode);
  const [text, setText] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [language, setLanguage] = useState<string>("id-ID");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  // Mode switcher options
  const modeOptions: TabOption<"stt" | "tts">[] = [
    {
      value: "stt",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Mic size={15} />
          Speech to Text (Dictation)
        </span>
      ),
    },
    {
      value: "tts",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Volume2 size={15} />
          Text to Speech (Reader)
        </span>
      ),
    },
  ];

  // Stop any active speech or mic when switching modes or navigating
  const cancelAllAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const handleModeSwitch = useCallback(
    (newMode: "stt" | "tts") => {
      cancelAllAudio();
      setMode(newMode);
      // Synchronize URL path smoothly if in browser
      if (typeof window !== "undefined") {
        const targetPath =
          newMode === "stt" ? "/tools/speech-to-text" : "/tools/text-to-speech";
        if (window.location.pathname !== targetPath) {
          window.history.replaceState(null, "", targetPath);
        }
      }
    },
    [cancelAllAudio]
  );

  // Prevent TTS and STT from clashing
  const handleSttStartClashPrevent = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleTtsPlayClashPrevent = useCallback(() => {
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllAudio();
    };
  }, [cancelAllAudio]);

  // Insert recognized speech at cursor position or append to continuous story
  const handleTranscriptFinal = useCallback((finalChunk: string) => {
    if (!finalChunk) return;

    setText((prevText) => {
      const textarea = textareaRef.current;
      let start = prevText.length;
      let end = prevText.length;

      // If textarea is actively focused, insert at user's cursor position; otherwise append to end
      if (
        textarea &&
        document.activeElement === textarea &&
        typeof textarea.selectionStart === "number"
      ) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }

      let insertion = finalChunk;
      const charBefore = prevText.slice(Math.max(0, start - 1), start);
      const isPunctuation = /^[.,?!:;\n]/.test(insertion);
      if (start > 0 && !/\s$/.test(charBefore) && !isPunctuation) {
        insertion = " " + insertion;
      }

      const before = prevText.slice(0, start);
      const after = prevText.slice(end);
      const updated = before + insertion + after;
      const newCursor = start + insertion.length;

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursor;
          textareaRef.current.selectionEnd = newCursor;
        }
      });

      return updated;
    });
  }, []);

  const languageOptions: SelectOption[] = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((item) => ({
        value: item.code,
        label: `${item.flag} ${item.name} (${item.nativeName})`,
      })),
    []
  );

  return (
    <div className={`workspace-page page-width ${styles.scope}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />

      <ToolHeader
        title={
          mode === "stt"
            ? "Speech to Text & Voice Dictation"
            : "Text to Speech & Voice Reader"
        }
        icon={mode === "stt" ? <Mic size={24} /> : <Volume2 size={24} />}
      />

      {/* Top Bar: Mode Switcher & Global Language Selector */}
      <div className={styles.topBar}>
        <div className={styles.modeSwitchWrap}>
          <SegmentedTabs
            value={mode}
            onChange={handleModeSwitch}
            options={modeOptions}
            size="md"
            ariaLabel="Voice Studio Mode"
          />
        </div>

        <div className={styles.langWrap}>
          <Globe size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <CustomSelect
            value={language}
            onChange={(val) => {
              cancelAllAudio();
              setLanguage(val);
            }}
            options={languageOptions}
            label="Language:"
            ariaLabel="Dictation and voice reading language"
          />
        </div>
      </div>

      {/* Active Mode Control Panel */}
      {mode === "stt" ? (
        <SttPanel
          language={language}
          onTranscriptFinal={handleTranscriptFinal}
          onInterimChange={setInterimTranscript}
          isListening={isListening}
          setIsListening={setIsListening}
          onClashPrevent={handleSttStartClashPrevent}
        />
      ) : (
        <TtsPanel
          text={text}
          selectedText={selectedText}
          language={language}
          onClashPrevent={handleTtsPlayClashPrevent}
        />
      )}

      {/* Text Editor */}
      <VoiceEditor
        text={text}
        setText={setText}
        mode={mode}
        interimTranscript={interimTranscript}
        onSwitchMode={handleModeSwitch}
        textareaRef={textareaRef}
        onSelectionChange={setSelectedText}
        onNotify={showSnackbar}
      />
    </div>
  );
}
