import { $, setup } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
export function createSession(app) {
  let running = false,
    busy = false;
  function showErr(t) {
    const el = $('#err');
    el.textContent = t;
    el.hidden = false;
  }
  function hideErr() {
    $('#err').hidden = true;
  }
  function updateButtons() {
    $('#go').textContent = running ? 'Apply and return' : 'Start';
    $('#go-nomic').hidden = running;
  }
  function setBusy(on, label) {
    busy = on;
    $('#go').disabled = on;
    $('#go-nomic').disabled = on;
    if (on) $('#go').textContent = label;
    else updateButtons();
  }
  function openSetup() {
    setup.hidden = false;
    document.body.classList.remove('running', 'awake');
  }
  function closeSetup() {
    setup.hidden = true;
    if (running) document.body.classList.add('running');
  }
  async function go(useMic) {
    if (busy) return;
    hideErr();
    app.settings.readForm();
    saveSettings();
    const problem = app.library.sourceProblem();
    if (problem) return showErr(problem);
    if (useMic) app.microphone.ensureCtx();
    setBusy(true, settings.source === 'set' ? 'Loading set…' : 'Loading animations…');
    let info;
    try {
      info = await app.library.loadItems();
    } catch (e) {
      setBusy(false);
      return showErr(app.library.errText(e));
    }
    if (!app.library.active.length) {
      setBusy(false);
      return showErr('All animations are put aside. Restore a few in “Review animations”.');
    }
    if (useMic && !app.microphone.micOn) {
      setBusy(true, 'Waiting for the microphone…');
      try {
        await app.microphone.startMic();
      } catch (e) {
        setBusy(false);
        return showErr(app.calibration.micText(e));
      }
    }
    running = true;
    setBusy(false);
    app.playback.fill();
    closeSetup();
    const msgs = [];
    if (info.empty.length) msgs.push('No results for: ' + info.empty.join(', ') + '.');
    msgs.push(
      app.microphone.micOn
        ? 'Play. Esc or moving the mouse brings up the settings.'
        : 'No-microphone mode: Space or a click is a hit.',
    );
    const full = await app.browser.goFull();
    if (!full) msgs.push('F turns on full screen.');
    app.browser.toast(msgs.join(' '), 5000);
    app.browser.wake();
  }
  function init() {}
  return {
    init,
    get running() {
      return running;
    },
    showErr,
    hideErr,
    updateButtons,
    openSetup,
    closeSetup,
    go,
  };
}
