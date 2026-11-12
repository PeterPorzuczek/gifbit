import { $ } from '../core/dom.js';
import { settings } from '../core/state.js';
export function createLibrary(app) {
  let items = [],
    sig = '',
    loadedFrom = '';
  const sigNow = () =>
    settings.source === 'set'
      ? ['set', settings.setId, (app.sets.findSet(settings.setId) || {}).updated || ''].join('#')
      : [
          settings.key,
          settings.type,
          settings.safe,
          app.settings.wordList().join('|').toLowerCase(),
        ].join('#');
  function sourceProblem() {
    if (settings.source === 'set')
      return app.sets.findSet(settings.setId) ? '' : 'Pick a set from the list or import a file.';
    if (!settings.key) return 'Paste your Giphy API key. Instructions are under the field.';
    if (!app.settings.wordList().length) return 'Enter at least one keyword.';
    return '';
  }
  function norm(g, sticker) {
    const im = g.images || {},
      o = im.original || {};
    const pick = (...xs) => xs.find((x) => x && x.url);
    const big = sticker
      ? o.webp || o.url
      : (pick(im.downsized_medium, im.downsized_large, o) || {}).url;
    const small = sticker ? o.webp || o.url : (pick(im.downsized, im.fixed_height, o) || {}).url;
    if (!big) return null;

    const landscape = (+o.width || 1) >= (+o.height || 1);
    const th =
      (landscape ? pick(im.fixed_height, im.fixed_width) : pick(im.fixed_width, im.fixed_height)) ||
      pick(im.downsized, im.preview_gif) ||
      {};
    return {
      id: g.id,
      sticker,
      big,
      small: small || big,
      thumb: th.webp || th.url || big,
      w: +o.width || 1,
      h: +o.height || 1,
      word: '',
    };
  }
  async function fetchOne(q, kind) {
    const url = `https://api.giphy.com/v1/${kind}/search?api_key=${encodeURIComponent(settings.key)}&q=${encodeURIComponent(q)}&limit=50&rating=${settings.safe ? 'pg-13' : 'r'}`;
    let r;
    try {
      r = await fetch(url);
    } catch (e) {
      throw { kind: 'net' };
    }
    if (!r.ok) throw { kind: 'http', status: r.status };
    const j = await r.json();
    return (j.data || []).map((g) => norm(g, kind === 'stickers')).filter(Boolean);
  }
  async function loadItems() {
    const next = sigNow();
    if (next === sig && items.length) return { empty: [] };
    if (settings.source === 'set') {
      const set = app.sets.findSet(settings.setId);
      if (!set) throw { kind: 'noset' };
      items = set.items.map((x) => Object.assign({}, x));
      loadedFrom = set.name;
      extras = [];
      app.playback.seq = 0;
      sig = next;
      app.playback.resetPool();
      refreshActive();
      return { empty: [] };
    }
    const ws = app.settings.wordList();
    const kinds = settings.type === 'both' ? ['gifs', 'stickers'] : [settings.type];
    const jobs = [];
    for (const w of ws)
      for (const k of kinds) jobs.push(fetchOne(w, k).then((list) => ({ w, list })));
    const res = await Promise.allSettled(jobs);
    const ok = res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (!ok.length) throw res[0].reason;
    const perWord = new Map(),
      seen = new Set(),
      all = [];
    for (const { w, list } of ok) {
      perWord.set(w, (perWord.get(w) || 0) + list.length);
      for (const it of list)
        if (!seen.has(it.id)) {
          seen.add(it.id);
          it.word = w;
          all.push(it);
        }
    }
    if (!all.length) throw { kind: 'empty' };
    items = all;
    loadedFrom = '';
    extras = [];
    app.playback.seq = 0;
    sig = next;
    app.playback.resetPool();
    refreshActive();
    return { empty: ws.filter((w) => !perWord.get(w)) };
  }
  function errText(e) {
    if (e && e.kind === 'http') {
      if (e.status === 401 || e.status === 403)
        return 'Giphy rejected the API key. Check that you copied all of it.';
      if (e.status === 429)
        return 'Giphy has reached the request limit for this key. Wait a while or use fewer keywords.';
      return `Giphy returned error ${e.status}. Try again in a moment.`;
    }
    if (e && e.kind === 'net') return 'Could not connect to Giphy. Check your internet connection.';
    if (e && e.kind === 'empty') return 'No keyword returned any animations. Try other words.';
    if (e && e.kind === 'noset') return 'Pick a set from the list or import a file.';
    return 'Something went wrong while loading animations. Try again.';
  }
  const EXCL = 'gifbit.excluded';
  let excluded = new Set(),
    active = [];
  function saveExcl() {
    try {
      localStorage.setItem(EXCL, JSON.stringify([...excluded].slice(-5000)));
    } catch (e) {}
  }
  function refreshActive() {
    active = items.filter((it) => !excluded.has(it.id));
    app.playback.bag = [];
    app.playback.ready = app.playback.ready.filter((r) => !excluded.has(r.it.id));
    app.playback.fill();
    updateStatus();
  }
  let extras = [];
  function updateStatus() {
    const out = items.length - active.length;
    const plus = extras.length ? ' + ' + extras.map((x) => `“${x}”`).join(' + ') : '';
    const head =
      (loadedFrom ? `Set “${loadedFrom}”` : 'Giphy keywords') +
      plus +
      `: ${items.length} ${app.sets.plural(items.length)}`;
    $('#status').textContent = items.length
      ? `${head}, on screen ${active.length}${out ? `, put aside ${out}` : ''}.`
      : '';
  }
  function init() {
    try {
      excluded = new Set(JSON.parse(localStorage.getItem(EXCL) || '[]'));
    } catch (e) {}
  }
  return {
    init,
    get items() {
      return items;
    },
    get sig() {
      return sig;
    },
    get loadedFrom() {
      return loadedFrom;
    },
    sigNow,
    sourceProblem,
    loadItems,
    errText,
    get excluded() {
      return excluded;
    },
    get active() {
      return active;
    },
    saveExcl,
    refreshActive,
    get extras() {
      return extras;
    },
  };
}
