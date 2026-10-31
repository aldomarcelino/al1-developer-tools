import React from "react";
import { Mic, Volume2, VolumeX, Layers, Info } from "lucide-react";
import type { AudioMode } from "../hooks/use-screen-recorder";
import styles from "../styles.module.css";

interface AudioSettingsProps {
  mode: AudioMode;
  onChange: (mode: AudioMode) => void;
  disabled?: boolean;
  systemAudioNotice?: string | null;
}

export function AudioSettings({
  mode,
  onChange,
  disabled = false,
  systemAudioNotice,
}: AudioSettingsProps) {
  const options: {
    id: AudioMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "none",
      label: "No Audio",
      description: "Mute video, record visual screen only",
      icon: <VolumeX size={18} />,
    },
    {
      id: "mic",
      label: "Microphone",
      description: "Record narration using your microphone",
      icon: <Mic size={18} />,
    },
    {
      id: "system",
      label: "System / Tab Audio",
      description: "Capture browser tab or computer sound",
      icon: <Volume2 size={18} />,
    },
    {
      id: "both",
      label: "Both Audio Sources",
      description: "Mix microphone speech and system sound together",
      icon: <Layers size={18} />,
    },
  ];

  return (
    <div className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <Volume2 size={18} className={styles.sectionHeaderIcon} />
          <h3>Audio Options</h3>
        </div>
        <span className={styles.sectionSubtitle}>
          Select which audio channels to capture with your screen
        </span>
      </div>

      <div
        className={styles.audioOptionsGrid}
        role="radiogroup"
        aria-label="Audio capture option"
      >
        {options.map((opt) => {
          const isSelected = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`${styles.audioCard} ${isSelected ? styles.audioCardSelected : ""}`}
              onClick={() => onChange(opt.id)}
            >
              <div className={styles.audioCardHeader}>
                <span className={styles.audioCardIcon}>{opt.icon}</span>
                <span className={styles.audioCardLabel}>{opt.label}</span>
                <span className={styles.radioIndicator}>
                  {isSelected && <span className={styles.radioDot} />}
                </span>
              </div>
              <p className={styles.audioCardDescription}>{opt.description}</p>
            </button>
          );
        })}
      </div>

      {systemAudioNotice && (
        <div className={styles.audioNotice} role="status">
          <Info size={16} />
          <span>{systemAudioNotice}</span>
        </div>
      )}

      {(mode === "system" || mode === "both") && !systemAudioNotice && (
        <div className={styles.audioTip}>
          <Info size={15} />
          <span>
            <strong>Tip for system audio:</strong> When the browser dialog appears, check
            the <em>&quot;Share audio&quot;</em> or{" "}
            <em>&quot;Also share tab audio&quot;</em> checkbox.
          </span>
        </div>
      )}
    </div>
  );
}
