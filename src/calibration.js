import { $ } from './dom.js';
import { settings, groove, saveSettings } from './state.js';
export function createCalibration(app) {
  let calOpen = false,
    ringOff = 0,
    micOff = 0,
    calN = 0;
  const calRing = $('#cal-ring'),
    calMic = $('#cal-mic');
  function pulseRing(now) {
    calRing.classList.add('on');
    calRing.textContent = String((calN++ % 4) + 1);
    ringOff = now + 90;
  }
  function pulseMicDot(now) {
    calMic.classList.add('on');
    micOff = now + 90;
  }
  function calFrame(now) {
    if (ringOff && now >= ringOff) {
      calRing.classList.remove('on');
      ringOff = 0;
    }
    if (micOff && now >= micOff) {
      calMic.classList.remove('on');
      micOff = 0;
    }
  }
  function setLead(ms) {
    settings.lead = Math.max(0, Math.min(250, Math.round(ms / 5) * 5));
    groove.lead = settings.lead;
    $('#lead').value = settings.lead;
    $('#cal-lead').value = settings.lead;
    $('#leadv').textContent = $('#cal-leadv').textContent = settings.lead + ' ms';
    saveSettings();
  }
  async function openCal() {
    app.session.hideErr();
    app.settings.readForm();
    saveSettings();
    app.settings.refreshUI();
    if (!settings.bpm) return app.session.showErr('Enter or tap a tempo first.');
    if (!app.microphone.micOn) {
      app.microphone.ensureCtx();
      try {
        await app.microphone.startMic();
      } catch (e) {
        return app.session.showErr(micText(e));
      }
    }
    $('#cal-bpm').textContent = app.rhythm.fmtBpm(settings.bpm);
    setLead(settings.lead);
    calN = 0;
    calRing.textContent = '–';
    calOpen = true;
    $('#cal').hidden = false;
    $('#cal-lead').focus();
    app.browser.wake();
  }
  function closeCal() {
    calOpen = false;
    $('#cal').hidden = true;
    calRing.classList.remove('on');
    calMic.classList.remove('on');
    $('#b-cal').focus();
  }
  function micText(e) {
    const n = e && e.name;
    if (e && e.kind === 'nomic')
      return 'Microphone access needs HTTPS or localhost and a browser with Web Audio support.';
    if (n === 'NotAllowedError' || n === 'SecurityError')
      return 'The browser was not allowed to use the microphone. Click the icon on the left of the address bar, allow the microphone and try again. You can also start without the microphone.';
    if (n === 'NotFoundError')
      return 'No microphone found. Plug one in or start without the microphone.';
    if (n === 'NotReadableError')
      return 'The microphone is busy in another program. Close it and try again.';
    return 'Could not turn on the microphone.';
  }
  function init() {
    $('#b-cal').addEventListener('click', openCal);
    $('#cal-done').addEventListener('click', closeCal);
    $('#cal-lead').addEventListener('input', (e) => setLead(+e.target.value));
  }
  return {
    init,
    get calOpen() {
      return calOpen;
    },
    pulseRing,
    pulseMicDot,
    calFrame,
    setLead,
    closeCal,
    micText,
  };
}
