import { $ } from '../core/dom.js';
import { settings } from '../core/state.js';
import { downloadJson } from '../core/files.js';
import { exportFilename } from '../library/format.js';
import {
  createConfiguration,
  restoreConfiguration,
  consumeRestore,
  maxConfigurationSize,
} from './configuration.js';

export function createBackup(app) {
  let restored = false;
  try {
    restored = consumeRestore(localStorage);
  } catch {}
  function status(message, error = false) {
    $('#config-status').textContent = message;
    $('#config-status').classList.toggle('err', error);
  }
  function init() {
    if (restored) status('Configuration imported. Your settings and selected source are ready.');
    $('#config-export').addEventListener('click', () => {
      try {
        app.settings.readForm();
        const config = createConfiguration(
          settings,
          app.sets.sets,
          app.library.excluded,
          app.banks.favorites,
        );
        downloadJson(exportFilename('gifbit-configuration'), config);
        status('Configuration exported, including all saved sets and both scene layouts.');
      } catch (error) {
        status(error.message, true);
      }
    });
    $('#config-import').addEventListener('click', () => $('#config-file').click());
    $('#config-file').addEventListener('change', async (event) => {
      event.stopPropagation();
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      $('#config-import').disabled = true;
      $('#config-export').disabled = true;
      status('Reading configuration…');
      try {
        if (file.size > maxConfigurationSize)
          throw new Error('Configuration files must be smaller than 50 MB.');
        const text = await file.text();
        let value;
        try {
          value = JSON.parse(text.replace(/^\uFEFF/, ''));
        } catch {
          throw new Error('This file is not valid JSON. Nothing was imported.');
        }
        restoreConfiguration(localStorage, value);
        app.starter.cancel();
        location.reload();
      } catch (error) {
        status(error.message, true);
        $('#config-import').disabled = false;
        $('#config-export').disabled = false;
      }
    });
    $('#config-file').addEventListener('input', (event) => event.stopPropagation());
  }
  return { init, restored };
}
