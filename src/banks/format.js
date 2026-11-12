import { setsFromJson, filenameName } from '../library/format.js';

export function bankFromJson(value, path) {
  if (value?.gifbit !== undefined && value.gifbit !== 1)
    throw new Error('This bank uses an unsupported GIFbit format.');
  const sets = setsFromJson(value, filenameName(path));
  const seen = new Set();
  const items = sets
    .flatMap((set) => set.items)
    .filter((item) => !seen.has(item.id) && seen.add(item.id));
  if (!items.length) throw new Error('This bank does not contain any valid animations.');
  return {
    name:
      typeof value?.name === 'string' && value.name.trim()
        ? value.name.trim().slice(0, 60)
        : filenameName(path),
    description:
      typeof value?.description === 'string' ? value.description.trim().slice(0, 1000) : '',
    created: typeof value?.created === 'string' ? value.created : '',
    updated: typeof value?.updated === 'string' ? value.updated : '',
    words: [...new Set(sets.flatMap((set) => set.words))],
    items,
  };
}
