import { $, $$ } from './dom.js';
import { settings, groove, saveSettings } from './state.js';
export function createRhythm(app) {
  let lastStatus = 0;
  const recentKinds = [];
  let beatN = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    for (const ev of groove.tick(now, 8)) fire(ev, now);
    app.playback.stepSpring(now);
    if (app.colors.tintReady) app.colors.autoFrame(now);
    if (app.calibration.calOpen) app.calibration.calFrame(now);
    if (app.microphone.micOn) {
      app.microphone.meterShown = Math.max(app.microphone.meterIn, app.microphone.meterShown - 1.2);
      app.microphone.meterIn = -120;
      const pos = (db) => Math.max(0, Math.min(100, ((db + 72) / 72) * 100));
      const fw = pos(app.microphone.meterShown).toFixed(1) + '%',
        gl = Math.min(99, pos(app.microphone.meterGate)).toFixed(1) + '%';
      for (const m of app.microphone.meterEls) {
        m.fill.style.width = fw;
        m.thr.style.left = gl;
      }
    }
    if (now - lastStatus > 300) {
      lastStatus = now;
      updateTempoText(now);
    }
  }
  function updateTempoText(now) {
    const st = groove.status(now);
    let t;
    if (st.mode === 'free') t = 'No tempo: every hit live';
    else if (st.mode === 'idle') t = `${fmtBpm(st.bpm)} BPM · waiting for the beat`;
    else if (st.mode === 'search')
      t = `${fmtBpm(st.bpm)} BPM · finding the grid… (if it takes long, check the tempo)`;
    else {
      const n = recentKinds.length,
        share = n ? Math.round((recentKinds.filter((k) => k === 'predict').length / n) * 100) : 0;
      t =
        `${fmtBpm(st.bpm)} BPM · grid locked · ${share}% of hits with no delay` +
        (st.paused ? ' · pattern changed, catching live' : '');
    }
    $$('.tempo:not(#cal-status)').forEach((el) => {
      el.textContent = app.microphone.micOn ? t : '';
    });
    if (app.calibration.calOpen) {
      $('#cal-status').textContent =
        st.mode === 'locked'
          ? recentKinds.slice(-4).includes('predict')
            ? 'Predicting the kick, go ahead and adjust.'
            : 'Grid locked, learning the pattern…'
          : st.mode === 'search'
            ? 'Finding the rhythm…'
            : 'Waiting for the kick…';
    }
  }
  const fmtBpm = (b) => (Math.round(b * 10) / 10).toString();
  let flashT;
  function flash() {
    document.body.classList.add('hit');
    clearTimeout(flashT);
    flashT = setTimeout(() => document.body.classList.remove('hit'), 90);
  }
  let lastSwap = -1e9;
  function fire(ev, now) {
    if (ev.kind === 'react' || ev.kind === 'predict') {
      recentKinds.push(ev.kind);
      if (recentKinds.length > 32) recentKinds.shift();
    }
    if (app.calibration.calOpen) {
      if (ev.kind === 'predict') app.calibration.pulseRing(now);
      return;
    }
    app.colors.autoHit(now);
    app.playback.kick(ev.v);
    beatN++;
    if (!app.session.running || beatN % settings.every !== 0) return;
    const gap = settings.bpm ? (60000 / settings.bpm) * (4 / settings.limit) * 0.85 : 0;
    if (now - lastSwap < gap) return;
    if (app.playback.showNext()) lastSwap = now;
  }
  function manualHit() {
    flash();
    fire({ kind: 'manual', v: 1 }, performance.now());
  }
  let taps = [],
    tapT;
  function tap() {
    const now = performance.now(),
      btn = $('#tap');
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 8) taps.shift();
    let msg;
    if (taps.length >= 4) {
      const iv = [];
      for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
      iv.sort((a, b) => a - b);
      const bpm = Math.round((60000 / iv[iv.length >> 1]) * 2) / 2;
      if (bpm >= 50 && bpm <= 220) {
        settings.bpm = bpm;
        $('#bpm').value = bpm;
        saveSettings();
        app.settings.refreshUI();
      }
      msg = `${fmtBpm(bpm)} BPM`;
    } else msg = `${4 - taps.length} more…`;
    btn.textContent = msg;
    clearTimeout(tapT);
    tapT = setTimeout(() => {
      btn.textContent = 'Tap';
    }, 2500);
    return msg;
  }
  function init() {
    requestAnimationFrame(frame);
    $('#tap').addEventListener('click', tap);
  }
  return { init, fmtBpm, flash, fire, manualHit, tap };
}
