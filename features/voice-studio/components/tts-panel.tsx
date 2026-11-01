"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Play, Pause, Square, Volume2, AlertCircle, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { filterVoicesByLanguage } from "../lib/voice-languages";
import { isSpeechSynthesisSupported } from "../lib/speech-recognition";
import styles from "../voice-studio.module.css";

interface TtsPanelProps {
  text: string;
  selectedText: string;
  language: string;
  onClashPrevent: () => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export function TtsPanel({
  text,
  selectedText,
  language,
  onClashPrevent,
  onPlayStateChange,
}: TtsPanelProps) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [playbackState, setPlaybackState] = useState<"idle" | "playing" | "paused">(
    "idle"
  );
  const [spokenWord, setSpokenWord] = useState<string>("");

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support
  useEffect(() => {
    setSupported(isSpeechSynthesisSupported());
  }, []);

  // Populate voices and listen to voiceschanged
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Available voices filtered by language
  const filteredVoices = filterVoicesByLanguage(voices, language);

  const voiceOptions: SelectOption[] = useMemo(() => {
    if (filteredVoices.length === 0) {
      return [
        {
          value: "",
          label: "Default Voice (OS Fallback)",
        },
      ];
    }
    return filteredVoices.map((v) => ({
      value: v.voiceURI,
      label: `${v.name} (${v.lang})`,
    }));
  }, [filteredVoices]);

  // Auto-pick appropriate voice when language changes
  useEffect(() => {
    if (filteredVoices.length > 0) {
      // Pick first matching voice if currently selected voice isn't in filtered list
      const exists = filteredVoices.some((v) => v.voiceURI === selectedVoiceURI);
      if (!exists) {
        setSelectedVoiceURI(filteredVoices[0].voiceURI);
      }
    }
  }, [language, filteredVoices, selectedVoiceURI]);

  useEffect(() => {
    onPlayStateChange?.(playbackState === "playing");
  }, [playbackState, onPlayStateChange]);

  const handleStop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState("idle");
    setSpokenWord("");
  }, []);

  const handlePlay = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Prevent audio feedback with STT microphone
    onClashPrevent();
    window.speechSynthesis.cancel();

    const textToRead = selectedText.trim() ? selectedText : text;
    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = language;

    const chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      setPlaybackState("playing");
    };

    utterance.onpause = () => {
      setPlaybackState("paused");
    };

    utterance.onresume = () => {
      setPlaybackState("playing");
    };

    utterance.onend = () => {
      setPlaybackState("idle");
      setSpokenWord("");
    };

    utterance.onerror = () => {
      setPlaybackState("idle");
      setSpokenWord("");
    };

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const word = textToRead.slice(
          event.charIndex,
          event.charIndex + (event.charLength || 10)
        );
        setSpokenWord(word.trim());
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaybackState("playing");
  }, [
    selectedText,
    text,
    rate,
    pitch,
    language,
    selectedVoiceURI,
    voices,
    onClashPrevent,
  ]);

  const handlePause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setPlaybackState("paused");
    }
  };

  const handleResume = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setPlaybackState("playing");
    }
  };

  // Stop synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const hasContentToRead = (selectedText.trim() || text.trim()).length > 0;

  return (
    <div className={styles.controlPanel}>
      {!supported && (
        <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
          <AlertCircle size={18} />
          <div>Speech Synthesis is not supported in this browser environment.</div>
        </div>
      )}

      {/* Main playback control bar */}
      <div className={styles.panelRow}>
        <div className={styles.panelActions}>
          {playbackState === "idle" && (
            <ActionButton
              variant="primary"
              disabled={!supported || !hasContentToRead}
              onClick={handlePlay}
            >
              <Play size={15} />
              <span>{selectedText.trim() ? "Read Selection" : "Play Text"}</span>
            </ActionButton>
          )}

          {playbackState === "playing" && (
            <ActionButton variant="secondary" onClick={handlePause}>
              <Pause size={15} />
              <span>Pause</span>
            </ActionButton>
          )}

          {playbackState === "paused" && (
            <ActionButton variant="primary" onClick={handleResume}>
              <Play size={15} />
              <span>Resume</span>
            </ActionButton>
          )}

          {playbackState !== "idle" && (
            <ActionButton variant="secondary" onClick={handleStop}>
              <Square size={15} />
              <span>Stop</span>
            </ActionButton>
          )}

          {selectedText.trim().length > 0 && (
            <span className={styles.selectionBadge}>
              <Sparkles size={13} />
              Reading selection only ({selectedText.trim().length} chars)
            </span>
          )}

          {spokenWord && playbackState === "playing" && (
            <span className={styles.interimBanner}>
              Reading: &ldquo;{spokenWord}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Voice and Voice modulation sliders */}
      <div className={styles.ttsControlsGrid}>
        <div className={styles.ttsVoiceItem}>
          <Volume2 size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <CustomSelect
            value={selectedVoiceURI}
            onChange={(uri) => setSelectedVoiceURI(uri)}
            options={voiceOptions}
            label="Voice:"
            ariaLabel="Select voice reader"
            disabled={filteredVoices.length === 0}
          />
        </div>

        <div className={styles.ttsSliderItem}>
          <label htmlFor="tts-speed">Speed:</label>
          <input
            id="tts-speed"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
          />
          <span>{rate.toFixed(1)}x</span>
        </div>

        <div className={styles.ttsSliderItem}>
          <label htmlFor="tts-pitch">Pitch:</label>
          <input
            id="tts-pitch"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
          />
          <span>{pitch.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
