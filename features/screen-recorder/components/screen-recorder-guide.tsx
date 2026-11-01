"use client";

import React from "react";
import { Download, Info } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { ActionButton } from "@/components/ui/action-button";
import styles from "../studio.module.css";

export function ScreenRecorderGuide() {
  return (
    <div className={styles.captureGuide}>
      <div className={styles.captureDownload}>
        <div>
          <h3>One install. Ready to record any tab.</h3>
          <p>Desktop Chrome · ZIP download · Install with Load unpacked</p>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => {
            const link = document.createElement("a");
            link.href = "/ramupod-companion.zip";
            link.download = "ramupod-companion.zip";
            link.click();
          }}
        >
          <Download size={15} />
          Download extension
        </ActionButton>
      </div>

      <ol className={styles.captureSteps}>
        <li>
          <span className={styles.captureStepNumber} aria-hidden="true">
            01
          </span>
          <h3>Install the extension</h3>
          <p>
            Unzip the download, then open <code>chrome://extensions</code> in Chrome. Turn
            on <strong>Developer mode</strong>, choose <strong>Load unpacked</strong>, and
            select the unzipped folder.
          </p>
        </li>
        <li>
          <span className={styles.captureStepNumber} aria-hidden="true">
            02
          </span>
          <h3>Record your tab</h3>
          <p>
            Open the page or application you want to record. Click the extension icon and
            choose <strong>Record this tab</strong>. Use the floating dock for microphone
            narration, webcam bubble, live pen drawing, and zoom focus.
          </p>
        </li>
        <li>
          <span className={styles.captureStepNumber} aria-hidden="true">
            03
          </span>
          <h3>Finish and review</h3>
          <p>
            Click <strong>Finish</strong> in the dock to stop recording. Your video opens
            here automatically in full resolution to preview, inspect duration, and
            download.
          </p>
        </li>
      </ol>

      <div className={styles.captureTip}>
        <Info size={17} aria-hidden="true" />
        <p>
          <strong>100% private and local transfer.</strong> The extension records using
          standard browser APIs and transfers the video directly to this page without
          server upload.
        </p>
      </div>

      <Accordion variant="inline" title="Recording limits, permissions & troubleshooting">
        <div className={styles.captureDetails}>
          <div>
            <h4>Local recording &amp; permissions</h4>
            <p>
              Recording uses Chrome native <code>tabCapture</code> and{" "}
              <code>offscreen</code> APIs. Controls and camera overlay run locally inside
              the active tab session.
            </p>
          </div>
          <div>
            <h4>Troubleshooting</h4>
            <p>
              If audio is not recorded, verify that microphone access was granted in the
              extension popup before starting the session.
            </p>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
