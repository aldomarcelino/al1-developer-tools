"use client";

import React, { useState } from "react";
import { Download, RotateCcw, Clock3, HardDrive, FileVideo, Monitor } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { formatDuration } from "../lib/format-time";
import { formatBytes } from "../lib/format-bytes";
import styles from "../studio.module.css";

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
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(
    null
  );

  const displayDuration = mediaDuration !== null ? mediaDuration : duration;

  return (
    <section className={styles.previewCard} aria-label="Recording summary and preview">
      <div className={styles.previewHeader}>
        <div className={styles.previewHeaderTitle}>
          <span className={styles.eyebrow}>RECORDING READY</span>
          <h2>Recording Preview &amp; Export</h2>
          <p>
            Play your recording, inspect video details, and download directly to your
            device.
          </p>
        </div>

        <div className={styles.previewActions}>
          <ActionButton variant="primary" onClick={onDownload}>
            <Download size={14} />
            Download (.{extension.toUpperCase()})
          </ActionButton>

          <ActionButton variant="secondary" onClick={onReset}>
            <RotateCcw size={14} />
            Record or load another
          </ActionButton>
        </div>
      </div>

      {/* Video Player */}
      <div className={styles.videoContainer}>
        <video
          key={previewUrl}
          src={previewUrl}
          height={700}
          controls
          playsInline
          className={styles.videoElement}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setMediaDuration(Math.round(d * 1000));
            }
            if (e.currentTarget.videoWidth && e.currentTarget.videoHeight) {
              setResolution({
                width: e.currentTarget.videoWidth,
                height: e.currentTarget.videoHeight,
              });
            }
          }}
          onError={() => setPlaybackError(true)}
        />
      </div>

      {playbackError && (
        <p className={styles.note} role="alert">
          This browser could not play the video preview. Your recording is preserved
          intact; download it to play with an external media player.
        </p>
      )}

      {/* Video Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Clock3 size={18} />
          <div className={styles.statValue}>{formatDuration(displayDuration)}</div>
          <span className={styles.statLabel}>Duration</span>
        </div>

        <div className={styles.statCard}>
          <Monitor size={18} />
          <div className={styles.statValue}>
            {resolution ? `${resolution.width} × ${resolution.height}` : "Detecting…"}
          </div>
          <span className={styles.statLabel}>Resolution</span>
        </div>

        <div className={styles.statCard}>
          <HardDrive size={18} />
          <div className={styles.statValue}>{formatBytes(fileSize)}</div>
          <span className={styles.statLabel}>File Size</span>
        </div>

        <div className={styles.statCard}>
          <FileVideo size={18} />
          <div className={styles.statValue}>.{extension.toUpperCase()}</div>
          <span className={styles.statLabel}>
            Format ({mimeType ? mimeType.split(";")[0] : "video/webm"})
          </span>
        </div>
      </div>
    </section>
  );
}
