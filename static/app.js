// Agora Academy · Guitar — interactive layer (no dependencies).
// - mobile menu
// - lesson progress (localStorage): sidebar ✓, fret strip, level progress bars
// - clickable checklists per page
// - practice tools: metronome, tuner reference tones (Karplus-Strong plucked string)
// - strum pattern playback
(function () {
  'use strict';
  var lang = (document.documentElement.lang || 'vi').slice(0, 2);
  var T = {
    vi: { metro: 'Máy đếm nhịp', tuner: 'Lên dây', start: 'Bắt đầu', stop: 'Dừng', tap: 'Gõ nhịp',
          beats: 'Phách / ô nhịp', tunerHint: 'Bấm từng dây để nghe nốt chuẩn, rồi chỉnh đàn cho trùng tiếng. Đổi kiểu lên dây (Drop D, Open G…) trong Đàn ảo.',
          metroHint: 'Phách đầu tiên của ô nhịp được nhấn mạnh (chấm đỏ).', done: 'đã xong', vguitar: 'Đàn ảo',
          theme: 'Giao diện', themes: { rosewood: 'Gỗ hồng', sky: 'Trời xanh', spring: 'Mùa xuân' } },
    en: { metro: 'Metronome', tuner: 'Tuner', start: 'Start', stop: 'Stop', tap: 'Tap tempo',
          beats: 'Beats per bar', tunerHint: 'Tap a string to hear its reference pitch, then tune until they match. Change the tuning (Drop D, Open G…) in the Virtual guitar.',
          metroHint: 'The first beat of each bar is accented (red dot).', done: 'done', vguitar: 'Virtual guitar',
          theme: 'Theme', themes: { rosewood: 'Rosewood', sky: 'Blue sky', spring: 'Spring bloom' } }
  }[lang === 'vi' ? 'vi' : 'en'];

  function store(key, fallback) {
    try { var v = localStorage.getItem('agora-guitar:' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('agora-guitar:' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------------------------------------------------------------- menu
  var btn = document.querySelector('.nav-toggle');
  var sidebar = document.getElementById('sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var current = sidebar && sidebar.querySelector('[aria-current="page"]');
  if (current && current.scrollIntoView) { current.scrollIntoView({ block: 'center' }); window.scrollTo(0, 0); }

  // ---------------------------------------------------------------- theme picker
  var THEMES = [['rosewood', '🪵'], ['sky', '☁️'], ['spring', '🌸']];
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'rosewood'; }
  function applyTheme(id) {
    if (id === 'rosewood') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
    save('theme', id);
  }
  var topbar = document.querySelector('.topbar');
  if (topbar) {
    var pick = document.createElement('div');
    pick.className = 'theme-pick';
    pick.innerHTML = '<button type="button" class="theme-btn" aria-haspopup="true" aria-expanded="false" title="' + T.theme + '" aria-label="' + T.theme + '">🎨</button>' +
      '<div class="theme-menu" role="menu" hidden><p>' + T.theme + '</p>' +
      THEMES.map(function (th) {
        return '<button type="button" role="menuitemradio" data-theme-id="' + th[0] + '"><span class="swatch swatch-' + th[0] + '"></span>' + th[1] + ' ' + T.themes[th[0]] + '</button>';
      }).join('') + '</div>';
    var langSwitch = topbar.querySelector('.lang-switch');
    if (langSwitch && langSwitch.nextSibling) topbar.insertBefore(pick, langSwitch.nextSibling); else topbar.appendChild(pick);
    var themeBtn = pick.querySelector('.theme-btn'), themeMenu = pick.querySelector('.theme-menu');
    var paintMenu = function () {
      $all('[data-theme-id]', themeMenu).forEach(function (b) {
        b.setAttribute('aria-checked', b.getAttribute('data-theme-id') === currentTheme() ? 'true' : 'false');
      });
    };
    var closeMenu = function () { themeMenu.hidden = true; themeBtn.setAttribute('aria-expanded', 'false'); };
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      themeMenu.hidden = !themeMenu.hidden;
      themeBtn.setAttribute('aria-expanded', themeMenu.hidden ? 'false' : 'true');
      paintMenu();
    });
    themeMenu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme-id]');
      if (!b) return;
      applyTheme(b.getAttribute('data-theme-id'));
      paintMenu();
      closeMenu();
    });
    document.addEventListener('click', function (e) { if (!pick.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  // ---------------------------------------------------------------- progress
  var done = store('done', []);
  function isDone(rel) { return done.indexOf(rel) !== -1; }
  function paintProgress() {
    $all('[data-rel]').forEach(function (el) {
      if (el === document.body) return;
      el.classList.toggle('is-done', isDone(el.getAttribute('data-rel')));
    });
    $all('.card-progress[data-section], .level-progress[data-section]').forEach(function (el) {
      var sec = el.getAttribute('data-section') + '/';
      var total = +el.getAttribute('data-total') || 1;
      var n = done.filter(function (r) { return r.indexOf(sec) === 0; }).length;
      if (el.classList.contains('card-progress')) el.style.setProperty('--pct', Math.round(100 * n / total) + '%');
      else el.textContent = n ? '✓ ' + n + '/' + total + ' ' + T.done : '';
    });
  }
  $all('.complete-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var rel = b.getAttribute('data-rel');
      if (isDone(rel)) done = done.filter(function (r) { return r !== rel; });
      else done.push(rel);
      save('done', done);
      paintProgress();
    });
  });
  paintProgress();

  // ---------------------------------------------------------------- checklists
  var pageRel = document.body.getAttribute('data-rel') || 'home';
  var boxes = $all('.prose input[type="checkbox"]');
  var checks = store('checks:' + pageRel, []);
  boxes.forEach(function (box, i) {
    box.disabled = false;
    box.checked = !!checks[i];
    box.addEventListener('change', function () {
      checks = boxes.map(function (b) { return b.checked; });
      save('checks:' + pageRel, checks);
    });
  });

  // ---------------------------------------------------------------- audio
  var ctx = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  var pluckCache = {};
  // Karplus-Strong plucked string.
  function pluckBuffer(freq, seconds) {
    var key = freq + ':' + seconds;
    if (pluckCache[key]) return pluckCache[key];
    var sr = ctx.sampleRate, n = Math.floor(sr * seconds);
    var buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    var period = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(period), i, idx = 0;
    for (i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    var damp = 0.4985 + Math.min(0.0012, freq / 400000);
    for (i = 0; i < n; i++) {
      var nx = (idx + 1) % period;
      d[i] = ring[idx];
      ring[idx] = damp * (ring[idx] + ring[nx]);
      idx = nx;
    }
    pluckCache[key] = buf;
    return buf;
  }
  function play(buf, when, gain, stopAfter) {
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; g.gain.value = gain;
    if (stopAfter) {
      g.gain.setValueAtTime(gain, when + stopAfter);
      g.gain.exponentialRampToValueAtTime(0.0001, when + stopAfter + 0.06);
    }
    src.connect(g); g.connect(ctx.destination);
    src.start(when);
    src.stop(when + (stopAfter ? stopAfter + 0.1 : buf.duration));
  }
  function click(when, accent) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1100;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    o.connect(g); g.connect(ctx.destination);
    o.start(when); o.stop(when + 0.06);
  }
  var noiseBuf = null;
  function chop(when) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1800; g.gain.value = 0.9;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(when);
  }
  window.AgoraAudio = { audio: audio, pluckBuffer: function (f, sec) { audio(); return pluckBuffer(f, sec); }, play: play };

  // Lookahead scheduler shared by metronome and strum player.
  function Loop(stepSeconds, onStep) {
    var timer = null, next = 0, i = 0;
    function tick() {
      while (next < ctx.currentTime + 0.12) { onStep(i, next); next += stepSeconds(); i++; }
    }
    return {
      start: function () { next = ctx.currentTime + 0.08; i = 0; tick(); timer = setInterval(tick, 25); },
      stop: function () { clearInterval(timer); timer = null; },
      running: function () { return timer !== null; }
    };
  }
  function at(when, fn) { setTimeout(fn, Math.max(0, (when - ctx.currentTime) * 1000)); }

  // ---------------------------------------------------------------- strum player
  var OPEN_EM = [82.41, 123.47, 164.81, 196.0, 246.94, 329.63]; // E minor, low → high
  var activeStrum = null;
  function strumSound(code, when, slot) {
    var accent = code.charAt(0) === '>';
    var c = accent ? code.slice(1) : code, vol = accent ? 0.5 : 0.32;
    var i;
    if (c === 'D') for (i = 0; i < 6; i++) play(pluckBuffer(OPEN_EM[i], 1.6), when + i * 0.011, vol, slot * 1.9);
    else if (c === 'U') for (i = 5; i >= 2; i--) play(pluckBuffer(OPEN_EM[i], 1.6), when + (5 - i) * 0.009, vol * 0.8, slot * 1.9);
    else if (c === 'X') { chop(when); for (i = 1; i < 6; i++) play(pluckBuffer(OPEN_EM[i], 1.6), when + i * 0.006, vol * 0.5, 0.05); }
    else if (c === 'B') play(pluckBuffer(OPEN_EM[0], 2.2), when, vol * 1.4);
    else if (c === 'A') play(pluckBuffer(OPEN_EM[1], 2.2), when, vol * 1.3);
    else if (c === 'P') play(pluckBuffer(OPEN_EM[3], 1.8), when, vol * 1.2);
  }
  $all('.strum-row').forEach(function (row) {
    var button = row.querySelector('.strum-play');
    var cells = $all('.strum-cells li', row);
    var codes = (row.getAttribute('data-pattern') || '').split(' ');
    var sub = +row.getAttribute('data-sub') || 2;
    var tempo = +row.getAttribute('data-tempo') || 70;
    var slot = function () { return 60 / tempo / sub; };
    var loop = null;
    function stop() {
      if (loop) loop.stop();
      button.setAttribute('aria-pressed', 'false'); button.textContent = '▶';
      cells.forEach(function (c) { c.classList.remove('playing'); });
      if (activeStrum === stop) activeStrum = null;
    }
    button.addEventListener('click', function () {
      if (!audio()) return;
      if (loop && loop.running()) { stop(); return; }
      if (activeStrum) activeStrum();
      loop = Loop(slot, function (i, when) {
        var k = i % codes.length;
        strumSound(codes[k], when, slot());
        if (k % sub === 0 && k === 0) click(when, true);
        at(when, function () {
          if (!loop || !loop.running()) return;
          cells.forEach(function (c, j) { c.classList.toggle('playing', j === k); });
        });
      });
      loop.start();
      activeStrum = stop;
      button.setAttribute('aria-pressed', 'true'); button.textContent = '■';
    });
  });

  // ---------------------------------------------------------------- tools dock
  var dock = document.getElementById('tools');
  if (!dock) return;
  dock.hidden = false;
  dock.innerHTML =
    '<div class="tool-panel" id="panel-metro" hidden>' +
      '<h3>🥁 ' + T.metro + '</h3>' +
      '<div class="metro-bpm"><output id="bpm-out">70</output><small>BPM</small></div>' +
      '<div class="metro-beats" id="metro-beats"></div>' +
      '<div class="tool-row"><button class="tool-btn" data-bpm="-5">−5</button><input id="bpm" type="range" min="30" max="220" value="70" aria-label="BPM"><button class="tool-btn" data-bpm="5">+5</button></div>' +
      '<div class="tool-row"><label>' + T.beats + ' <select id="metro-meter"><option>2</option><option>3</option><option selected>4</option><option>6</option></select></label></div>' +
      '<div class="tool-row"><button class="tool-btn primary" id="metro-toggle" aria-pressed="false">▶ ' + T.start + '</button><button class="tool-btn" id="metro-tap">👆 ' + T.tap + '</button></div>' +
      '<p class="tool-hint">' + T.metroHint + '</p>' +
    '</div>' +
    '<div class="tool-panel" id="panel-tuner" hidden>' +
      '<h3>🎵 ' + T.tuner + '</h3>' +
      '<div class="tuner-neck" id="tuner-neck"></div>' +
      '<p class="tool-hint">' + T.tunerHint + '</p>' +
    '</div>' +
    '<div class="tool-panel wide" id="panel-vguitar" hidden><h3>🎸 ' + T.vguitar + '</h3><div id="vguitar-dock"></div></div>' +
    '<div class="tools-buttons">' +
      '<button class="tool-fab" data-panel="panel-vguitar" aria-expanded="false">🎸 <span>' + T.vguitar + '</span></button>' +
      '<button class="tool-fab" data-panel="panel-tuner" aria-expanded="false">🎵 <span>' + T.tuner + '</span></button>' +
      '<button class="tool-fab" data-panel="panel-metro" aria-expanded="false">🥁 <span>' + T.metro + '</span></button>' +
    '</div>';

  $all('.tool-fab', dock).forEach(function (fab) {
    fab.addEventListener('click', function () {
      var id = fab.getAttribute('data-panel');
      $all('.tool-fab', dock).forEach(function (other) {
        var panel = document.getElementById(other.getAttribute('data-panel'));
        var open = other === fab ? panel.hidden : false;
        panel.hidden = !open;
        other.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      if (id) audio();
    });
  });

  // Metronome
  var bpm = 70, meter = 4, metro = null, taps = [];
  var bpmInput = document.getElementById('bpm'), bpmOut = document.getElementById('bpm-out');
  var beatsEl = document.getElementById('metro-beats'), toggle = document.getElementById('metro-toggle');
  function setBpm(v) { bpm = Math.max(30, Math.min(220, Math.round(v))); bpmInput.value = bpm; bpmOut.textContent = bpm; }
  function drawBeats() { beatsEl.innerHTML = new Array(meter + 1).join('<i></i>'); }
  drawBeats();
  bpmInput.addEventListener('input', function () { setBpm(+bpmInput.value); });
  $all('[data-bpm]', dock).forEach(function (b) { b.addEventListener('click', function () { setBpm(bpm + (+b.getAttribute('data-bpm'))); }); });
  document.getElementById('metro-meter').addEventListener('change', function (e) { meter = +e.target.value; drawBeats(); });
  document.getElementById('metro-tap').addEventListener('click', function () {
    var now = performance.now();
    taps = taps.filter(function (t) { return now - t < 2500; }); taps.push(now);
    if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  });
  toggle.addEventListener('click', function () {
    if (!audio()) return;
    if (metro && metro.running()) {
      metro.stop(); toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = '▶ ' + T.start;
      $all('i', beatsEl).forEach(function (d) { d.className = ''; });
      return;
    }
    metro = Loop(function () { return 60 / bpm; }, function (i, when) {
      var beat = i % meter;
      click(when, beat === 0);
      at(when, function () {
        if (!metro || !metro.running()) return;
        $all('i', beatsEl).forEach(function (d, j) { d.className = j === beat ? (j === 0 ? 'on first' : 'on') : ''; });
      });
    });
    metro.start();
    toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = '■ ' + T.stop;
  });

  // Tuner reference tones (strings 6 → 1) — follows the tuning chosen in the virtual guitar.
  var NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']; // same spelling as the virtual guitar
  var neck = document.getElementById('tuner-neck');
  function buildTuner() {
    var tuning = store('tuning', [40, 45, 50, 55, 59, 64]);
    if (!Array.isArray(tuning) || tuning.length !== 6) tuning = [40, 45, 50, 55, 59, 64];
    neck.innerHTML = '';
    tuning.forEach(function (midi, i) {
      var b = document.createElement('button');
      var hz = 440 * Math.pow(2, (midi - 69) / 12);
      b.type = 'button';
      b.title = NOTE[midi % 12] + (Math.floor(midi / 12) - 1) + ' · ' + hz.toFixed(1) + ' Hz';
      b.innerHTML = '<b>' + NOTE[midi % 12] + '</b><small>' + (lang === 'vi' ? 'dây ' : 'str ') + (6 - i) + '</small>';
      b.addEventListener('click', function () {
        if (!audio()) return;
        play(pluckBuffer(hz, 4), ctx.currentTime + 0.01, 0.7);
        b.classList.add('ringing');
        setTimeout(function () { b.classList.remove('ringing'); }, 1800);
      });
      neck.appendChild(b);
    });
  }
  buildTuner();
  window.addEventListener('agora:tuning', buildTuner);
})();
