// The virtual guitar engine in the browser: the Rust crate guitar-core compiled to WebAssembly
// (crates/guitar-wasm). The site generator builds engine.wasm next to this file.
// Same interface as before for the UI modules: findVoicings, fingersFor, detectChord, …

const pc = (m) => ((m % 12) + 12) % 12;

/** Load engine.wasm and return the engine for `lang` ('vi' | 'en'). */
export async function loadEngine(url, lang) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`virtual guitar: cannot load ${url} (${res.status})`);
  const isWasm = (res.headers.get('content-type') || '').startsWith('application/wasm');
  const { instance } = isWasm && WebAssembly.instantiateStreaming
    ? await WebAssembly.instantiateStreaming(res)
    : await WebAssembly.instantiate(await res.arrayBuffer());
  const x = instance.exports;
  const enc = new TextEncoder(), dec = new TextDecoder();

  /** Send one JSON request to Rust and return the decoded reply. */
  function call(req) {
    const bytes = enc.encode(JSON.stringify(req));
    const p = x.guitar_alloc(bytes.length);
    new Uint8Array(x.memory.buffer, p, bytes.length).set(bytes);
    const r = x.guitar_call(p, bytes.length);
    x.guitar_free(p, bytes.length);
    const rp = Number(r >> 32n), rl = Number(r & 0xffffffffn);
    const text = dec.decode(new Uint8Array(x.memory.buffer, rp, rl));
    x.guitar_free(rp, rl);
    const v = JSON.parse(text);
    if (v && v.error) throw new Error('virtual guitar: ' + v.error);
    return v;
  }

  const info = call({ fn: 'init', lang });
  return {
    text: info.text,
    tunings: info.tunings,
    frets: info.frets,
    maxCapo: info.maxCapo,
    retuneRange: info.retuneRange,
    standard: info.tunings[0].notes,
    qualities: info.qualities,
    theory: { names: info.names, pc, noteName: (m, solf) => (solf ? info.solfege : info.names)[pc(m)] },
    parseChord: (name) => call({ fn: 'parse', name: name || '' }),
    chordName: (root, q) => call({ fn: 'chordName', root, q }),
    chordPcs: (root, q) => call({ fn: 'chordPcs', root, q }),
    findVoicings: (open, root, q, maxFret) => call({ fn: 'find', open, root, q, maxFret }),
    fingersFor: (frets) => call({ fn: 'fingers', frets }),
    detectChord: (frets, open) => call({ fn: 'detect', frets, open }),
  };
}
