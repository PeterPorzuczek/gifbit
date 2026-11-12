import { $ } from '../core/dom.js';
export function createBrowser(app) {
  async function goFull() {
    const el = document.documentElement;
    if (document.fullscreenElement) return true;
    if (!el.requestFullscreen) return false;
    try {
      await el.requestFullscreen();
      return true;
    } catch (e) {
      return false;
    }
  }
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else
      goFull().then((ok) => {
        if (!ok) toast('The browser did not allow full screen.');
      });
  }
  let lock = null;
  async function wake() {
    try {
      if ('wakeLock' in navigator && !lock) {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => {
          lock = null;
        });
      }
    } catch (e) {}
  }
  let toastT;
  function toast(msg, ms = 3800) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), ms);
  }
  function init() {
    document.addEventListener('fullscreenchange', () => {
      $('#b-full').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && app.session.running) wake();
    });
  }
  return { init, goFull, toggleFull, wake, toast };
}
