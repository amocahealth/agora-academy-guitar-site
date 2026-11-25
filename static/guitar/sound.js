// Playback: plucked strings, strums and arpeggios through the synth in app.js (window.AgoraAudio).

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createSound(A) {
  /** Pluck one MIDI note; when = AudioContext time (default: now). Returns the start time or null. */
  function pluck(midi, when, vol) {
    const ctx = A.audio();
    if (!ctx) return null;
    const t = when || ctx.currentTime + 0.01;
    A.play(A.pluckBuffer(freq(midi), 2.6), t, vol || 0.55);
    return t;
  }

  /** Play notes[] (MIDI or null = muted, string 6 → 1) as 'down' | 'up' strum or 'arp'.
   *  onNote(stringIndex, delayMs) is called for each sounding string (to light it up). */
  function strum(notes, kind, onNote) {
    const ctx = A.audio();
    if (!ctx) return;
    const order = [0, 1, 2, 3, 4, 5];
    if (kind === 'up') order.reverse();
    const gap = kind === 'arp' ? 0.16 : 0.022;
    const t = ctx.currentTime + 0.03;
    let k = 0;
    for (const i of order) {
      if (notes[i] === null) continue;
      pluck(notes[i], t + k * gap, kind === 'arp' ? 0.5 : 0.42);
      if (onNote) onNote(i, Math.max(0, (t + k * gap - ctx.currentTime) * 1000));
      k++;
    }
  }

  return { pluck, strum };
}
