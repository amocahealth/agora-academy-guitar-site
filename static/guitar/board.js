// One interactive virtual guitar: controls, fretboard, chord / shape selection, playback.
// Mounted on every `.vguitar` element (```guitar blocks) and in the tools dock (#vguitar-dock).

import { createFretboard, VIEWBOX } from './fretboard.js';

export function createBoard(el, initialChord, { engine, shared, sound }) {
  const T = engine.text;
  const { theory } = engine;
  const st = shared.state;
  const parsed = engine.parseChord(initialChord || 'C') || { root: 0, q: 0 };
  let mode = 'chord'; // 'chord' = from the chord finder | 'custom' = fretted by the student
  let root = parsed.root, qi = parsed.q, voicings = [], vi = 0;
  let frets = [-1, 3, 2, 0, 1, 0];
  let showTones = false;
  const board = createFretboard(engine.frets);

  el.classList.add('vg');
  el.innerHTML =
    '<div class="vg-controls">' +
      `<label>${T.tuning} <select class="vg-tuning"></select></label>` +
      `<label>${T.capo} <select class="vg-capo"></select></label>` +
      `<div class="vg-seg" role="group"><button type="button" data-labels="finger">${T.fingers}</button><button type="button" data-labels="note">${T.notes}</button></div>` +
      `<div class="vg-seg" role="group"><button type="button" data-solf="0">${T.letters}</button><button type="button" data-solf="1">${T.solf}</button></div>` +
    '</div>' +
    '<div class="vg-chordbar">' +
      `<div class="vg-roots" role="group" aria-label="${T.chord}"></div>` +
      `<select class="vg-quality" aria-label="${T.chord}"></select>` +
      '<div class="vg-variant"><button type="button" class="vg-prev" aria-label="prev">◀</button><span class="vg-vlabel"></span><button type="button" class="vg-next" aria-label="next">▶</button></div>' +
    '</div>' +
    `<div class="vg-board-wrap"><svg class="vg-board" viewBox="${VIEWBOX}" role="img" aria-label="Virtual guitar fretboard"></svg></div>` +
    '<div class="vg-info"><span class="vg-name"></span><code class="vg-shape"></code><span class="vg-notes"></span></div>' +
    '<div class="vg-actions">' +
      `<button type="button" class="vg-btn primary" data-act="down">${T.down}</button>` +
      `<button type="button" class="vg-btn" data-act="up">${T.up}</button>` +
      `<button type="button" class="vg-btn" data-act="arp">🎶 ${T.arp}</button>` +
      `<button type="button" class="vg-btn" data-act="clear">${T.clear}</button>` +
      `<label class="vg-check"><input type="checkbox" class="vg-tones"> ${T.tones}</label>` +
    '</div>' +
    `<p class="vg-hint">${T.hint}</p>`;

  const q = (s) => el.querySelector(s);
  const all = (s) => Array.from(el.querySelectorAll(s));
  const svg = q('.vg-board');
  const tuningSel = q('.vg-tuning'), capoSel = q('.vg-capo'), qualSel = q('.vg-quality'), rootsEl = q('.vg-roots');

  engine.tunings.forEach((t) => tuningSel.add(new Option(t.label, t.id)));
  tuningSel.add(new Option(T.custom, 'custom'));
  for (let c = 0; c <= engine.maxCapo; c++) capoSel.add(new Option(c === 0 ? T.none : String(c), String(c)));
  engine.qualities.forEach((x, i) => qualSel.add(new Option(x.symbol === '' ? 'maj' : x.symbol, String(i))));
  theory.names.forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = n; b.setAttribute('data-root', i);
    rootsEl.appendChild(b);
  });

  const name = (m) => theory.noteName(m, st.solf);
  const tuningId = () => (engine.tunings.find((t) => t.notes.join() === st.tuning.join()) || { id: 'custom' }).id;

  function draw() {
    svg.innerHTML = board.render({
      tuning: st.tuning, open: shared.openNotes(), capo: st.capo, frets,
      fingers: engine.fingersFor(frets),
      tones: showTones && mode === 'chord' ? engine.chordPcs(root, qi) : [],
      root: mode === 'chord' ? root : null,
      labels: st.labels, name, pc: theory.pc,
    });
  }

  function info() {
    const open = shared.openNotes();
    const chord = engine.detectChord(frets, open);
    q('.vg-name').textContent = chord || T.unknown;
    q('.vg-name').classList.toggle('unknown', !chord);
    const big = frets.some((f) => f > 9);
    q('.vg-shape').textContent = frets.map((f) => (f < 0 ? 'x' : f)).join(big ? '-' : '') + (st.capo ? `  (capo ${st.capo})` : '');
    q('.vg-notes').textContent = frets.map((f, i) => (f < 0 ? null : name(open[i] + f))).filter(Boolean).join(' · ');
    q('.vg-vlabel').textContent = mode === 'chord'
      ? (voicings.length ? `${T.variant} ${vi + 1}/${voicings.length}` : T.noShape)
      : T.custom_chord;
    all('.vg-roots button').forEach((b) => b.classList.toggle('on', mode === 'chord' && +b.getAttribute('data-root') === root));
    qualSel.value = String(qi);
    tuningSel.value = tuningId();
    capoSel.value = String(st.capo);
    all('[data-labels]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-labels') === st.labels));
    all('[data-solf]').forEach((b) => b.classList.toggle('on', (b.getAttribute('data-solf') === '1') === !!st.solf));
  }

  function voice(keepIndex) {
    voicings = engine.findVoicings(shared.openNotes(), root, qi, engine.frets - st.capo);
    if (!keepIndex) vi = 0;
    if (vi >= voicings.length) vi = 0;
    if (voicings.length) frets = voicings[vi].slice();
  }
  const update = () => { draw(); info(); };

  // ---- sound
  function flash(i, delayMs) {
    setTimeout(() => {
      const g = svg.querySelector(`.vg-dot[data-s="${i}"]`);
      if (g) { g.classList.remove('ring'); void g.getBBox(); g.classList.add('ring'); }
    }, delayMs || 0);
  }
  function pluckString(i) {
    if (frets[i] < 0) return;
    if (sound.pluck(shared.openNotes()[i] + frets[i]) !== null) flash(i, 0);
  }
  function strum(kind) {
    const open = shared.openNotes();
    sound.strum(frets.map((f, i) => (f < 0 ? null : open[i] + f)), kind, flash);
  }

  // ---- events
  svg.addEventListener('click', (e) => {
    const tune = e.target.closest('[data-tune]');
    if (tune) {
      const s = +tune.getAttribute('data-s');
      const [lo, hi] = engine.retuneRange;
      st.tuning[s] = Math.max(lo, Math.min(hi, st.tuning[s] + (+tune.getAttribute('data-tune'))));
      shared.changed();
      sound.pluck(st.tuning[s] + st.capo);
      return;
    }
    const hit = e.target.closest('.vg-hit, .vg-dot');
    if (!hit) return;
    const i = +hit.getAttribute('data-s');
    let abs = hit.hasAttribute('data-f') ? +hit.getAttribute('data-f') : null;
    mode = 'custom';
    if (abs === null) abs = frets[i] > 0 ? frets[i] + st.capo : 0; // a marker acts like its cell
    if (abs === 0) {
      frets[i] = frets[i] === 0 ? -1 : 0; // open column: open ↔ muted (fretted → open)
    } else {
      const rel = abs - st.capo;
      frets[i] = frets[i] === rel ? 0 : rel;
    }
    update();
    if (frets[i] >= 0) pluckString(i);
  });
  rootsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-root]');
    if (!b) return;
    root = +b.getAttribute('data-root'); mode = 'chord'; voice(false); update(); strum('down');
  });
  qualSel.addEventListener('change', () => { qi = +qualSel.value; mode = 'chord'; voice(false); update(); strum('down'); });
  const step = (d) => {
    if (mode !== 'chord') { mode = 'chord'; voice(false); }
    else if (voicings.length) { vi = (vi + d + voicings.length) % voicings.length; frets = voicings[vi].slice(); }
    update(); strum('down');
  };
  q('.vg-prev').addEventListener('click', () => step(-1));
  q('.vg-next').addEventListener('click', () => step(1));
  tuningSel.addEventListener('change', () => {
    const t = engine.tunings.find((x) => x.id === tuningSel.value);
    if (t) st.tuning = t.notes.slice();
    shared.changed();
  });
  capoSel.addEventListener('change', () => { st.capo = +capoSel.value; shared.changed(); });
  all('[data-labels]').forEach((b) => b.addEventListener('click', () => { st.labels = b.getAttribute('data-labels'); shared.changed(); }));
  all('[data-solf]').forEach((b) => b.addEventListener('click', () => { st.solf = b.getAttribute('data-solf') === '1'; shared.changed(); }));
  q('.vg-tones').addEventListener('change', (e) => { showTones = e.target.checked; draw(); });
  all('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const act = b.getAttribute('data-act');
    if (act === 'clear') { frets = [-1, -1, -1, -1, -1, -1]; mode = 'custom'; update(); return; }
    strum(act);
  }));

  // shared settings changed (here or in another guitar on the page)
  shared.subscribe((retune) => { if (retune && mode === 'chord') voice(false); update(); });

  voice(false);
  update();
}
