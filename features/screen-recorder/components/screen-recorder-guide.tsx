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
            choose <strong>Record this tab</strong>. If prompted, allow and check your
            microphone or camera on the preparation page. A{" "}
            <strong>3–2–1 countdown</strong>
            and shortcut hints appear in your tab, then disappear before recording. Press{" "}
            <strong>Esc</strong> to cancel the countdown. Controls start hidden to keep
            your recording clean. Use <strong>Alt+Shift+H</strong> in the recorded tab or
            the popup&apos;s <strong>Show floating controls in video</strong> option for
            pen drawing and zoom. Visible controls are included in the video.
          </p>
        </li>
        <li>
          <span className={styles.captureStepNumber} aria-hidden="true">
            03
          </span>
          <h3>Finish and review</h3>
          <p>
            Click <strong>Finish &amp; Open in Ramupod</strong> in the extension popup, or
            press <strong>Alt+Shift+S</strong> in the recorded tab. Your video opens here
            automatically in full resolution to preview, inspect duration, and download.
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
              <code>offscreen</code> APIs. The popup sits outside the recorded tab.
              On-page controls, drawings, and the optional camera bubble are part of the
              tab&apos;s pixels when visible. Hiding the dock keeps drawings and the
              camera bubble visible. Alt+Shift+P pauses or resumes recording.
            </p>
          </div>
          <div>
            <h4>Troubleshooting</h4>
            <p>
              The preparation page requests permissions for the extension, rather than the
              website being recorded. If a device is blocked, allow access in Chrome and
              your system privacy settings, or uncheck it in the popup. After reloading
              the extension, refresh the recorded tab before starting again.
            </p>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
