import { $, $$, layer } from './dom.js';
import { settings, groove, saveSettings } from './state.js';
export function createColors(app) {
  var tintReady = false;
  const tintEl = $('#tint'),
    tintMatrix = $('#tint-m'),
    bgEl = $('#bgimg');
  const TINT_DOTS = [
    { name: 'Black and white', h: null, c: '#c9c9c9' },
    { name: 'Blue', h: 220 },
    { name: 'Teal', h: 185 },
    { name: 'Green', h: 140 },
    { name: 'Gold', h: 45 },
    { name: 'Orange', h: 22 },
    { name: 'Red', h: 355 },
    { name: 'Magenta', h: 315 },
    { name: 'Violet', h: 270 },
  ];
  function hueRgb(h) {
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)];
  }
  const css = (rgb) => `rgb(${rgb.map((x) => Math.round(x * 255)).join(',')})`;
  const auto = {
    h: settings.tintH,
    sm: 1,
    from: null,
    to: null,
    t0: 0,
    dur: 0,
    idx: -1,
    nextAt: 0,
    hits: 0,
    gap: 500,
    lastHit: 0,
    slot: null,
    gen: -1,
  };
  const autoRunning = () => settings.tintOn && settings.autoOn && settings.autoCols.length > 0;
  function effHS() {
    return autoRunning()
      ? { h: auto.h, s: settings.tintS * auto.sm }
      : { h: settings.tintH, s: settings.tintS };
  }
  let shownKey = '';
  function applyMatrix() {
    const { h, s } = effHS();
    const m = settings.tintM / 100,
      b = settings.tintB / 100,
      c = settings.tintC / 100,
      w = [0.2126, 0.7152, 0.0722];
    const H = hueRgb(h).map((x) => 1 - (s / 100) * (1 - x));
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const r = [];
      for (let j = 0; j < 3; j++) r.push(b * c * ((1 - m) * (i === j ? 1 : 0) + m * H[i] * w[j]));
      r.push(0, b * 0.5 * (1 - c));
      rows.push(r.map((x) => +x.toFixed(4)).join(' '));
    }
    rows.push('0 0 0 1 0');
    const values = rows.join('  ');
    if (values !== shownKey) {
      tintMatrix.setAttribute('values', values);
      shownKey = values;
    }
    const active = settings.tintOn && !(m === 0 && b === 1 && c === 1);
    layer.classList.toggle('tinted', active);
    bgEl.classList.toggle('tinted', active && settings.tintBg);
    $('#t-swatch').style.background = settings.tintOn ? css(H) : 'transparent';
    return { h, s };
  }
  function applyTint() {
    const { h } = applyMatrix();
    tintEl.style.setProperty('--tc', css(hueRgb(h)));
    tintEl.classList.toggle('off', !settings.tintOn);
    const run = autoRunning();
    $('#t-hue-row').classList.toggle('auto', run);
    if (run) $('#t-h').value = Math.round(h);
    $('#t-mv').textContent = settings.tintM + '%';
    $('#t-hv').textContent = Math.round(h) + '°' + (run ? ' auto' : '');
    $('#t-sv').textContent = settings.tintS + '%';
    $('#t-bv').textContent = settings.tintB + '%';
    $('#t-cv').textContent = settings.tintC + '%';
    $('#b-tint').textContent = settings.tintOn ? (run ? 'Color: auto' : 'Color: on') : 'Color';
    for (const d of $$('button', $('#t-dots'))) {
      const p = TINT_DOTS[+d.dataset.i];
      const on =
        settings.tintOn &&
        !run &&
        (p.h === null
          ? settings.tintS === 0
          : settings.tintS > 0 &&
            Math.min(Math.abs(settings.tintH - p.h), 360 - Math.abs(settings.tintH - p.h)) <= 4);
      d.setAttribute('aria-pressed', String(on));
    }
    const cur = run
      ? settings.autoCols[
          ((auto.idx % settings.autoCols.length) + settings.autoCols.length) %
            settings.autoCols.length
        ]
      : -1;
    for (const d of $$('button', $('#a-dots'))) {
      const i = +d.dataset.i;
      d.setAttribute('aria-pressed', String(settings.autoCols.includes(i)));
      d.classList.toggle('now', i === cur);
    }
    $('#a-secv').textContent = String(settings.autoSec) + ' s';
    $('#a-smoothv').textContent = settings.autoSmooth + '%';
    $('#a-timerow').hidden = settings.autoMode !== 'time';
    $('#a-beatrow').hidden = settings.autoMode !== 'beats';
    $('#a-beatsv').textContent = settings.bpm ? 'quarter notes, on tempo' : 'detected hits';
  }
  function syncTintInputs() {
    $('#t-on').checked = settings.tintOn;
    $('#t-m').value = settings.tintM;
    $('#t-h').value = settings.tintH;
    $('#t-s').value = settings.tintS;
    $('#t-b').value = settings.tintB;
    $('#t-c').value = settings.tintC;
    $('#t-bg').checked = settings.tintBg;
    $('#a-on').checked = settings.autoOn;
    $('#a-sec').value = settings.autoSec;
    $('#a-smooth').value = settings.autoSmooth;
    const mr = $(`#a-mode-${settings.autoMode}`);
    if (mr) mr.checked = true;
    const br = $(`#a-b${settings.autoBeats}`);
    if (br) br.checked = true;
    $('#t-sec-auto').open = !!settings.secAuto;
    $('#t-sec-bg').open = !!settings.secBg;
    syncBgInputs();
  }
  function syncBgInputs() {
    $('#t-bgc').value = settings.bg;
    $('#t-dim').value = settings.dim;
    $('#t-dimv').textContent = settings.dim + '%';
    $('#t-bgclear').hidden = !settings.bgImg;
  }
  function makeDots(box) {
    box.append(
      ...TINT_DOTS.map((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.i = String(i);
        b.title = p.name;
        b.setAttribute('aria-label', p.name);
        b.style.setProperty('--dc', p.c || css(hueRgb(p.h)));
        return b;
      }),
    );
  }
  const TINT_RANGES = {
    't-m': 'tintM',
    't-h': 'tintH',
    't-s': 'tintS',
    't-b': 'tintB',
    't-c': 'tintC',
  };
  function startAuto() {
    const now = performance.now();
    if (!(auto.from && auto.to)) {
      auto.h = settings.tintH;
      auto.sm = settings.tintS > 0 ? 1 : 0;
    }

    auto.idx = settings.autoCols.findIndex((i) => {
      const p = TINT_DOTS[i];
      return p.h === null
        ? auto.sm < 0.5
        : auto.sm >= 0.5 && Math.min(Math.abs(auto.h - p.h), 360 - Math.abs(auto.h - p.h)) <= 12;
    });
    auto.hits = 0;
    auto.slot = null;
    auto.nextAt = now;
    if (settings.autoMode === 'time' || settings.bpm) stepAuto(now, intervalMs());
  }
  function stopAuto() {
    settings.tintH = Math.round(((auto.h % 360) + 360) % 360);
    if (auto.sm < 0.5) settings.tintS = 0;
    auto.from = auto.to = null;
    syncTintInputs();
  }
  function intervalMs() {
    if (settings.autoMode === 'time') return settings.autoSec * 1000;
    if (settings.bpm) return (60000 / settings.bpm) * settings.autoBeats;
    return Math.max(150, Math.min(6000, auto.gap * settings.autoBeats));
  }
  function stepAuto(now, interval) {
    const list = settings.autoCols;
    if (!list.length) return;
    auto.idx = (auto.idx + 1) % list.length;
    const p = TINT_DOTS[list[auto.idx]];
    const from = { h: auto.h, sm: auto.sm };
    const to = p.h === null ? { h: auto.h, sm: 0 } : { h: p.h, sm: 1 };
    if (from.sm < 0.01) from.h = to.h;
    auto.from = from;
    auto.to = to;
    auto.t0 = now;
    auto.dur = (settings.autoSmooth / 100) * interval;
  }
  function autoHit(now) {
    if (auto.lastHit) auto.gap = auto.gap * 0.8 + Math.min(2000, now - auto.lastHit) * 0.2;
    auto.lastHit = now;
    if (!autoRunning() || settings.autoMode !== 'beats' || settings.bpm) return;
    if (++auto.hits % settings.autoBeats === 0) stepAuto(now, intervalMs());
  }
  let autoUi = 0;
  function autoFrame(now) {
    if (!autoRunning()) return;
    if (settings.autoMode === 'time') {
      if (now >= auto.nextAt) {
        stepAuto(now, intervalMs());
        auto.nextAt = now + settings.autoSec * 1000;
      }
    } else if (settings.bpm) {
      const span = 8 * settings.autoBeats;
      if (groove.locked) {
        if (auto.gen !== groove.gen) {
          auto.gen = groove.gen;
          auto.slot = null;
        }
        const n = Math.floor(groove.kOf(now + groove.lead) / span);
        if (auto.slot === null) auto.slot = n;
        else if (n !== auto.slot) {
          auto.slot = n;
          stepAuto(now, intervalMs());
        }
      } else if (now >= auto.nextAt) {
        stepAuto(now, intervalMs());
        auto.nextAt = now + intervalMs();
      }
    }
    if (auto.from && auto.to) {
      const p = auto.dur < 20 ? 1 : Math.min(1, (now - auto.t0) / auto.dur);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * p);
      const d = ((auto.to.h - auto.from.h + 540) % 360) - 180;
      auto.h = (auto.from.h + d * e + 360) % 360;
      auto.sm = auto.from.sm + (auto.to.sm - auto.from.sm) * e;
    }
    applyMatrix();
    if (now - autoUi > 120) {
      autoUi = now;
      applyTint();
    }
  }
  function showTint(on) {
    settings.tintPanel = on;
    saveSettings();
    tintEl.hidden = !on;
    $('#b-tint').setAttribute('aria-expanded', String(on));
  }
  function init() {
    makeDots($('#t-dots'));
    makeDots($('#a-dots'));
    $('#t-dots').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const p = TINT_DOTS[+b.dataset.i];
      if (p.h === null) settings.tintS = 0;
      else {
        settings.tintH = p.h;
        if (settings.tintS < 30) settings.tintS = 70;
      }
      settings.tintOn = true;
      settings.autoOn = false;
      if (settings.tintM < 20) settings.tintM = 100;
      syncTintInputs();
      applyTint();
      saveSettings();
    });
    $('#a-dots').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const i = +b.dataset.i,
        set = new Set(settings.autoCols);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      settings.autoCols = TINT_DOTS.map((_, k) => k).filter((k) => set.has(k));
      applyTint();
      saveSettings();
    });
    tintEl.addEventListener('input', (e) => {
      const t = e.target,
        id = t.id;
      if (TINT_RANGES[id]) {
        settings[TINT_RANGES[id]] = +t.value;
        if (id === 't-h' && settings.autoOn) {
          settings.autoOn = false;
          $('#a-on').checked = false;
        }
        if (!settings.tintOn) {
          settings.tintOn = true;
          $('#t-on').checked = true;
        }
      } else if (id === 't-on') settings.tintOn = t.checked;
      else if (id === 't-bg') settings.tintBg = t.checked;
      else if (id === 'a-on') {
        settings.autoOn = t.checked;
        if (settings.autoOn) {
          settings.tintOn = true;
          $('#t-on').checked = true;
          startAuto();
        } else stopAuto();
      } else if (id === 'a-sec') {
        settings.autoSec = +t.value;
        auto.nextAt = Math.min(auto.nextAt, performance.now() + settings.autoSec * 1000);
      } else if (id === 'a-smooth') settings.autoSmooth = +t.value;
      else if (t.name === 'a-mode') {
        settings.autoMode = t.value;
        startAuto();
      } else if (t.name === 'a-beats') {
        settings.autoBeats = +t.value;
        auto.slot = null;
        auto.hits = 0;
      } else if (id === 't-bgc') {
        settings.bg = t.value;
        $('#bg').value = settings.bg;
        app.settings.refreshUI();
      } else if (id === 't-dim') {
        settings.dim = +t.value;
        $('#dim').value = settings.dim;
        app.settings.refreshUI();
      } else return;
      applyTint();
      saveSettings();
    });
    for (const [id, key] of [
      ['t-sec-auto', 'secAuto'],
      ['t-sec-bg', 'secBg'],
    ]) {
      $('#' + id).addEventListener('toggle', (e) => {
        settings[key] = e.target.open;
        saveSettings();
      });
    }
    $('#t-bgpick').addEventListener('click', () => $('#bgfile').click());
    $('#t-bgclear').addEventListener('click', () => {
      settings.bgImg = '';
      saveSettings();
      app.settings.refreshUI();
    });
    $('#b-tint').addEventListener('click', () => showTint(tintEl.hidden));
    $('#t-hide').addEventListener('click', () => showTint(false));
    syncTintInputs();
    if (autoRunning()) startAuto();
    applyTint();
    showTint(!!settings.tintPanel);
    tintReady = true;
  }
  return {
    init,
    get tintReady() {
      return tintReady;
    },
    tintEl,
    applyTint,
    syncBgInputs,
    autoHit,
    autoFrame,
    showTint,
  };
}
