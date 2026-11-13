export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onaudioend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

export type SpeechRecognitionConstructor = new () => ISpeechRecognition;

export function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionClass() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export type MicrophonePermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function checkMicrophonePermission(): Promise<MicrophonePermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

export interface MicrophoneAccessResult {
  ok: boolean;
  reason?: "denied" | "not-found" | "in-use" | "system-denied" | "error";
  message?: string;
}

export async function requestMicrophoneAccess(): Promise<MicrophoneAccessResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: true };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately stop tracks so we don't lock the microphone device
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        const perm = await checkMicrophonePermission();
        if (perm === "prompt") {
          return {
            ok: false,
            reason: "system-denied",
            message:
              "Microphone access was blocked by your operating system or prompt was dismissed. On Mac, check System Settings > Privacy & Security > Microphone.",
          };
        }
        return {
          ok: false,
          reason: "denied",
          message:
            "Microphone access was denied. Please allow microphone permissions in your browser settings (click the lock or camera icon in the address bar).",
        };
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        return {
          ok: false,
          reason: "not-found",
          message:
            "No microphone was found on your device. Please plug in or connect a microphone and try again.",
        };
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        return {
          ok: false,
          reason: "in-use",
          message:
            "Your microphone is currently in use by another application (e.g. Zoom, Google Meet, or another tab). Please close other apps using the microphone and try again.",
        };
      }
    }
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Failed to access microphone.",
    };
  }
}
