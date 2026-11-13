import { $, stage, form } from '../core/dom.js';
import { settings, groove, saveSettings } from '../core/state.js';
export function createSettings(app) {
  const setRadio = (name, val) => {
    const el = form.querySelector(`input[name="${name}"][value="${val}"]`);
    if (el) el.checked = true;
  };
  const getRadio = (name) => {
    const el = form.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  };
  function populate() {
    $('#key').value = settings.key;
    $('#words').value = settings.words;
    setRadio('type', settings.type);
    setRadio('mode', settings.mode);
    setRadio('every', String(settings.every));
    setRadio('band', settings.band);
    setRadio('source', settings.source);
    setRadio('order', settings.order);
    setRadio('limit', String(settings.limit));
    app.sets.renderSets();
    $('#max').value = settings.max;
    $('#sens').value = settings.sens;
    $('#bg').value = settings.bg;
    $('#dim').value = settings.dim;
    $('#safe').checked = settings.safe;
    $('#bpm').value = settings.bpm || '';
    $('#lead').value = settings.lead;
    $('#bounce').value = settings.bounce;
  }
  function readForm() {
    settings.key = $('#key').value.trim();
    settings.words = $('#words').value;
    settings.type = getRadio('type') || 'gifs';
    settings.mode = getRadio('mode') || 'collage';
    settings.every = +getRadio('every') || 1;
    settings.band = getRadio('band') || 'bass';
    settings.source = getRadio('source') || 'words';
    settings.order = getRadio('order') || 'random';
    const pickedSet = getRadio('setpick');
    if (pickedSet) settings.setId = pickedSet;
    settings.max = +$('#max').value;
    settings.sens = +$('#sens').value;
    settings.bg = $('#bg').value;
    settings.dim = +$('#dim').value;
    settings.safe = $('#safe').checked;
    const bpm = parseFloat(String($('#bpm').value).replace(',', '.'));
    settings.bpm = bpm >= 50 && bpm <= 220 ? Math.round(bpm * 10) / 10 : 0;
    settings.limit = +getRadio('limit') || 16;
    settings.lead = +$('#lead').value;
    settings.bounce = +$('#bounce').value;
  }
  function refreshUI() {
    $('#maxv').textContent = settings.max;
    $('#sensv').textContent = settings.sens;
    $('#dimv').textContent = settings.dim + '%';
    $('#leadv').textContent = settings.lead + ' ms';
    $('#bouncev').textContent = settings.bounce;
    $('#limitfield').hidden = $('#leadfield').hidden = !settings.bpm;
    groove.setBpm(settings.bpm);
    groove.lead = settings.lead;
    if (app.colors.tintReady) {
      app.colors.syncBgInputs();
      app.colors.applyTint();
    }
    $('#maxfield').hidden = settings.mode === 'single';
    $('#src-words').hidden = settings.source !== 'words';
    $('#src-set').hidden = settings.source !== 'set';
    if (settings.source === 'set' && !app.sets.findSet(settings.setId) && app.sets.sets.length) {
      settings.setId = app.sets.sets[0].id;
      const r = $('#set-' + settings.setId);
      if (r) r.checked = true;
      saveSettings();
    }
    $('#bgclear').hidden = !settings.bgImg;
    stage.style.setProperty('--bgc', settings.bg);
    $('#bgimg').style.backgroundImage = settings.bgImg ? `url("${settings.bgImg}")` : 'none';
    $('#shade').style.opacity = String(settings.dim / 100);
    app.playback.trim();
    app.microphone.applyBand();
    app.microphone.sendSens();
    if (settings.order !== lastOrder || settings.mode !== lastMode) {
      lastOrder = settings.order;
      lastMode = settings.mode;
      app.playback.seq = 0;
      app.playback.resetPool();
      app.library.refreshActive();
    }
    app.scene.refresh();
  }
  let lastOrder = settings.order;
  let lastMode = settings.mode;
  const onForm = () => {
    readForm();
    saveSettings();
    refreshUI();
  };
  function wordList() {
    const seen = new Set(),
      out = [];
    for (const raw of settings.words.split(/[,;\n]+/)) {
      const w = raw.trim(),
        k = w.toLowerCase();
      if (w && !seen.has(k)) {
        seen.add(k);
        out.push(w);
      }
    }
    return out.slice(0, 10);
  }
  function init() {
    form.addEventListener('input', onForm);
    form.addEventListener('change', onForm);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      app.session.go(true);
    });
    $('#go-nomic').addEventListener('click', () => app.session.go(false));
    $('#bgpick').addEventListener('click', () => $('#bgfile').click());
    $('#bgfile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        settings.bgImg = String(rd.result);
        const kept = saveSettings();
        refreshUI();
        if (!kept)
          app.browser.toast('The background works, but it is too large to remember for next time.');
      };
      rd.readAsDataURL(f);
      e.target.value = '';
    });
    $('#bgclear').addEventListener('click', () => {
      settings.bgImg = '';
      saveSettings();
      refreshUI();
    });
  }
  return { init, populate, readForm, refreshUI, wordList };
}
