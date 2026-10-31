import React from "react";
import { Play, Pause, Square, CircleDot, Loader2, Video } from "lucide-react";
import type { RecordingStatus } from "../hooks/use-screen-recorder";
import { formatDuration } from "../lib/format-time";
import styles from "../styles.module.css";

interface RecordingControlsProps {
  status: RecordingStatus;
  duration: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function RecordingControls({
  status,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: RecordingControlsProps) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isRequesting = status === "requesting";
  const isProcessing = status === "processing";
  const isActive = isRecording || isPaused;

  return (
    <div className={styles.controlsBar}>
      {/* Timer and Active State Badge */}
      {isActive && (
        <div className={styles.timerBadgeContainer}>
          <div
            className={`${styles.statusPill} ${
              isRecording ? styles.statusPillRecording : styles.statusPillPaused
            }`}
          >
            <CircleDot
              size={14}
              className={isRecording ? styles.pulsingDot : styles.pausedDot}
            />
            <span>{isRecording ? "REC" : "PAUSED"}</span>
          </div>
          <div className={styles.timerDisplay} aria-live="polite">
            {formatDuration(duration)}
          </div>
        </div>
      )}

      {/* Main Buttons */}
      <div className={styles.buttonsGroup}>
        {status === "idle" && (
          <button
            type="button"
            className={`${styles.recordButton} ${styles.recordButtonStart}`}
            onClick={onStart}
            disabled={disabled}
          >
            <Video size={17} />
            <span>Start Recording</span>
          </button>
        )}

        {isRequesting && (
          <div className={styles.requestingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Select a screen, window, or tab in your browser...</span>
          </div>
        )}

        {isProcessing && (
          <div className={styles.requestingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Packaging recording locally...</span>
          </div>
        )}

        {isActive && (
          <>
            {isRecording ? (
              <button
                type="button"
                className={styles.controlBtnSecondary}
                onClick={onPause}
                title="Pause recording"
              >
                <Pause size={18} />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.controlBtnSecondary}
                onClick={onResume}
                title="Resume recording"
              >
                <Play size={18} />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              className={styles.controlBtnStop}
              onClick={onStop}
              title="Stop recording and preview"
            >
              <Square size={18} fill="currentColor" />
              <span>Stop Recording</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
