import { $, form } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
import { readStarterBank } from './api.js';

export function createStarter(app) {
  let loading = false,
    choice = 0;
  const locked = new Set();
  function refresh() {
    const waiting = loading && settings.source === 'set' && !app.sets.findSet(settings.setId);
    for (const selector of ['#go', '#go-nomic', '#b-curate']) {
      const button = $(selector);
      if (waiting && !button.disabled) {
        button.disabled = true;
        locked.add(button);
      } else if (!waiting && locked.delete(button)) button.disabled = false;
    }
  }
  function status(message, error = false) {
    $('#starter-status').textContent = message;
    $('#starter-status').classList.toggle('err', error);
  }
  async function select(set) {
    settings.source = 'set';
    settings.setId = set.id;
    saveSettings();
    app.settings.populate();
    app.settings.refreshUI();
    await app.library.loadItems();
  }
  async function load() {
    if (loading) return;
    loading = true;
    $('#starter-retry').hidden = true;
    const original = { source: settings.source, setId: settings.setId, choice };
    const cached = app.sets.starter;
    refresh();
    status(cached ? 'Preparing your starter set…' : 'Loading your starter set…');
    try {
      const { set, saved } = cached
        ? { set: cached, saved: true }
        : app.sets.addStarter(await readStarterBank());
      if (
        choice === original.choice &&
        settings.source === original.source &&
        settings.setId === original.setId &&
        !app.session.running &&
        app.curator.curator.hidden
      )
        await select(set);
      status(
        saved
          ? `Starter set “${set.name}”: ${set.items.length} animations, no GIPHY key needed.`
          : `Starter set “${set.name}” is ready for this visit, but browser storage could not save it.`,
      );
    } catch (error) {
      status(
        `Could not load the starter set. ${error.message} Choose another source or retry.`,
        true,
      );
      $('#starter-retry').hidden = false;
    } finally {
      loading = false;
      refresh();
    }
  }
  function init() {
    form.addEventListener('change', (event) => {
      if (event.target.matches('input[name="source"], input[name="setpick"]')) choice++;
      refresh();
    });
    $('#starter-retry').addEventListener('click', load);
    load();
  }
  return { init, refresh };
}
