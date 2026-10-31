import React, { useEffect, useRef } from "react";
import { Camera, LayoutGrid, Circle, Square, VideoOff, Eye } from "lucide-react";
import type {
  WebcamOverlayOptions,
  OverlayPosition,
  OverlaySize,
  OverlayShape,
} from "../lib/canvas-compositor";
import styles from "../styles.module.css";

interface WebcamSettingsProps {
  options: WebcamOverlayOptions;
  onChange: (options: WebcamOverlayOptions) => void;
  disabled?: boolean;
  webcamPreviewStream: MediaStream | null;
  onTogglePreview: (enabled: boolean) => void;
}

export function WebcamSettings({
  options,
  onChange,
  disabled = false,
  webcamPreviewStream,
  onTogglePreview,
}: WebcamSettingsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && webcamPreviewStream) {
      videoRef.current.srcObject = webcamPreviewStream;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamPreviewStream]);

  const handleToggle = (checked: boolean) => {
    onChange({ ...options, enabled: checked });
    onTogglePreview(checked);
  };

  const handlePosition = (position: OverlayPosition) => {
    onChange({ ...options, position });
  };

  const handleSize = (size: OverlaySize) => {
    onChange({ ...options, size });
  };

  const handleShape = (shape: OverlayShape) => {
    onChange({ ...options, shape });
  };

  return (
    <div className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <Camera size={18} className={styles.sectionHeaderIcon} />
          <h3>Webcam Overlay (Picture-in-Picture)</h3>
        </div>
        <span className={styles.sectionSubtitle}>
          Composite your camera directly into the recorded video stream
        </span>
      </div>

      <div className={styles.webcamToggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={options.enabled}
            disabled={disabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className={styles.toggleInput}
          />
          <span className={styles.toggleSlider} />
          <span className={styles.toggleText}>
            {options.enabled ? "Webcam overlay enabled" : "Enable camera overlay"}
          </span>
        </label>
        {options.enabled && (
          <span className={styles.webcamLiveBadge}>
            <Eye size={13} /> Live in video export
          </span>
        )}
      </div>

      {options.enabled && (
        <div className={styles.webcamConfigGrid}>
          {/* Controls column */}
          <div className={styles.webcamControlsCol}>
            {/* Position */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>
                <LayoutGrid size={14} /> Screen Position
              </label>
              <div className={styles.buttonSegment}>
                {[
                  { id: "bottom-right", label: "Bottom Right" },
                  { id: "bottom-left", label: "Bottom Left" },
                  { id: "top-right", label: "Top Right" },
                  { id: "top-left", label: "Top Left" },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    disabled={disabled}
                    className={`${styles.segmentBtn} ${
                      options.position === pos.id ? styles.segmentBtnActive : ""
                    }`}
                    onClick={() => handlePosition(pos.id as OverlayPosition)}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Overlay Size</label>
              <div className={styles.buttonSegment}>
                {[
                  { id: "small", label: "Small (15%)" },
                  { id: "medium", label: "Medium (20%)" },
                  { id: "large", label: "Large (25%)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    className={`${styles.segmentBtn} ${
                      options.size === s.id ? styles.segmentBtnActive : ""
                    }`}
                    onClick={() => handleSize(s.id as OverlaySize)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Overlay Shape</label>
              <div className={styles.buttonSegment}>
                <button
                  type="button"
                  disabled={disabled}
                  className={`${styles.segmentBtn} ${
                    options.shape === "circle" ? styles.segmentBtnActive : ""
                  }`}
                  onClick={() => handleShape("circle")}
                >
                  <Circle size={14} /> Circle
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={`${styles.segmentBtn} ${
                    options.shape === "rounded" ? styles.segmentBtnActive : ""
                  }`}
                  onClick={() => handleShape("rounded")}
                >
                  <Square size={14} /> Rounded
                </button>
              </div>
            </div>
          </div>

          {/* Live camera preview preview column */}
          <div className={styles.webcamPreviewCol}>
            <div className={styles.previewBox}>
              {webcamPreviewStream ? (
                <div
                  className={`${styles.cameraPreviewWrapper} ${
                    options.shape === "circle" ? styles.shapeCircle : styles.shapeRounded
                  }`}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={styles.cameraVideoElement}
                  />
                </div>
              ) : (
                <div className={styles.cameraPreviewEmpty}>
                  <VideoOff size={28} />
                  <span>Camera preview will show here</span>
                </div>
              )}
            </div>
            <span className={styles.webcamPreviewNote}>
              Camera preview adjusts to selected shape
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
