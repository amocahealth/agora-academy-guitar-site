// Fretboard drawing: turns the current state into SVG markup (no events, no state of its own).
// String i: 0 = low E (drawn at the bottom) … 5 = high e (top), like looking at your own guitar.

const W = 960, L = 92, OPEN = 34, NUT = L + OPEN, BOARD = W - NUT - 12, TOP = 30, SP = 37;
export const VIEWBOX = '0 0 960 268';

export function createFretboard(frets) {
  // real fret spacing (each fret 2^(-1/12) narrower), scaled to fit `frets` frets
  const fretX = (n) => (n <= 0 ? NUT : NUT + BOARD * (1 - Math.pow(2, -n / 12)) / (1 - Math.pow(2, -frets / 12)));
  const cellX = (n) => (n === 0 ? L + OPEN / 2 : (fretX(n - 1) + fretX(n)) / 2);
  const stringY = (i) => TOP + (5 - i) * SP;

  /**
   * @param v.tuning   open-string MIDI notes without capo (for the string names)
   * @param v.open     sounding open strings (tuning + capo)
   * @param v.capo     capo fret (0 = none)
   * @param v.frets    shape, relative to the capo (-1 muted, 0 open)
   * @param v.fingers  finger numbers per string (0 = none)
   * @param v.tones    pitch classes to show across the neck ([] = off)
   * @param v.root     root pitch class (highlighted), or null
   * @param v.labels   'finger' | 'note'
   * @param v.name     (midi) => note name
   * @param v.pc       pitch-class function
   */
  function render(v) {
    let h = '';
    h += `<rect class="vg-wood" x="${NUT}" y="${TOP - 14}" width="${BOARD}" height="${5 * SP + 28}" rx="4"/>`;
    for (const k of [3, 5, 7, 9, 15]) h += `<circle class="vg-inlay" cx="${cellX(k)}" cy="${TOP + 2.5 * SP}" r="6"/>`;
    h += `<circle class="vg-inlay" cx="${cellX(12)}" cy="${TOP + 1.5 * SP}" r="6"/><circle class="vg-inlay" cx="${cellX(12)}" cy="${TOP + 3.5 * SP}" r="6"/>`;
    for (let n = 1; n <= frets; n++) {
      h += `<line class="vg-fret" x1="${fretX(n)}" y1="${TOP - 14}" x2="${fretX(n)}" y2="${TOP + 5 * SP + 14}"/>`;
      h += `<text class="vg-num" x="${cellX(n)}" y="${TOP + 5 * SP + 34}">${n}</text>`;
    }
    h += `<line class="vg-nut" x1="${NUT}" y1="${TOP - 14}" x2="${NUT}" y2="${TOP + 5 * SP + 14}"/>`;
    if (v.capo > 0) h += `<rect class="vg-capo" x="${fretX(v.capo) - 9}" y="${TOP - 18}" width="12" height="${5 * SP + 36}" rx="5"/>`;

    // strings, tuning − + buttons, open-string names
    for (let i = 0; i < 6; i++) {
      const y = stringY(i);
      h += `<line class="vg-string" x1="${L}" y1="${y}" x2="${W - 12}" y2="${y}" stroke-width="${[2.6, 2.2, 1.8, 1.4, 1.1, 0.9][i]}"/>`;
      h += `<g class="vg-tune" data-tune="-1" data-s="${i}"><rect x="4" y="${y - 13}" width="26" height="26" rx="7"/><text x="17" y="${y + 5}">−</text></g>`;
      h += `<text class="vg-sname" x="46" y="${y + 4.5}">${v.name(v.tuning[i])}</text>`;
      h += `<g class="vg-tune" data-tune="1" data-s="${i}"><rect x="62" y="${y - 13}" width="26" height="26" rx="7"/><text x="75" y="${y + 5}">+</text></g>`;
    }

    // chord tones across the neck
    if (v.tones.length) {
      for (let i = 0; i < 6; i++) {
        for (let n = 0; n <= frets - v.capo; n++) {
          const m = v.open[i] + n;
          if (v.tones.indexOf(v.pc(m)) < 0) continue;
          const abs = n === 0 ? 0 : n + v.capo;
          h += `<g class="vg-tone${v.pc(m) === v.root ? ' root' : ''}"><circle cx="${cellX(abs)}" cy="${stringY(i)}" r="10"/><text x="${cellX(abs)}" y="${stringY(i) + 3.5}">${v.name(m)}</text></g>`;
        }
      }
    }

    // click targets: open/muted column, then every fret above the capo
    for (let i = 0; i < 6; i++) {
      h += `<rect class="vg-hit" data-s="${i}" data-f="0" x="${L}" y="${stringY(i) - SP / 2}" width="${OPEN}" height="${SP}"/>`;
      for (let n = Math.max(1, v.capo); n <= frets; n++) {
        h += `<rect class="vg-hit" data-s="${i}" data-f="${n}" x="${fretX(n - 1)}" y="${stringY(i) - SP / 2}" width="${fretX(n) - fretX(n - 1)}" height="${SP}"/>`;
      }
    }

    // finger / open / muted markers
    for (let i = 0; i < 6; i++) {
      const f = v.frets[i], yy = stringY(i);
      if (f < 0) { h += `<text class="vg-mute" x="${cellX(0)}" y="${yy + 7}">×</text>`; continue; }
      const midi = v.open[i] + f;
      const label = v.labels === 'note' ? v.name(midi) : (f === 0 ? v.name(midi) : (v.fingers[i] || ''));
      const isRoot = v.root !== null && v.pc(midi) === v.root;
      const cx = f === 0 ? cellX(0) : cellX(f + v.capo);
      h += `<g class="vg-dot${f === 0 ? ' open' : ''}${isRoot ? ' root' : ''}" data-s="${i}"><circle cx="${cx}" cy="${yy}" r="14"/><text x="${cx}" y="${yy + 5}">${label}</text></g>`;
    }
    return h;
  }

  return { render };
}
