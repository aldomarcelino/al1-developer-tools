"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video,
  Download,
  Upload,
  Puzzle,
  Trash2,
  Loader2,
  FileVideo,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { ActionButton } from "@/components/ui/action-button";
import { Accordion } from "@/components/ui/accordion";
import { DropArea } from "@/components/ui/drop-area";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import { ScreenRecorderGuide } from "./screen-recorder-guide";
import { RecordingPreview } from "./recording-preview";
import { generateFilename } from "../lib/media-support";
import { downloadBlob } from "@/lib/browser/download";
import s from "../studio.module.css";

export function ScreenRecorderWorkspace() {
  const [status, setStatus] = useState<"idle" | "receiving" | "completed" | "error">(
    "idle"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number>(0);
  const [mimeType, setMimeType] = useState<string>("video/webm");
  const [extension, setExtension] = useState<"webm" | "mp4">("webm");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  // Exact-origin content bridge communication with Ramupod Companion Extension
  useEffect(() => {
    // Check if initial page load was redirected by extension with #companion-recording
    if (typeof window !== "undefined") {
      const hash = location.hash.slice(1);
      const params = new URLSearchParams(hash);
      if (params.get("companion-recording")) {
        setStatus("receiving");
      }
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;

      if (event.data?.type === "ramupod-recorder-offer") {
        const nonce = event.data.nonce;
        setStatus("receiving");
        window.postMessage({ type: "ramupod-recorder-ready", nonce }, location.origin);
      }

      if (event.data?.type === "ramupod-recorder-package") {
        const {
          blobData,
          duration: dur,
          extension: ext,
          mimeType: mime,
          nonce,
          error,
        } = event.data;

        if (error) {
          setErrorMessage(error);
          setStatus("error");
          return;
        }

        if (blobData) {
          const raw = Array.isArray(blobData) ? new Uint8Array(blobData) : blobData;
          const mimeStr = mime || "video/webm";
          const blob = new Blob([raw], { type: mimeStr });
          const url = URL.createObjectURL(blob);

          if (activeUrlRef.current) {
            URL.revokeObjectURL(activeUrlRef.current);
          }
          activeUrlRef.current = url;
          setPreviewUrl(url);
          setRecordedBlob(blob);
          setDuration(dur || 0);
          setFileSize(blob.size);
          setMimeType(mimeStr);
          setExtension((ext === "mp4" ? "mp4" : "webm") as "webm" | "mp4");
          setStatus("completed");
          setErrorMessage(null);
          // Release the extension's recovery copy only after this page owns a Blob.
          window.postMessage(
            { type: "ramupod-recorder-accepted", nonce },
            location.origin
          );
          history.replaceState(null, "", location.pathname);
          showSnackbar("Recording received from Ramupod extension.");
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
    };
  }, [showSnackbar]);

  const handleReset = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setPreviewUrl(null);
    setRecordedBlob(null);
    setDuration(0);
    setFileSize(0);
    setStatus("idle");
    setErrorMessage(null);
    showSnackbar("Session cleared from this page.");
  }, [showSnackbar]);

  const handleDownload = useCallback(() => {
    if (recordedBlob) {
      const filename = generateFilename(extension);
      try {
        downloadBlob(recordedBlob, filename);
        showSnackbar("Recording download started.");
      } catch {
        showSnackbar("Could not start the download. Please try again.", "error");
      }
    }
  }, [recordedBlob, extension, showSnackbar]);

  const handleFileProcess = useCallback(
    (file: File) => {
      if (
        !file.type.startsWith("video/") &&
        !file.name.endsWith(".webm") &&
        !file.name.endsWith(".mp4")
      ) {
        setErrorMessage("Please select a valid video recording (.webm or .mp4)");
        return;
      }

      const ext: "webm" | "mp4" = file.name.toLowerCase().endsWith(".mp4")
        ? "mp4"
        : "webm";
      const mime = file.type || (ext === "mp4" ? "video/mp4" : "video/webm");
      const url = URL.createObjectURL(file);

      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
      activeUrlRef.current = url;
      setPreviewUrl(url);
      setRecordedBlob(file);
      setFileSize(file.size);
      setDuration(0); // Detected by RecordingPreview onLoadedMetadata
      setMimeType(mime);
      setExtension(ext);
      setStatus("completed");
      setErrorMessage(null);
      showSnackbar("Video loaded locally for preview.");
    },
    [showSnackbar]
  );

  return (
    <div className={`workspace-page page-width ${s.scope}`}>
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      <ToolHeader title="Screen Recorder" icon={<Video size={24} />} />

      {errorMessage ? (
        <div className={s.notice} role="alert">
          {errorMessage}
        </div>
      ) : null}

      <Accordion
        title="Record with Ramupod extension"
        description="Install the extension, record any browser tab with webcam & drawings, and review the video here."
        icon={<Puzzle size={18} />}
      >
        <ScreenRecorderGuide />
      </Accordion>

      {previewUrl ? (
        <>
          <div className={`${s.toolbar} ${s.loadedToolbar}`}>
            <span className={s.loadedLabel}>
              Recording loaded
              <span>Inspected locally · Ready for preview and export</span>
            </span>

            <ActionButton
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              Import another video
            </ActionButton>

            <ActionButton variant="primary" onClick={handleDownload}>
              <Download size={14} />
              Download recording
            </ActionButton>

            <ActionButton variant="danger" onClick={handleReset}>
              <Trash2 size={14} />
              Clear
            </ActionButton>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".webm,.mp4,video/webm,video/mp4,video/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileProcess(f);
                e.target.value = "";
              }}
            />
          </div>

          <RecordingPreview
            key={previewUrl}
            previewUrl={previewUrl}
            duration={duration}
            fileSize={fileSize}
            mimeType={mimeType}
            extension={extension}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </>
      ) : (
        <>
          {status === "receiving" ? (
            <div className={s.receivingBanner} role="status">
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--green)" }}
              />
              <span>
                <strong>Connecting to Ramupod extension...</strong> Receiving video
                package for instant review.
              </span>
            </div>
          ) : null}

          <DropArea
            variant="stacked"
            className={s.dropSection}
            inputRef={fileInputRef}
            icon={<FileVideo size={28} />}
            label="Upload or inspect video recording"
            title="Drop a recording here to preview and inspect"
            description="Supports .webm and .mp4 video files · Inspected 100% locally on your machine"
            hint="Recordings from Ramupod extension open here automatically after you click Finish."
            accept=".webm,.mp4,video/webm,video/mp4,video/*"
            buttonLabel="Browse video file"
            buttonIcon={<Upload size={14} />}
            onFiles={(files) => {
              if (files[0]) handleFileProcess(files[0]);
            }}
          />
        </>
      )}
    </div>
  );
}
