import { Camera, Download, Info } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { ActionButton } from "@/components/ui/action-button";
import { limits } from "../lib/model";
import styles from "../styles.module.css";

export function CaptureGuide() {
  return (
    <div className={styles.captureGuide}>
      <div className={styles.captureDownload}>
        <div>
          <h3>One install. Ready for your next test.</h3>
          <p>Desktop Chrome · ZIP download · Install with Load unpacked</p>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => {
            const link = document.createElement("a");
            link.href = "/qa-capture/ramupod-qa-capture.zip";
            link.download = "ramupod-qa-capture.zip";
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
          <h3>Reproduce the bug</h3>
          <p>
            Open the app you want to test. Click the extension icon and choose
            <strong> Start testing</strong> before reproducing the issue. Use the floating
            controls to inspect Network, flag relevant requests, pause/resume, or save an
            annotated screenshot. Drag the control card to move it.
          </p>
        </li>
        <li>
          <span className={styles.captureStepNumber} aria-hidden="true">
            03
          </span>
          <h3>Finish and review</h3>
          <p>
            Click <strong>Finish</strong> to stop recording and open your evidence in
            Ramupod. Review requests and screenshots before sharing. Add a detailed report
            if needed, or download the capture for later.
          </p>
        </li>
      </ol>

      <div className={styles.captureTip}>
        <Info size={17} aria-hidden="true" />
        <p>
          <strong>Keep DevTools closed while testing.</strong> Chrome displays a debugging
          notice during capture. Only requests made after Start testing are recorded;
          requests made while paused are skipped.
        </p>
      </div>
      <div className={styles.captureScreenshotTip}>
        <Camera size={16} aria-hidden="true" />
        <p>
          <strong>Just need an image?</strong> Choose <strong>Capture screenshot</strong>{" "}
          from the extension to select an area, annotate, and download a PNG without
          starting network capture.
        </p>
      </div>

      <Accordion variant="inline" title="Capture limits, permissions & troubleshooting">
        <div className={styles.captureDetails}>
          <div>
            <h4>What gets captured</h4>
            <p>
              Up to {limits.requests} requests, {limits.durationMs / 60000} minutes,{" "}
              {limits.bodyBytes / 1024} KiB per text body, and{" "}
              {limits.sessionBytes / 1024 / 1024} MiB of session evidence. Save up to{" "}
              {limits.screenshots} screenshots per session. WebSocket frames, full
              streams, service-worker detail, and console logs are not supported.
            </p>
          </div>
          <div>
            <h4>Local capture & permissions</h4>
            <p>
              This is an unpacked extension, not a Chrome Web Store install. Testing uses
              Chrome debugging permission; controls and screenshots use temporary access
              to the active tab. Review redacted text and screenshots before exporting.
            </p>
          </div>
          <div>
            <h4>Results opened in the wrong viewer?</h4>
            <p>
              In the extension, open <strong>Settings & saved capture</strong> and set
              <strong> Open testing results in</strong> to dotools.com or localhost:3000.
              These are the two supported viewer origins.
            </p>
          </div>
          <div>
            <h4>Need to open the capture manually?</h4>
            <p>
              Choose <strong>Download saved capture</strong> in the extension settings,
              then use <strong>Import capture / HAR</strong> on this page. The alternative
              DevTools panel is also available; that capture mode requires DevTools open.
            </p>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
