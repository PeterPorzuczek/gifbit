import { $, $$ } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
export function createCurator(app) {
  const curator = $('#curator'),
    inTiles = $('#in-tiles'),
    outTiles = $('#out-tiles');
  let curSig = '',
    curFilter = '',
    dragId = '';
  async function openCurator() {
    app.session.hideErr();
    app.settings.readForm();
    saveSettings();
    const problem = app.library.sourceProblem();
    if (problem) return app.session.showErr(problem);
    if (app.library.sigNow() !== app.library.sig || !app.library.items.length) {
      const b = $('#b-curate');
      b.disabled = true;
      b.textContent = settings.source === 'set' ? 'Loading…' : 'Loading…';
      try {
        await app.library.loadItems();
      } catch (e) {
        return app.session.showErr(app.library.errText(e));
      } finally {
        b.disabled = false;
        b.textContent = 'Review animations';
      }
    }
    if (curSig !== app.library.sig) buildCurator();
    const nameEl = $('#setname'),
      base = app.library.loadedFrom || app.settings.wordList().slice(0, 3).join(', ');
    if (app.library.extras.length)
      nameEl.value = [base, ...app.library.extras].join(' + ').slice(0, 60);
    else if (app.library.loadedFrom || !nameEl.value) nameEl.value = base;
    curator.hidden = false;
    $('#cur-done').focus();
  }
  function closeCurator() {
    curator.hidden = true;
    $('#b-curate').focus();
  }
  function buildCurator() {
    inTiles.replaceChildren();
    outTiles.replaceChildren();
    app.library.items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile' + (it.sticker ? ' sticker' : '');
      b.draggable = true;
      b.dataset.id = it.id;
      b.dataset.i = String(i);
      b.dataset.word = it.word;
      b.title = it.word;
      const ar = Math.max(0.4, Math.min(3, it.w / it.h));
      b.style.aspectRatio = ar.toFixed(3);
      const img = new Image();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = it.word;
      img.src = it.thumb;
      b.appendChild(img);
      (app.library.excluded.has(it.id) ? outTiles : inTiles).appendChild(b);
    });
    const ws = [...new Set(app.library.items.map((it) => it.word).filter(Boolean))];
    if (curFilter && !ws.includes(curFilter)) curFilter = '';
    const chips = [['', 'All', app.library.items.length]].concat(
      ws.map((w) => [w, w, app.library.items.filter((it) => it.word === w).length]),
    );
    $('#cur-chips').replaceChildren(
      ...chips.map(([val, label, n]) => {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'fchip';
        c.dataset.word = val;
        c.append(label);
        const s = document.createElement('span');
        s.textContent = n;
        c.append(s);
        return c;
      }),
    );
    curSig = app.library.sig;
    applyFilter();
  }
  function applyFilter() {
    $$('.fchip', $('#cur-chips')).forEach((c) =>
      c.setAttribute('aria-pressed', String(c.dataset.word === curFilter)),
    );
    for (const t of $$('.tile', curator)) t.hidden = !!curFilter && t.dataset.word !== curFilter;
    updateCounts();
  }
  function updateCounts() {
    const vis = (el) => $$('.tile:not([hidden])', el).length;
    const nIn = vis(inTiles),
      nOut = vis(outTiles);
    $('#in-count').textContent = nIn;
    $('#out-count').textContent = nOut;
    $('#in-empty').hidden = nIn > 0;
    $('#out-empty').hidden = nOut > 0;
    $('#in-all').disabled = !nIn;
    $('#out-all').disabled = !nOut;
  }
  function placeTile(tile, toOut) {
    const target = toOut ? outTiles : inTiles,
      i = +tile.dataset.i;
    const after = Array.prototype.find.call(target.children, (c) => c !== tile && +c.dataset.i > i);
    target.insertBefore(tile, after || null);
    if (toOut) app.library.excluded.add(tile.dataset.id);
    else app.library.excluded.delete(tile.dataset.id);
  }
  function moveTiles(tiles, toOut) {
    if (!tiles.length) return;
    tiles.forEach((t) => placeTile(t, toOut));
    app.library.saveExcl();
    app.library.refreshActive();
    updateCounts();
  }
  function mergeItems(list, label) {
    const have = new Set(app.library.items.map((it) => it.id));
    let added = 0,
      restored = 0;
    for (const x of list) {
      if (have.has(x.id)) {
        if (app.library.excluded.has(x.id)) {
          app.library.excluded.delete(x.id);
          restored++;
        }
        continue;
      }
      app.library.items.push(Object.assign({}, x));
      have.add(x.id);
      added++;
      app.library.excluded.delete(x.id);
    }
    if (!added && !restored) {
      app.browser.toast(`All animations from “${label}” are already in the list.`);
      return;
    }
    if (added) app.library.extras.push(label);
    app.library.saveExcl();
    app.library.refreshActive();
    buildCurator();
    const nameEl = $('#setname'),
      base = app.library.loadedFrom || app.settings.wordList().slice(0, 3).join(', ');
    if (added) nameEl.value = [base, ...app.library.extras].join(' + ').slice(0, 60);
    const parts = [];
    if (added) parts.push(`added ${added} ${app.sets.plural(added)}`);
    if (restored) parts.push(`${restored} restored from put aside`);
    app.browser.toast(
      `From “${label}”: ${parts.join(', ')}. Save the result as a set to keep it.`,
      5000,
    );
  }
  const addMenu = $('#add-menu'),
    addBtn = $('#add-btn');
  function closeAddMenu() {
    addMenu.hidden = true;
    addBtn.setAttribute('aria-expanded', 'false');
  }
  function openAddMenu() {
    addMenu.replaceChildren();
    if (!app.sets.sets.length) {
      const p = document.createElement('p');
      p.textContent = 'You have no saved sets yet.';
      addMenu.appendChild(p);
    }
    for (const s of app.sets.sets) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = s.id;
      const n = document.createElement('b');
      n.textContent = s.name;
      const c = document.createElement('span');
      c.textContent = `${s.items.length} ${app.sets.plural(s.items.length)}`;
      b.append(n, c);
      addMenu.appendChild(b);
    }
    const f = document.createElement('button');
    f.type = 'button';
    f.className = 'fromfile';
    f.dataset.file = '1';
    f.textContent = 'From a JSON file…';
    addMenu.appendChild(f);
    addMenu.hidden = false;
    addBtn.setAttribute('aria-expanded', 'true');
    const first = addMenu.querySelector('button');
    if (first) first.focus();
  }
  function applyThumbSize() {
    curator.style.setProperty('--tile', (settings.thumb || 240) + 'px');
  }
  function init() {
    for (const grid of [inTiles, outTiles]) {
      grid.addEventListener('click', (e) => {
        const t = e.target.closest('.tile');
        if (t) {
          moveTiles([t], grid === inTiles);
          t.focus({ preventScroll: true });
        }
      });
      grid.addEventListener('dragstart', (e) => {
        const t = e.target.closest('.tile');
        if (!t) return;
        dragId = t.dataset.id;
        t.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', dragId);
        } catch (_) {}
      });
      grid.addEventListener('dragend', (e) => {
        const t = e.target.closest('.tile');
        if (t) t.classList.remove('dragging');
        dragId = '';
        $$('.bucket').forEach((b) => b.classList.remove('over'));
      });
    }
    for (const bucket of $$('.bucket')) {
      bucket.addEventListener('dragover', (e) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        bucket.classList.add('over');
      });
      bucket.addEventListener('dragleave', (e) => {
        if (!bucket.contains(e.relatedTarget)) bucket.classList.remove('over');
      });
      bucket.addEventListener('drop', (e) => {
        e.preventDefault();
        bucket.classList.remove('over');
        const t = dragId && curator.querySelector(`.tile[data-id="${CSS.escape(dragId)}"]`);
        const toOut = bucket.dataset.side === 'out';
        if (t && (t.parentElement === outTiles) !== toOut) moveTiles([t], toOut);
      });
    }
    $('#cur-chips').addEventListener('click', (e) => {
      const c = e.target.closest('.fchip');
      if (c) {
        curFilter = c.dataset.word;
        applyFilter();
      }
    });
    $('#in-all').addEventListener('click', () =>
      moveTiles($$('.tile:not([hidden])', inTiles), true),
    );
    $('#out-all').addEventListener('click', () =>
      moveTiles($$('.tile:not([hidden])', outTiles), false),
    );
    $('#b-curate').addEventListener('click', openCurator);
    $('#cur-done').addEventListener('click', closeCurator);
    $('#saveset').addEventListener('submit', (e) => {
      e.preventDefault();
      app.sets.saveAsSet($('#setname').value);
    });
    addBtn.addEventListener('click', () => {
      if (addMenu.hidden) openAddMenu();
      else closeAddMenu();
    });
    addMenu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      closeAddMenu();
      if (b.dataset.file) {
        $('#add-file').click();
        return;
      }
      const s = app.sets.findSet(b.dataset.id);
      if (s) mergeItems(s.items, s.name);
    });
    document.addEventListener('click', (e) => {
      if (!addMenu.hidden && !$('#add-wrap').contains(e.target)) closeAddMenu();
    });
    $('#add-file').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      const all = [],
        names = [];
      for (const f of files) {
        try {
          for (const s of app.sets.setsFromJson(JSON.parse(await f.text()))) {
            all.push(...s.items);
            names.push(s.name);
          }
        } catch (err) {}
      }
      if (!all.length) {
        app.browser.toast("This file doesn't look like a GIFbit set.");
        return;
      }
      const n = names.length;
      mergeItems(all, n === 1 ? names[0] : `${n} sets from file`);
    });
    $('#shuffle').addEventListener('click', () => {
      for (let i = app.library.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [app.library.items[i], app.library.items[j]] = [app.library.items[j], app.library.items[i]];
      }
      app.playback.seq = 0;
      app.playback.resetPool();
      app.library.refreshActive();
      buildCurator();
      inTiles.parentElement.scrollTop = 0;
      app.browser.toast(
        settings.order === 'seq'
          ? 'Shuffled. Animations will play in this order.'
          : 'Shuffled. The order is saved with the set. To play animations in this order, choose “In order” in Settings.',
        5000,
      );
    });
    $('#cur-size').value = settings.thumb || 240;
    applyThumbSize();
    $('#cur-size').addEventListener('input', (e) => {
      settings.thumb = +e.target.value;
      applyThumbSize();
      saveSettings();
    });
  }
  return { init, curator, closeCurator, addMenu, addBtn, closeAddMenu };
}
