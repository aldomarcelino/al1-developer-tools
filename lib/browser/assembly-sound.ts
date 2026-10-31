/** A short, soft gathering gust with a two-note finish. No audio asset or network request. */
export function playAssemblySound(): () => void {
  if (typeof window === "undefined" || !window.AudioContext) return () => {};

  let context: AudioContext;
  try {
    context = new window.AudioContext();
  } catch {
    return () => {};
  }

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    void context.close().catch(() => {});
  };

  // Resume directly from the click gesture, before navigation or any async work.
  void context
    .resume()
    .then(() => {
      if (stopped) return;
      try {
        const start = context.currentTime + 0.015;
        const duration = 0.85;
        const buffer = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * duration),
          context.sampleRate
        );
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

        const wind = context.createBufferSource();
        wind.buffer = buffer;
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 0.7;
        filter.frequency.setValueAtTime(280, start);
        filter.frequency.exponentialRampToValueAtTime(2200, start + 0.36);
        filter.frequency.exponentialRampToValueAtTime(500, start + duration);

        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.13, start + 0.28);
        envelope.gain.exponentialRampToValueAtTime(0.035, start + 0.55);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        wind.connect(filter).connect(envelope).connect(context.destination);

        for (const [index, frequency] of [660, 990].entries()) {
          const tone = context.createOscillator();
          const gain = context.createGain();
          const at = start + 0.4 + index * 0.075;
          tone.type = "sine";
          tone.frequency.setValueAtTime(frequency * 0.94, at);
          tone.frequency.exponentialRampToValueAtTime(frequency, at + 0.07);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.025, at + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
          tone.connect(gain).connect(context.destination);
          tone.start(at);
          tone.stop(at + 0.31);
        }

        wind.onended = stop;
        wind.start(start);
        wind.stop(start + duration);
      } catch {
        stop();
      }
    })
    .catch(stop);

  return stop;
}
