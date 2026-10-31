import React from "react";
import { Monitor, HelpCircle, Shield, Sliders } from "lucide-react";
import styles from "../styles.module.css";

export function ScreenRecorderGuide() {
  return (
    <div className={styles.guideContainer}>
      <div className={styles.guideHeader}>
        <HelpCircle size={20} className={styles.guideHeaderIcon} />
        <h2>How to Use Ramupod Screen Recorder</h2>
      </div>

      <div className={styles.guideGrid}>
        <div className={styles.guideCard}>
          <div className={styles.guideCardIconWrap}>
            <Monitor size={20} />
          </div>
          <h4>1. Choose What to Capture</h4>
          <p>
            When you click <strong>Start Recording</strong>, your browser presents a
            native picker. You can capture your <strong>Entire Screen</strong>, an
            individual <strong>Application Window</strong>, or a single{" "}
            <strong>Browser Tab</strong>.
          </p>
        </div>

        <div className={styles.guideCard}>
          <div className={styles.guideCardIconWrap}>
            <Sliders size={20} />
          </div>
          <h4>2. Audio &amp; Webcam Overlay</h4>
          <p>
            Capture your voice using your microphone, system audio from supported tabs, or
            both. Enable the webcam overlay to include a live picture-in-picture circle or
            rectangle directly inside the recorded video.
          </p>
        </div>

        <div className={styles.guideCard}>
          <div className={styles.guideCardIconWrap}>
            <Shield size={20} />
          </div>
          <h4>3. 100% Private &amp; Local</h4>
          <p>
            No video frames or audio packets are ever uploaded to a remote server. The
            entire video is encoded in your browser using standard{" "}
            <code>MediaRecorder</code> APIs and saved directly to your device.
          </p>
        </div>
      </div>
    </div>
  );
}
