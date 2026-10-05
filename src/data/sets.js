export function httpsUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
export const cleanUrl = (u) => httpsUrl(u).split('?')[0];
export function packItem(it) {
  return {
    id: it.id,
    sticker: !!it.sticker,
    big: cleanUrl(it.big),
    small: cleanUrl(it.small),
    thumb: cleanUrl(it.thumb),
    w: +it.w || 1,
    h: +it.h || 1,
    word: it.word || '',
  };
}
export function unpackItem(x) {
  if (!x || typeof x.id !== 'string' || !httpsUrl(x.big)) return null;
  const big = cleanUrl(x.big),
    small = cleanUrl(x.small) || big;
  return {
    id: x.id.slice(0, 80),
    sticker: !!x.sticker,
    big,
    small,
    thumb: cleanUrl(x.thumb) || small,
    w: Number.isFinite(+x.w) && +x.w > 0 ? +x.w : 1,
    h: Number.isFinite(+x.h) && +x.h > 0 ? +x.h : 1,
    word: typeof x.word === 'string' ? x.word.slice(0, 60) : '',
  };
}
export function exportObj(s) {
  return {
    gifbit: 1,
    name: s.name,
    created: s.created,
    updated: s.updated,
    words: s.words || [],
    items: s.items,
  };
}
export function slug(name) {
  return (
    name
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'set'
  );
}
export function setsFromJson(obj) {
  const list = Array.isArray(obj) ? obj : obj && Array.isArray(obj.sets) ? obj.sets : [obj];
  const out = [];
  for (const s of list) {
    if (!s || !Array.isArray(s.items)) continue;
    const seen = new Set();
    const its = s.items.map(unpackItem).filter((it) => it && !seen.has(it.id) && seen.add(it.id));
    if (!its.length) continue;
    out.push({
      name:
        String(s.name || 'Imported set')
          .trim()
          .slice(0, 60) || 'Imported set',
      words: Array.isArray(s.words)
        ? s.words.map(String).slice(0, 20)
        : [...new Set(its.map((i) => i.word).filter(Boolean))],
      items: its,
    });
  }
  return out;
}
