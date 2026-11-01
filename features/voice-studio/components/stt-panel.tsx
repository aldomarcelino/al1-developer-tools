"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, AlertCircle, MessageSquareCode } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import {
  getSpeechRecognitionClass,
  isSpeechRecognitionSupported,
  type ISpeechRecognition,
} from "../lib/speech-recognition";
import { applyVoicePunctuation } from "../lib/voice-punctuation";
import styles from "../voice-studio.module.css";

interface SttPanelProps {
  language: string;
  onTranscriptFinal: (transcript: string) => void;
  onInterimChange: (interim: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  onClashPrevent: () => void;
}

export function SttPanel({
  language,
  onTranscriptFinal,
  onInterimChange,
  isListening,
  setIsListening,
  onClashPrevent,
}: SttPanelProps) {
  const [supported, setSupported] = useState(true);
  const [punctuationEnabled, setPunctuationEnabled] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldListenRef = useRef(false);

  // Keep fresh references to callbacks and settings to prevent stale closures during continuous dictation
  const onTranscriptFinalRef = useRef(onTranscriptFinal);
  const onInterimChangeRef = useRef(onInterimChange);
  const punctuationEnabledRef = useRef(punctuationEnabled);

  useEffect(() => {
    onTranscriptFinalRef.current = onTranscriptFinal;
    onInterimChangeRef.current = onInterimChange;
    punctuationEnabledRef.current = punctuationEnabled;
  });

  // Check Web Speech API support
  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  // Timer counter when listening
  useEffect(() => {
    if (isListening) {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe ignore
      }
    }
    setIsListening(false);
    onInterimChangeRef.current("");
  }, [setIsListening]);

  const startListening = useCallback(() => {
    setErrorMessage(null);
    onClashPrevent();

    const RecognitionClass = getSpeechRecognitionClass();
    if (!RecognitionClass) {
      setSupported(false);
      return;
    }

    shouldListenRef.current = true;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      const recognition = new RecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }

        if (interim) {
          onInterimChangeRef.current(interim);
        } else {
          onInterimChangeRef.current("");
        }

        if (finalChunk.trim()) {
          const processed = applyVoicePunctuation(
            finalChunk,
            punctuationEnabledRef.current
          );
          onTranscriptFinalRef.current(processed);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          // Normal silence, keep listening
          return;
        }
        if (event.error === "not-allowed") {
          shouldListenRef.current = false;
          setErrorMessage(
            "Microphone access was denied. Please allow microphone permissions in your browser settings."
          );
          setIsListening(false);
          onInterimChangeRef.current("");
        } else if (event.error !== "aborted") {
          // Non-fatal error; if user didn't stop, recognition.onend will attempt reconnection
          console.warn("Speech recognition warning:", event.error);
        }
      };

      recognition.onend = () => {
        // Auto-reconnect if continuous dictation is still desired (handles browser silence timeouts)
        if (shouldListenRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // Restart failed, stop gracefully
          }
        }
        setIsListening(false);
        onInterimChangeRef.current("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start speech recognition."
      );
      setIsListening(false);
    }
  }, [language, setIsListening, onClashPrevent]);

  // Cleanup on unmount or language change
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [language]);

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isIndonesian = language.toLowerCase().startsWith("id");
  const punctuationHints = isIndonesian
    ? "titik, koma, enter, baris baru"
    : "period, comma, enter, new line";

  return (
    <div className={styles.controlPanel}>
      {!supported && (
        <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Speech Recognition is not supported by your current browser.</strong>
            <br />
            Browsers like Chrome, Edge, and Safari have full native support. You can still
            use the Text-to-Speech reader and manual text editing tools below.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
          <AlertCircle size={18} />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className={styles.panelRow}>
        <div className={styles.panelActions}>
          <ActionButton
            variant={isListening ? "danger" : "primary"}
            disabled={!supported}
            onClick={toggleRecording}
            className={styles.recButton}
          >
            {isListening ? (
              <>
                <MicOff size={16} />
                <span>Stop Dictation</span>
              </>
            ) : (
              <>
                <Mic size={16} />
                <span>Start Dictation</span>
              </>
            )}
          </ActionButton>

          {isListening && (
            <div className={styles.recBadge} role="status">
              <span className={styles.recDot} aria-hidden="true" />
              <span>RECORDING</span>
              <span className={styles.timer}>[{formatTimer(seconds)}]</span>
            </div>
          )}
        </div>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={punctuationEnabled}
            onChange={(e) => setPunctuationEnabled(e.target.checked)}
          />
          <MessageSquareCode size={15} style={{ color: "var(--green)" }} />
          <span>Voice Punctuation Commands ({punctuationHints})</span>
        </label>
      </div>
    </div>
  );
}
