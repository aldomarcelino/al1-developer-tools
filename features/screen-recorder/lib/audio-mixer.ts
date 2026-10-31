export interface MixedAudioResult {
  track: MediaStreamTrack;
  cleanup: () => void;
  resume?: () => Promise<void>;
}

/**
 * Mixes multiple audio tracks (e.g. system/tab audio and microphone) into a single audio track
 * using the browser's Web Audio API (AudioContext).
 */
export function mixAudioTracks(
  systemTrack?: MediaStreamTrack | null,
  micTrack?: MediaStreamTrack | null
): MixedAudioResult | null {
  // If no audio tracks provided
  if (!systemTrack && !micTrack) {
    return null;
  }

  // If only system audio
  if (systemTrack && !micTrack) {
    return {
      track: systemTrack,
      cleanup: () => {
        try {
          systemTrack.stop();
        } catch {
          // ignore
        }
      },
    };
  }

  // If only microphone
  if (!systemTrack && micTrack) {
    return {
      track: micTrack,
      cleanup: () => {
        try {
          micTrack.stop();
        } catch {
          // ignore
        }
      },
    };
  }

  // Both system audio and microphone are present -> mix with AudioContext
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      // Fallback if AudioContext is not available
      return {
        track: micTrack || systemTrack!,
        cleanup: () => {
          systemTrack?.stop();
          micTrack?.stop();
        },
      };
    }

    const audioCtx = new AudioContextClass();
    const destination = audioCtx.createMediaStreamDestination();

    const sources: MediaStreamAudioSourceNode[] = [];

    if (systemTrack) {
      const sysStream = new MediaStream([systemTrack]);
      const sysSource = audioCtx.createMediaStreamSource(sysStream);
      sysSource.connect(destination);
      sources.push(sysSource);
    }

    if (micTrack) {
      const micStream = new MediaStream([micTrack]);
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(destination);
      sources.push(micSource);
    }

    const mixedTrack = destination.stream.getAudioTracks()[0];

    const cleanup = () => {
      try {
        for (const source of sources) {
          source.disconnect();
        }
        destination.stream.getTracks().forEach(track => track.stop());
        if (audioCtx.state !== "closed") {
          audioCtx.close().catch(() => {});
        }
      } catch {
        // ignore
      } finally {
        systemTrack?.stop();
        micTrack?.stop();
      }
    };

    return {
      track: mixedTrack,
      cleanup,
      resume: async () => { if (audioCtx.state === "suspended") await audioCtx.resume(); },
    };
  } catch (error) {
    console.error("Failed to mix audio tracks via AudioContext:", error);
    // Fallback to microphone or system audio
    const fallbackTrack = micTrack || systemTrack!;
    return {
      track: fallbackTrack,
      cleanup: () => {
        systemTrack?.stop();
        micTrack?.stop();
      },
    };
  }
}
