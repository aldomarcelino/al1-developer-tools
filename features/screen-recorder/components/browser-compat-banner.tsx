import React from "react";
import { AlertTriangle, Monitor, Laptop } from "lucide-react";
import styles from "../styles.module.css";

export function BrowserCompatBanner() {
  return (
    <div className={styles.compatBanner} role="alert">
      <div className={styles.compatIconWrap}>
        <AlertTriangle size={24} />
      </div>
      <div className={styles.compatContent}>
        <h3>Screen Capture Not Supported in This Browser</h3>
        <p>
          Your current browser or device environment does not support the Screen Capture
          API (<code>getDisplayMedia</code>).
        </p>
        <p className={styles.compatHint}>
          Mobile browsers (such as iOS Safari or Android Chrome) typically restrict screen
          recording. Please open Ramupod on a desktop browser such as Google Chrome,
          Microsoft Edge, Mozilla Firefox, or macOS Safari.
        </p>
        <div className={styles.compatBadges}>
          <span className={styles.compatTag}>
            <Monitor size={14} /> Desktop Chrome / Edge
          </span>
          <span className={styles.compatTag}>
            <Laptop size={14} /> Desktop Safari / Firefox
          </span>
        </div>
      </div>
    </div>
  );
}
