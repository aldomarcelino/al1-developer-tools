"use client";

import React from "react";
import {
  Download,
  Video,
  Camera,
  Mic,
  Pencil,
  ZoomIn,
  ShieldCheck,
  Sparkles,
  Info,
  Upload,
  FileVideo,
  Puzzle,
} from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { ActionButton } from "@/components/ui/action-button";
import { DropArea } from "@/components/ui/drop-area";
import styles from "../studio.module.css";

interface ScreenRecorderGuideProps {
  onFileProcess?: (file: File) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ScreenRecorderGuide({
  onFileProcess,
  fileInputRef,
}: ScreenRecorderGuideProps) {
  return (
    <div className={styles.captureGuide}>
      {/* Hero Download Card */}
      <div className={styles.guideHero}>
        <div className={styles.guideHeroContent}>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>
              <Sparkles size={12} /> Ramupod Screen Recorder Studio
            </span>
            <span className={styles.badgeItem}>
              <ShieldCheck size={12} /> 100% Private On-Device
            </span>
            <span className={styles.badgeItem}>
              <Video size={12} /> 1080p · 60fps Tab Capture
            </span>
            <span className={styles.badgeItem}>
              <Puzzle size={12} /> Chrome MV3 Extension
            </span>
          </div>

          <h2>Record any browser tab with webcam, microphone, drawings &amp; zoom</h2>
          <p>
            No accounts required, no server uploads, and no watermarks.
            Install our lightweight companion browser extension to capture any web app,
            draw live annotations, and review your recordings instantly right here.
          </p>

          <div className={styles.heroActions}>
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
              Download Ramupod Extension (.ZIP)
            </ActionButton>
            <span className={styles.heroInstallNote}>
              Desktop Chrome · Install via <code>chrome://extensions</code>
            </span>
          </div>
        </div>
      </div>

      {/* Step by step workflow */}
      <section className={styles.guideSection} aria-labelledby="steps-heading">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>RECORDING WORKFLOW</span>
          <h3 id="steps-heading">How to Use Screen Recorder</h3>
          <p>3 simple steps from recording your screen to downloading your video.</p>
        </div>

        <ol className={styles.captureSteps}>
          <li>
            <span className={styles.captureStepNumber} aria-hidden="true">
              01
            </span>
            <h3>Install the Extension</h3>
            <p>
              Download and extract <code>ramupod-companion.zip</code>. Open{" "}
              <code>chrome://extensions</code> in Chrome, enable{" "}
              <strong>Developer mode</strong> in the top-right corner, then click{" "}
              <strong>Load unpacked</strong> and select the extracted folder.
            </p>
          </li>
          <li>
            <span className={styles.captureStepNumber} aria-hidden="true">
              02
            </span>
            <h3>Open Tab &amp; Setup Devices</h3>
            <p>
              Navigate to the website or application you want to record. Click the Ramupod icon
              in your Chrome toolbar and choose <strong>Record this tab</strong>. You can choose
              your camera (floating webcam bubble) and microphone before the 3–2–1 countdown starts.
            </p>
          </li>
          <li>
            <span className={styles.captureStepNumber} aria-hidden="true">
              03
            </span>
            <h3>Annotate, Finish &amp; Review</h3>
            <p>
              While recording, use the floating dock toolbar to draw with pen, highlighter, or zoom in.
              Press <strong>Alt+Shift+S</strong> or click <strong>Finish</strong> in the extension popup —{" "}
              the video immediately opens on this page ready to play and download!
            </p>
          </li>
        </ol>
      </section>

      {/* Features Grid */}
      <section className={styles.guideSection} aria-labelledby="features-heading">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>KEY FEATURES</span>
          <h3 id="features-heading">Features &amp; Capabilities</h3>
          <p>
            Everything you need for product demos, interactive tutorials, and QA bug reports.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Video size={18} />
            </div>
            <h4>Smooth Tab &amp; Audio Capture</h4>
            <p>
              Record any browser tab at a smooth 60fps frame rate with synchronized system and
              browser tab audio.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Camera size={18} />
            </div>
            <h4>Floating Webcam Bubble</h4>
            <p>
              Overlay your face in a movable camera bubble directly on the recorded tab for personal,
              engaging presentations.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Mic size={18} />
            </div>
            <h4>Microphone Voice Narration</h4>
            <p>
              Record crisp voice commentary with input level monitoring and noise cancellation
              before recording starts.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <Pencil size={18} />
            </div>
            <h4>Live Annotations &amp; Drawing</h4>
            <p>
              Draw directly on screen while recording: use pen, highlighter, varied colors, and clear
              strokes instantly from the dock.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <ZoomIn size={18} />
            </div>
            <h4>Instant Zoom &amp; Focus</h4>
            <p>
              Magnify specific areas of the screen instantly (1.5×, 2×, 2.5×) to highlight code lines,
              form fields, or subtle UI elements.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <ShieldCheck size={18} />
            </div>
            <h4>100% On-Device (No Servers)</h4>
            <p>
              All recordings are processed in your browser memory locally. No video files or chunks
              are ever uploaded to the cloud or external servers.
            </p>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className={styles.guideSection} aria-labelledby="shortcuts-heading">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>KEYBOARD SHORTCUTS</span>
          <h3 id="shortcuts-heading">Keyboard Shortcuts</h3>
          <p>
            Control your recording quickly from the captured tab without disturbing your video layout.
          </p>
        </div>

        <div className={styles.shortcutsGrid}>
          <div className={styles.shortcutCard}>
            <div className={styles.shortcutKeys}>
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>Shift</kbd>
              <span>+</span>
              <kbd>H</kbd>
            </div>
            <div className={styles.shortcutInfo}>
              <h4>Show / Hide Toolbar Dock</h4>
              <p>Hide the dock for clean recordings, or show it when you want to draw or zoom.</p>
            </div>
          </div>

          <div className={styles.shortcutCard}>
            <div className={styles.shortcutKeys}>
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>Shift</kbd>
              <span>+</span>
              <kbd>P</kbd>
            </div>
            <div className={styles.shortcutInfo}>
              <h4>Pause / Resume Recording</h4>
              <p>Temporarily pause recording while switching tasks or reading notes, then resume smoothly.</p>
            </div>
          </div>

          <div className={styles.shortcutCard}>
            <div className={styles.shortcutKeys}>
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>Shift</kbd>
              <span>+</span>
              <kbd>S</kbd>
            </div>
            <div className={styles.shortcutInfo}>
              <h4>Finish &amp; Open Recording</h4>
              <p>Finish recording and automatically open the video on this review page.</p>
            </div>
          </div>

          <div className={styles.shortcutCard}>
            <div className={styles.shortcutKeys}>
              <kbd>Esc</kbd>
            </div>
            <div className={styles.shortcutInfo}>
              <h4>Cancel Countdown</h4>
              <p>Abort preparation during the 3–2–1 countdown before recording starts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Tip */}
      <div className={styles.captureTip}>
        <Info size={17} aria-hidden="true" />
        <p>
          <strong>100% private and local transfer.</strong> The extension records using standard
          browser APIs and transfers the video directly to this page without uploading to any remote servers.
        </p>
      </div>

      {/* Troubleshooting Accordion */}
      <Accordion variant="inline" title="Recording limits, device permissions &amp; troubleshooting">
        <div className={styles.captureDetails}>
          <div>
            <h4>Local recording &amp; permissions</h4>
            <p>
              Capture uses Chrome native <code>tabCapture</code> and <code>offscreen</code> APIs.
              The extension popup stays outside the recorded tab. On-page controls, drawings, and
              floating webcam become part of the recorded pixels when visible. Hiding the dock preserves
              your active drawings and camera bubble. Alt+Shift+P pauses or resumes recording.
            </p>
          </div>
          <div>
            <h4>Troubleshooting</h4>
            <p>
              The device preparation page requests permissions for the extension, not for the website being
              recorded. If devices appear blocked, allow access in Chrome settings and your OS privacy settings,
              or uncheck them in the extension popup. After reloading the extension, refresh the tab you wish
              to record before restarting.
            </p>
          </div>
        </div>
      </Accordion>

      {/* Secondary: Preview an existing recording */}
      {onFileProcess ? (
        <Accordion
          variant="inline"
          title="Already have a recording? Preview &amp; inspect video here"
          description="Drag and drop or select an existing .webm or .mp4 file to play, inspect resolution &amp; duration, and download."
          icon={<FileVideo size={18} />}
        >
          <div className={styles.inspectDropWrap}>
            <DropArea
              variant="compact"
              className={styles.dropSection}
              inputRef={fileInputRef}
              icon={<FileVideo size={24} />}
              label="Inspect video file"
              title="Drop your recording here to preview"
              description="Supports .webm and .mp4 video formats · Processed 100% locally on your device"
              hint="Recordings from the Ramupod companion extension automatically open here when you click Finish."
              accept=".webm,.mp4,video/webm,video/mp4,video/*"
              buttonLabel="Browse video file"
              buttonIcon={<Upload size={14} />}
              onFiles={(files) => {
                if (files[0]) onFileProcess(files[0]);
              }}
            />
          </div>
        </Accordion>
      ) : null}
    </div>
  );
}
