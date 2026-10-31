import React, { useState } from "react";
import {
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  HardDrive,
  FileVideo,
} from "lucide-react";
import { formatDuration } from "../lib/format-time";
import { formatBytes } from "../lib/format-bytes";
import styles from "../styles.module.css";

interface RecordingPreviewProps {
  previewUrl: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  extension: "webm" | "mp4";
  onDownload: () => void;
  onReset: () => void;
}

export function RecordingPreview({
  previewUrl,
  duration,
  fileSize,
  mimeType,
  extension,
  onDownload,
  onReset,
}: RecordingPreviewProps) {
  const [playbackError, setPlaybackError] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);

  const displayDuration = mediaDuration !== null ? mediaDuration : duration;

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <div className={styles.previewSuccessTitle}>
          <CheckCircle2 size={20} className={styles.successIcon} />
          <h3>Recording Ready</h3>
        </div>
        <span className={styles.previewSubtitle}>
          Preview your recording below or download it directly to your device.
        </span>
      </div>

      {/* Video Player with native controls */}
      <div className={styles.videoPlayerWrapper}>
        <video
          key={previewUrl}
          src={previewUrl}
          controls
          playsInline
          className={styles.videoPlayer}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setMediaDuration(Math.round(d * 1000));
            }
          }}
          onError={() => setPlaybackError(true)}
        />
      </div>

      {playbackError && (
        <p role="alert">
          This browser could not play the video. Your recording is preserved; download it
          and try a compatible desktop player.
        </p>
      )}

      {/* Stats Bar */}
      <div className={styles.metaStatsGrid}>
        <div className={styles.metaStatItem}>
          <Clock size={16} className={styles.metaStatIcon} />
          <div className={styles.metaStatContent}>
            <span className={styles.metaStatLabel}>Duration</span>
            <span className={styles.metaStatValue}>{formatDuration(displayDuration)}</span>
          </div>
        </div>

        <div className={styles.metaStatItem}>
          <HardDrive size={16} className={styles.metaStatIcon} />
          <div className={styles.metaStatContent}>
            <span className={styles.metaStatLabel}>File Size</span>
            <span className={styles.metaStatValue}>{formatBytes(fileSize)}</span>
          </div>
        </div>

        <div className={styles.metaStatItem}>
          <FileVideo size={16} className={styles.metaStatIcon} />
          <div className={styles.metaStatContent}>
            <span className={styles.metaStatLabel}>Format</span>
            <span className={styles.metaStatValue}>
              .{extension.toUpperCase()} ({mimeType.split(";")[0]})
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.previewActionsBar}>
        <button
          type="button"
          className={`${styles.recordButton} ${styles.downloadButton}`}
          onClick={onDownload}
        >
          <Download size={16} />
          <span>Download Recording (.{extension})</span>
        </button>

        <button type="button" className={styles.controlBtnSecondary} onClick={onReset}>
          <RotateCcw size={15} />
          <span>Record Again</span>
        </button>
      </div>
    </div>
  );
}
