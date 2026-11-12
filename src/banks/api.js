import { bankFromJson } from './format.js';

const api = 'https://api.github.com/repos/PeterPorzuczek/gifbit';
const shaPattern = /^[a-f0-9]{40,64}$/;

async function request(path, raw, fetcher) {
  let response;
  try {
    response = await fetcher(`${api}${path}`, {
      headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Could not reach GitHub. Check your connection and try again.');
  }
  if (response.status === 403 || response.status === 429) {
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    const retry =
      reset > 0
        ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.`
        : ' Try again later.';
    throw new Error(`GitHub is limiting requests or access.${retry}`);
  }
  if (response.status === 404 || response.status === 409)
    throw new Error(
      raw
        ? 'This bank is no longer available. Refresh the bank list.'
        : 'No published banks are available in this repository yet.',
    );
  if (!response.ok)
    throw new Error(`GitHub could not load the banks (${response.status}). Try again.`);
  try {
    return await response.json();
  } catch {
    throw new Error(
      raw ? 'This bank is not a valid JSON file.' : 'GitHub returned an invalid bank list.',
    );
  }
}

export async function listBanks(fetcher = fetch) {
  const result = await request('/git/trees/main?recursive=1', false, fetcher);
  if (!Array.isArray(result.tree) || result.truncated)
    throw new Error('GitHub returned an incomplete bank list. Please try again later.');
  return result.tree
    .filter(
      (file) =>
        file.type === 'blob' &&
        ['100644', '100755'].includes(file.mode) &&
        typeof file.path === 'string' &&
        file.path.startsWith('gif-banks/') &&
        /\.json$/i.test(file.path) &&
        !file.path.includes('\\') &&
        file.path.split('/').every((part) => part && !part.startsWith('.')) &&
        shaPattern.test(file.sha),
    )
    .map(({ path, sha }) => ({ path, sha }))
    .sort((a, b) => b.path.localeCompare(a.path));
}

export async function readBank(file, fetcher = fetch) {
  if (!shaPattern.test(file.sha)) throw new Error('Invalid bank reference. Refresh the list.');
  return bankFromJson(await request(`/git/blobs/${file.sha}`, true, fetcher), file.path);
}
