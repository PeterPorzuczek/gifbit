import { packItem, exportObj, exportFilename, filenameName, setsFromJson } from './format.js';
import { $ } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
import { downloadJson } from '../core/files.js';
export function createSets(app) {
  const SETS = 'gifbit.sets';
  const starterId = 'starter-sample';
  let sets = [];
  let exportTarget = null;
  function saveSets() {
    try {
      localStorage.setItem(SETS, JSON.stringify(sets));
      return true;
    } catch (e) {
      return false;
    }
  }
  function findSet(id) {
    return sets.find((s) => s.id === id);
  }

  const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function uniqueName(name) {
    const taken = new Set(sets.map((s) => s.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    let n = 2;
    while (taken.has(`${name} (${n})`.toLowerCase())) n++;
    return `${name} (${n})`;
  }
  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '';
    }
  };
  const plural = (n) => (n === 1 ? 'animation' : 'animations');
  function renderSets() {
    const box = $('#setlist');
    box.replaceChildren();
    for (const s of sets) {
      const row = document.createElement('div');
      row.className = 'setrow';
      row.dataset.id = s.id;
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = 'setpick';
      r.id = 'set-' + s.id;
      r.value = s.id;
      r.checked = settings.setId === s.id;
      const lab = document.createElement('label');
      lab.htmlFor = r.id;
      const thumbs = document.createElement('span');
      thumbs.className = 'setthumbs';
      for (const it of s.items.slice(0, 4)) {
        const im = new Image();
        im.alt = '';
        im.loading = 'lazy';
        im.src = it.thumb;
        thumbs.appendChild(im);
      }
      const txt = document.createElement('span');
      txt.className = 'settxt';
      const b = document.createElement('b');
      b.textContent = s.name;
      const meta = document.createElement('span');
      meta.textContent = `${s.items.length} ${plural(s.items.length)} · ${fmtDate(s.updated)}`;
      txt.append(b, meta);
      if (s.description) {
        const description = document.createElement('span');
        description.textContent = s.description;
        txt.append(description);
      }
      lab.append(thumbs, txt);
      const ex = document.createElement('button');
      ex.type = 'button';
      ex.className = 'btn sm';
      ex.dataset.act = 'export';
      ex.textContent = 'Export';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn sm';
      del.dataset.act = 'delete';
      del.textContent = 'Delete';
      row.append(r, lab, ex, del);
      box.appendChild(row);
    }
    $('#sets-empty').hidden = sets.length > 0;
    $('#sets-exportall').hidden = !sets.length;
    app.starter?.refresh();
  }
  function addStarter(bank) {
    const existing = findSet(starterId);
    if (existing) return { set: existing, saved: true };
    const now = new Date().toISOString();
    const set = {
      ...bank,
      id: starterId,
      name: uniqueName(bank.name),
      created: bank.created || now,
      updated: bank.updated || now,
    };
    sets.unshift(set);
    const saved = saveSets();
    renderSets();
    return { set, saved };
  }
  function saveAsSet(rawName) {
    if (!app.library.active.length) {
      app.browser.toast('Nothing is on screen, so there is nothing to save.');
      return;
    }
    const name = rawName.trim().slice(0, 60) || 'Untitled';
    const now = new Date().toISOString();
    const data = app.library.active.map(packItem);
    const words = [...new Set(app.library.active.map((it) => it.word).filter(Boolean))];
    let set = sets.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const before = set ? Object.assign({}, set) : null;
    if (set) Object.assign(set, { items: data, words, updated: now });
    else {
      set = { id: newId(), name, description: '', created: now, updated: now, words, items: data };
      sets.push(set);
    }
    if (!saveSets()) {
      if (before) Object.assign(set, before);
      else sets.pop();
      app.browser.toast(
        'The browser storage is full. Export and delete old sets, then try again.',
        6000,
      );
      return;
    }
    renderSets();
    app.browser.toast(
      before
        ? `Updated set “${set.name}”: ${data.length} ${plural(data.length)}.`
        : `Saved set “${set.name}”: ${data.length} ${plural(data.length)}. Pick it in Settings under “Saved set”.`,
      5000,
    );
  }

  async function importFiles(files) {
    const added = [];
    let bad = 0;
    for (const f of files) {
      try {
        const found = setsFromJson(
          JSON.parse(await f.text()),
          f.name ? filenameName(f.name) : 'Imported set',
        );
        if (!found.length) {
          bad++;
          continue;
        }
        const now = new Date().toISOString();
        for (const s of found) {
          const set = {
            id: newId(),
            name: uniqueName(s.name),
            description: s.description,
            created: now,
            updated: now,
            words: s.words,
            items: s.items,
          };
          sets.push(set);
          added.push(set);
        }
      } catch (e) {
        bad++;
      }
    }
    if (added.length && !saveSets()) {
      sets = sets.filter((s) => !added.includes(s));
      app.browser.toast('The browser storage is full. Delete old sets and try again.', 6000);
      return;
    }
    if (added.length === 1) {
      settings.setId = added[0].id;
      saveSettings();
    }
    renderSets();
    const msg = [];
    if (added.length)
      msg.push(
        added.length === 1 ? `Imported set “${added[0].name}”.` : `Imported ${added.length} sets.`,
      );
    if (bad)
      msg.push(
        bad === 1
          ? "One file doesn't look like a GIFbit set."
          : `${bad} files don't look like GIFbit sets.`,
      );
    app.browser.toast(msg.join(' ') || 'Nothing was imported.', 5000);
    return added;
  }
  function openExport(set = null) {
    exportTarget = set;
    $('#bank-export-name').value = set?.name || 'All sets';
    $('#bank-export-description').value = set?.description || '';
    $('#bank-export-filename').textContent = exportFilename($('#bank-export-name').value);
    $('#bank-export').showModal();
  }
  function init() {
    try {
      sets = JSON.parse(localStorage.getItem(SETS) || '[]');
      sets = Array.isArray(sets)
        ? sets
            .filter(
              (s) =>
                s &&
                typeof s.id === 'string' &&
                typeof s.name === 'string' &&
                Array.isArray(s.items),
            )
            .map((s) => ({
              ...s,
              description: typeof s.description === 'string' ? s.description.slice(0, 1000) : '',
              items: setsFromJson(s)[0]?.items || [],
            }))
            .filter((s) => s.items.length)
        : [];
    } catch (e) {
      sets = [];
    }
    $('#setlist').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const id = b.closest('.setrow').dataset.id,
        s = findSet(id);
      if (!s) return;
      if (b.dataset.act === 'export') {
        openExport(s);
        return;
      }
      if (!b.dataset.armed) {
        b.dataset.armed = '1';
        b.textContent = 'Sure?';
        b.classList.add('warn');
        setTimeout(() => {
          if (b.isConnected) {
            delete b.dataset.armed;
            b.textContent = 'Delete';
            b.classList.remove('warn');
          }
        }, 3000);
        return;
      }
      const before = sets;
      sets = sets.filter((x) => x.id !== id);
      if (!saveSets()) {
        sets = before;
        app.browser.toast('Could not save this change. Try again.');
        return;
      }
      if (settings.setId === id) {
        settings.setId = '';
        saveSettings();
      }
      renderSets();
      app.browser.toast(`Deleted set “${s.name}”.`);
    });
    $('#sets-import').addEventListener('click', () => $('#sets-file').click());
    $('#sets-file').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length) importFiles(files);
    });
    $('#sets-exportall').addEventListener('click', () => {
      if (sets.length) openExport();
    });
    $('#bank-export-cancel').addEventListener('click', () => $('#bank-export').close());
    $('#bank-export-name').addEventListener('input', () => {
      $('#bank-export-filename').textContent = exportFilename($('#bank-export-name').value);
    });
    $('#bank-export-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const name = $('#bank-export-name').value.trim() || 'Untitled';
      const description = $('#bank-export-description').value.trim();
      const updated = new Date().toISOString();
      let value;
      if (exportTarget) {
        const before = { ...exportTarget };
        Object.assign(exportTarget, { name, description, updated });
        value = exportObj(exportTarget);
        if (!saveSets()) {
          Object.assign(exportTarget, before);
          app.browser.toast(
            'The export is ready, but its details could not be saved in this browser.',
          );
        }
        renderSets();
      } else value = { gifbit: 1, name, description, updated, sets: sets.map(exportObj) };
      downloadJson(exportFilename(name), value);
      $('#bank-export').close();
    });
  }
  return {
    init,
    get sets() {
      return sets;
    },
    findSet,
    get starter() {
      return findSet(starterId);
    },
    addStarter,
    plural,
    renderSets,
    saveAsSet,
    importFiles,
    setsFromJson,
  };
}
