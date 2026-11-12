import { Groove } from './groove.js';
import { normalizeSettings } from './settings-data.js';
const STORE = 'gifbit.v1';
let stored;
try {
  stored = JSON.parse(localStorage.getItem(STORE) || '{}');
} catch {}
export const settings = normalizeSettings(stored);
export const groove = new Groove();
export function saveSettings() {
  try {
    localStorage.setItem(STORE, JSON.stringify(settings));
    return true;
  } catch {
    try {
      localStorage.setItem(STORE, JSON.stringify({ ...settings, bgImg: '' }));
    } catch {}
    return false;
  }
}
