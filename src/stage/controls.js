import { $, stage, layer, setup } from '../core/dom.js';
import { settings } from '../core/state.js';
export function createControls(app) {
  let idleT;
  function init() {
    document.addEventListener('mousemove', () => {
      if (!app.session.running || !setup.hidden) return;
      document.body.classList.add('awake');
      clearTimeout(idleT);
      idleT = setTimeout(() => document.body.classList.remove('awake'), 2200);
    });
    stage.addEventListener('click', () => {
      if (app.session.running && setup.hidden) app.rhythm.manualHit();
    });
    $('#b-settings').addEventListener('click', app.session.openSetup);
    $('#b-full').addEventListener('click', app.browser.toggleFull);
    document.addEventListener('keydown', (e) => {
      if ($('#banks').open || $('#bank-export').open) return;
      if (app.calibration.calOpen) {
        if (e.key === 'Escape') app.calibration.closeCal();
        else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.id !== 'cal-lead') {
          e.preventDefault();
          app.calibration.setLead(settings.lead + (e.key === 'ArrowRight' ? 5 : -5));
        }
        return;
      }
      if (!app.curator.curator.hidden) {
        if (e.key === 'Escape') {
          if (!app.curator.addMenu.hidden) {
            app.curator.closeAddMenu();
            app.curator.addBtn.focus();
          } else app.curator.closeCurator();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (!app.session.running) return;
        if (setup.hidden) app.session.openSetup();
        else {
          app.session.closeSetup();
          if (app.library.sigNow() !== app.library.sig)
            app.browser.toast('New keywords take effect after you click “Apply and return”.');
        }
        return;
      }
      const t = e.target;
      const typing =
        t &&
        ((t.tagName === 'INPUT' && (t.type === 'text' || t.type === 'number')) ||
          t.tagName === 'TEXTAREA');
      if (typing || !setup.hidden || !app.session.running) return;
      const k = e.key.toLowerCase();
      if (e.key === ' ') {
        e.preventDefault();
        app.rhythm.manualHit();
      } else if (k === 't') app.browser.toast('Tempo: ' + app.rhythm.tap(), 1500);
      else if (k === 'f') app.browser.toggleFull();
      else if (k === 'k') app.colors.showTint(app.colors.tintEl.hidden);
      else if (k === 'h') $('#hud').hidden = !$('#hud').hidden;
      else if (k === 'c') layer.replaceChildren();
      else if (k === 's') app.session.openSetup();
    });
    app.settings.populate();
    app.settings.refreshUI();
    app.session.updateButtons();
  }
  return { init };
}
