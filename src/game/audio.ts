let context: AudioContext | null = null;
const playing = new Set<AudioScheduledSourceNode>();

/** A short, optional soundscape: a warm build-up, lid click and discovery chord. */
export function playOpeningSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    const audio = context;
    const start = audio.currentTime;
    // Rapidly opening another box must not stack multiple soundscapes.
    for (const source of playing) {
      try {
        source.stop();
      } catch {
        /* The source may already have ended. */
      }
    }
    playing.clear();

    const tone = (
      frequency: number,
      at: number,
      duration: number,
      volume: number,
      type: OscillatorType = "sine",
    ) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start + at);
      gain.gain.setValueAtTime(0, start + at);
      gain.gain.linearRampToValueAtTime(volume, start + at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      playing.add(oscillator);
      oscillator.onended = () => {
        playing.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start + at);
      oscillator.stop(start + at + duration + 0.01);
    };

    tone(130.81, 0, 0.6, 0.025, "triangle");
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) =>
      tone(frequency, 0.12 + index * 0.13, 0.35, 0.018),
    );
    // The lid opens near the middle of the 2.8-second visual sequence.
    tone(880, 1.3, 0.08, 0.025, "triangle");
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      tone(frequency, 1.45 + index * 0.075, 0.65, 0.026);
      tone(frequency * 2, 1.45 + index * 0.075, 0.24, 0.006);
    });
  } catch {
    /* Sound remains optional when Web Audio is unavailable or blocked. */
  }
}
