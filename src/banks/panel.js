import { $ } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
import { exportObj, filenameName } from '../library/format.js';
import { listBanks, readBank } from './api.js';

export function createBanks(app) {
  const dialog = $('#banks');
  const cache = new Map();
  let entries = null,
    current = null,
    selected = new Set(),
    requestId = 0,
    loading = false;
  const readStored = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const storedFavorites = readStored('gifbit.banks.favorites', []);
  const favorites = new Set(
    Array.isArray(storedFavorites)
      ? storedFavorites.filter((path) => typeof path === 'string' && path.startsWith('gif-banks/'))
      : [],
  );
  const storedMetadata = readStored('gifbit.banks.metadata', {});
  const metadata =
    storedMetadata && typeof storedMetadata === 'object' && !Array.isArray(storedMetadata)
      ? storedMetadata
      : {};

  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
  function info(file) {
    const saved = metadata[file.path];
    return saved?.sha === file.sha &&
      typeof saved.name === 'string' &&
      typeof saved.description === 'string'
      ? saved
      : { name: filenameName(file.path), description: '' };
  }
  function status(message, error = false) {
    $('#banks-status').textContent = message;
    $('#banks-status').classList.toggle('err', error);
  }
  function renderList() {
    const query = $('#banks-search').value.trim().toLowerCase();
    const onlyFavorites = $('#banks-favorites').checked;
    const visible = (entries || []).filter((file) => {
      const details = info(file);
      return (
        (!onlyFavorites || favorites.has(file.path)) &&
        `${details.name} ${details.description} ${file.path}`.toLowerCase().includes(query)
      );
    });
    $('#banks-list').replaceChildren(
      ...visible.map((file) => {
        const details = info(file);
        const row = document.createElement('div');
        row.className = 'bank-row';
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'bank-open';
        open.dataset.path = file.path;
        open.setAttribute('aria-pressed', String(current?.file.path === file.path));
        const name = document.createElement('b');
        name.textContent = details.name;
        const description = document.createElement('span');
        description.textContent = details.description;
        open.append(name, description);
        const favorite = document.createElement('button');
        favorite.type = 'button';
        favorite.className = 'bank-favorite';
        favorite.dataset.favorite = file.path;
        favorite.setAttribute('aria-label', `Favorite bank: ${details.name}`);
        favorite.setAttribute('aria-pressed', String(favorites.has(file.path)));
        favorite.textContent = favorites.has(file.path) ? '★' : '☆';
        row.append(open, favorite);
        return row;
      }),
    );
    $('#banks-empty').hidden = visible.length > 0 || entries === null;
    $('#banks-count').textContent =
      entries === null ? '' : `${visible.length} of ${entries.length} banks`;
  }
  function updateSelection() {
    $('#bank-import').textContent = `Import ${selected.size} animations`;
    $('#bank-import').disabled = selected.size === 0;
    $('#bank-selected').textContent =
      `${selected.size} of ${current?.bank.items.length || 0} selected`;
  }
  function renderDetails() {
    const { file, bank } = current;
    $('#bank-name').textContent = bank.name;
    $('#bank-description').textContent = bank.description;
    const date = new Date(bank.updated || bank.created);
    $('#bank-meta').textContent = [
      `${bank.items.length} animations`,
      filenameName(file.path),
      Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(),
    ]
      .filter(Boolean)
      .join(' · ');
    $('#bank-tiles').replaceChildren(
      ...bank.items.map((item) => {
        const tile = document.createElement('label');
        tile.className = 'bank-tile';
        const image = new Image();
        image.alt = item.word || 'GIF animation';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.src = item.thumb;
        const caption = document.createElement('span');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item.id;
        checkbox.checked = selected.has(item.id);
        checkbox.setAttribute('aria-label', `Select animation: ${item.word || item.id}`);
        caption.append(checkbox, item.word || item.id);
        tile.append(image, caption);
        return tile;
      }),
    );
    $('#bank-detail').hidden = false;
    $('#banks-placeholder').hidden = true;
    updateSelection();
  }
  async function openBank(file) {
    const id = ++requestId;
    current = null;
    $('#bank-detail').hidden = true;
    $('#banks-placeholder').hidden = false;
    status(`Loading ${info(file).name}…`);
    renderList();
    try {
      const key = `${file.path}:${file.sha}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          readBank(file).catch((error) => {
            cache.delete(key);
            throw error;
          }),
        );
      }
      const bank = await cache.get(key);
      metadata[file.path] = { sha: file.sha, name: bank.name, description: bank.description };
      store('gifbit.banks.metadata', metadata);
      if (id !== requestId || !dialog.open) return;
      current = { file, bank };
      selected = new Set(bank.items.map((item) => item.id));
      renderDetails();
      renderList();
      status('Choose animations to import into your saved sets.');
      $('#bank-name').focus();
    } catch (error) {
      if (id === requestId && dialog.open) status(error.message, true);
    }
  }
  async function refresh() {
    if (loading) return;
    requestId++;
    loading = true;
    $('#banks-refresh').disabled = true;
    status('Loading GIF banks…');
    try {
      entries = await listBanks();
      const paths = new Set(entries.map((file) => file.path));
      for (const path of Object.keys(metadata)) if (!paths.has(path)) delete metadata[path];
      store('gifbit.banks.metadata', metadata);
      if (
        current &&
        !entries.some((file) => file.path === current.file.path && file.sha === current.file.sha)
      ) {
        requestId++;
        current = null;
        $('#bank-detail').hidden = true;
        $('#banks-placeholder').hidden = false;
      }
      renderList();
      status(
        entries.length
          ? 'Open a bank to preview its animations.'
          : 'No GIF banks have been published yet.',
      );
    } catch (error) {
      status(error.message, true);
    } finally {
      loading = false;
      $('#banks-refresh').disabled = false;
    }
  }
  async function importSelected() {
    if (!current || !selected.size) return;
    const { bank, file } = current;
    const value = exportObj({ ...bank, items: bank.items.filter((item) => selected.has(item.id)) });
    $('#bank-import').disabled = true;
    try {
      const added = await app.sets.importFiles([
        { name: file.path, text: async () => JSON.stringify(value) },
      ]);
      if (!added?.length) {
        status('Could not save this bank. Free up browser storage and try again.', true);
        return;
      }
      settings.source = 'set';
      settings.setId = added[0].id;
      saveSettings();
      app.settings.populate();
      app.settings.refreshUI();
      dialog.close();
    } finally {
      updateSelection();
    }
  }
  function init() {
    $('#banks-open').addEventListener('click', () => {
      dialog.showModal();
      if (entries === null) refresh();
    });
    $('#banks-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      requestId++;
      $('#banks-open').focus();
    });
    $('#banks-refresh').addEventListener('click', refresh);
    $('#banks-search').addEventListener('input', renderList);
    $('#banks-favorites').addEventListener('change', renderList);
    $('#banks-list').addEventListener('click', (event) => {
      const favorite = event.target.closest('[data-favorite]');
      if (favorite) {
        const path = favorite.dataset.favorite;
        const had = favorites.has(path);
        if (had) favorites.delete(path);
        else favorites.add(path);
        if (!store('gifbit.banks.favorites', [...favorites])) {
          if (had) favorites.add(path);
          else favorites.delete(path);
          status('Could not save favorites. Your browser storage may be full.', true);
        }
        renderList();
        const replacement = [...$('#banks-list').querySelectorAll('[data-favorite]')].find(
          (button) => button.dataset.favorite === path,
        );
        (replacement || $('#banks-favorites')).focus();
        return;
      }
      const open = event.target.closest('[data-path]');
      const file = entries?.find((entry) => entry.path === open?.dataset.path);
      if (file) openBank(file);
    });
    $('#bank-tiles').addEventListener('change', (event) => {
      const input = event.target;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      updateSelection();
    });
    for (const [id, all] of [
      ['bank-select-all', true],
      ['bank-select-none', false],
    ]) {
      $(`#${id}`).addEventListener('click', () => {
        selected = new Set(all ? current.bank.items.map((item) => item.id) : []);
        for (const input of $('#bank-tiles').querySelectorAll('input')) input.checked = all;
        updateSelection();
      });
    }
    $('#bank-import').addEventListener('click', importSelected);
  }
  return {
    init,
    get favorites() {
      return [...favorites];
    },
  };
}
