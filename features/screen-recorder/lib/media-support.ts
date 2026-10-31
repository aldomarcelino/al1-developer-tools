export interface SupportedMimeOption {
  mimeType: string;
  extension: "webm" | "mp4";
  label: string;
  codec: string;
}

const CANDIDATE_WITH_AUDIO = [
  {
    mime: "video/webm;codecs=vp8,opus",
    ext: "webm" as const,
    label: "WebM (VP8 + Opus)",
    codec: "VP8",
  },
  {
    mime: "video/webm;codecs=vp9,opus",
    ext: "webm" as const,
    label: "WebM (VP9 + Opus)",
    codec: "VP9",
  },
  {
    mime: "video/webm",
    ext: "webm" as const,
    label: "WebM",
    codec: "Default",
  },
  {
    mime: "video/mp4;codecs=avc1,mp4a.40.2",
    ext: "mp4" as const,
    label: "MP4 (H.264 + AAC)",
    codec: "H.264",
  },
  {
    mime: "video/mp4",
    ext: "mp4" as const,
    label: "MP4",
    codec: "Default",
  },
];

const CANDIDATE_VIDEO_ONLY = [
  {
    mime: "video/webm;codecs=vp8",
    ext: "webm" as const,
    label: "WebM (VP8)",
    codec: "VP8",
  },
  {
    mime: "video/webm;codecs=vp9",
    ext: "webm" as const,
    label: "WebM (VP9)",
    codec: "VP9",
  },
  {
    mime: "video/webm",
    ext: "webm" as const,
    label: "WebM",
    codec: "Default",
  },
  {
    mime: "video/mp4;codecs=avc1",
    ext: "mp4" as const,
    label: "MP4 (H.264)",
    codec: "H.264",
  },
  {
    mime: "video/mp4",
    ext: "mp4" as const,
    label: "MP4",
    codec: "Default",
  },
];

export function hasDisplayMediaSupport(): boolean {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }
  return typeof navigator.mediaDevices.getDisplayMedia === "function";
}

export function hasMediaRecorderSupport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return typeof window.MediaRecorder === "function";
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function getSupportedMimeTypes(hasAudio = true): SupportedMimeOption[] {
  if (!hasMediaRecorderSupport()) {
    return [];
  }

  let list = hasAudio ? CANDIDATE_WITH_AUDIO : CANDIDATE_VIDEO_ONLY;

  // On Safari/WebKit, prioritize MP4 container for native hardware decode and playback
  if (isSafariBrowser()) {
    const mp4List = list.filter((item) => item.ext === "mp4");
    const otherList = list.filter((item) => item.ext !== "mp4");
    list = [...mp4List, ...otherList];
  }

  const supported: SupportedMimeOption[] = [];
  for (const candidate of list) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mime)) {
        supported.push({
          mimeType: candidate.mime,
          extension: candidate.ext,
          label: candidate.label,
          codec: candidate.codec,
        });
      }
    } catch {
      // Ignore errors when probing unsupported formats
    }
  }

  return supported;
}

export function getBestMimeType(hasAudio = true): SupportedMimeOption | null {
  const supported = getSupportedMimeTypes(hasAudio);
  return supported.length > 0 ? supported[0] : null;
}

export function generateFilename(extension = "webm", now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const cleanExt = extension.replace(/^\./, "");
  return `ramupod-screen-recording-${year}-${month}-${day}-${hours}${minutes}${seconds}.${cleanExt}`;
}
