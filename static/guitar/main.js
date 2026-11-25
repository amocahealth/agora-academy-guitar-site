// Agora Academy · Guitar — virtual guitar entry point (loaded as <script type="module">).
// The engine (chords, fingering, chord finder, chord names) is Rust compiled to WebAssembly:
// crates/guitar-core (+ crates/guitar-wasm), data in data/*.json. This folder is only the page:
//
//   engine.js    loads engine.wasm, same API as before      state.js   shared tuning / capo / labels
//   fretboard.js SVG drawing                                 sound.js   pluck, strum, arpeggio
//   board.js     one interactive guitar (controls + events)

import { loadEngine } from './engine.js';
import { createSharedState } from './state.js';
import { createSound } from './sound.js';
import { createBoard } from './board.js';

async function start() {
  const A = window.AgoraAudio; // synth from app.js
  if (!A) return;
  const lang = (document.documentElement.lang || 'vi').slice(0, 2) === 'vi' ? 'vi' : 'en';
  const engine = await loadEngine(new URL('./engine.wasm', import.meta.url), lang);
  const shared = createSharedState(engine.standard);
  const sound = createSound(A);
  const mount = (el) => {
    if (el.__vg) return;
    el.__vg = true;
    createBoard(el, el.getAttribute('data-chord'), { engine, shared, sound });
  };
  document.querySelectorAll('.vguitar').forEach(mount);
  const dock = document.getElementById('vguitar-dock');
  if (dock) mount(dock);
  window.AgoraGuitar = engine; // for the browser console
}

start().catch((e) => console.error(e));
