import browser from 'webextension-polyfill';

const STORAGE_KEY = 'disabledRepos';

export async function getDisabledRepos(): Promise<Set<string>> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  return new Set(Array.isArray(stored) ? stored : []);
}

export async function setRepoEnabled(repoKey: string, enabled: boolean): Promise<void> {
  const repos = await getDisabledRepos();
  if (enabled) repos.delete(repoKey);
  else repos.add(repoKey);
  await browser.storage.local.set({ [STORAGE_KEY]: [...repos] });
}
