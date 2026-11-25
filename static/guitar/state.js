// Settings shared by every virtual guitar on the page (and the tuner in app.js):
// tuning, capo, label mode, Đô–Rê–Mi. Remembered in the student's browser.

const KEY = 'agora-guitar:';

function load(k, d) {
  try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
}
function save(k, v) {
  try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ }
}

export function createSharedState(standard) {
  const state = {
    tuning: load('tuning', standard.slice()),
    capo: load('capo', 0),
    labels: load('labels', 'finger'), // 'finger' | 'note'
    solf: load('solf', false),
  };
  if (!Array.isArray(state.tuning) || state.tuning.length !== 6) state.tuning = standard.slice();
  const listeners = [];

  return {
    state,
    /** Sounding MIDI notes of the open strings (tuning + capo). */
    openNotes: () => state.tuning.map((m) => m + state.capo),
    /** Call fn(retune) whenever a shared setting changes. */
    subscribe: (fn) => listeners.push(fn),
    /** Save, refresh every guitar, and tell the tuner (agora:tuning event). */
    changed() {
      save('tuning', state.tuning); save('capo', state.capo); save('labels', state.labels); save('solf', state.solf);
      listeners.forEach((fn) => fn(true));
      window.dispatchEvent(new CustomEvent('agora:tuning', { detail: { tuning: state.tuning.slice(), capo: state.capo } }));
    },
  };
}
