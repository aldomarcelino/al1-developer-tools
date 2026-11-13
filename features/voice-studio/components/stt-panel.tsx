"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, AlertCircle, MessageSquareCode, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import {
  getSpeechRecognitionClass,
  isSpeechRecognitionSupported,
  checkMicrophonePermission,
  requestMicrophoneAccess,
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
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const retryCountRef = useRef(0);

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

  // Safely clean up and detach any previous speech recognition session
  const cleanupActiveRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      // Strip all event handlers before aborting so orphaned callbacks never fire
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // Safe ignore
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    isStartingRef.current = false;
    retryCountRef.current = 0;
    cleanupActiveRecognition();
    setIsListening(false);
    onInterimChangeRef.current("");
  }, [cleanupActiveRecognition, setIsListening]);

  // If external state turns off isListening (e.g., TTS playback starts or mode switches), stop recognition
  useEffect(() => {
    if (!isListening && shouldListenRef.current) {
      stopListening();
    }
  }, [isListening, stopListening]);

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    onClashPrevent();

    const RecognitionClass = getSpeechRecognitionClass();
    if (!RecognitionClass) {
      setSupported(false);
      return;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    // Fully tear down any old instances to avoid microphone session collisions
    cleanupActiveRecognition();
    shouldListenRef.current = true;
    retryCountRef.current = 0;

    // Verify microphone availability and prompt for permission if not already granted
    try {
      const permState = await checkMicrophonePermission();
      if (permState !== "granted") {
        const micCheck = await requestMicrophoneAccess();
        if (!micCheck.ok) {
          shouldListenRef.current = false;
          isStartingRef.current = false;
          setErrorMessage(
            micCheck.message ||
              "Microphone access was denied. Please allow microphone permissions in your browser settings."
          );
          setIsListening(false);
          return;
        }
      }
    } catch {
      // Proceed to direct recognition if check fails
    }

    const launchRecognition = () => {
      if (!shouldListenRef.current) {
        isStartingRef.current = false;
        return;
      }

      cleanupActiveRecognition();

      try {
        const recognition = new RecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isStartingRef.current = false;
          retryCountRef.current = 0;
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

        recognition.onerror = async (event) => {
          if (event.error === "no-speech") {
            // Normal silence, keep listening
            return;
          }

          if (event.error === "not-allowed") {
            // Verify if permission is actually granted in browser settings
            const perm = await checkMicrophonePermission();
            if (perm === "granted") {
              // Browser permission IS granted. This is a temporary audio capture hiccup or restart race.
              if (shouldListenRef.current && retryCountRef.current < 3) {
                retryCountRef.current += 1;
                restartTimerRef.current = setTimeout(() => {
                  if (shouldListenRef.current) {
                    launchRecognition();
                  }
                }, 350);
                return;
              }

              // After 3 retries, report transient error instead of falsely claiming user blocked mic
              shouldListenRef.current = false;
              setIsListening(false);
              isStartingRef.current = false;
              setErrorMessage(
                "Speech recognition was temporarily interrupted. Click 'Try Again' or 'Start Dictation' to resume."
              );
              onInterimChangeRef.current("");
              return;
            }

            // Genuinely not allowed by user or operating system
            shouldListenRef.current = false;
            setIsListening(false);
            isStartingRef.current = false;
            setErrorMessage(
              "Microphone access was denied. Please allow microphone permissions in your browser settings (click the lock or camera icon in the address bar)."
            );
            onInterimChangeRef.current("");
            return;
          }

          if (event.error === "network") {
            shouldListenRef.current = false;
            setIsListening(false);
            isStartingRef.current = false;
            setErrorMessage(
              "Speech recognition network service is unavailable. Please check your internet connection."
            );
            onInterimChangeRef.current("");
            return;
          }

          if (event.error === "audio-capture") {
            shouldListenRef.current = false;
            setIsListening(false);
            isStartingRef.current = false;
            setErrorMessage(
              "Microphone audio capture failed. Ensure your microphone is plugged in and not in use by another app."
            );
            onInterimChangeRef.current("");
            return;
          }

          if (event.error !== "aborted") {
            console.warn("Speech recognition warning:", event.error);
          }
        };

        recognition.onend = () => {
          // Auto-reconnect if continuous dictation is desired (handles browser silence timeouts)
          if (shouldListenRef.current) {
            // Delay 200ms so the browser audio hardware releases cleanly before recreating session
            restartTimerRef.current = setTimeout(() => {
              if (shouldListenRef.current) {
                launchRecognition();
              }
            }, 200);
            return;
          }

          setIsListening(false);
          isStartingRef.current = false;
          onInterimChangeRef.current("");
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        isStartingRef.current = false;
        shouldListenRef.current = false;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to start speech recognition."
        );
        setIsListening(false);
      }
    };

    launchRecognition();
  }, [language, setIsListening, onClashPrevent, cleanupActiveRecognition]);

  // Cleanup on unmount or language change
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      isStartingRef.current = false;
      cleanupActiveRecognition();
    };
  }, [language, cleanupActiveRecognition]);

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
          <div style={{ flex: 1 }}>
            <div>{errorMessage}</div>
            <div className={styles.noticeActions}>
              <button
                type="button"
                className={styles.noticeButton}
                onClick={startListening}
              >
                <RotateCcw size={13} />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                className={styles.noticeButton}
                onClick={() => setErrorMessage(null)}
              >
                <span>Dismiss</span>
              </button>
            </div>
          </div>
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
