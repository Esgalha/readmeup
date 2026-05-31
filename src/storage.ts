import browser from 'webextension-polyfill';

const STORAGE_KEY = 'disabledRepos';
const COLLAPSED_KEY = 'collapsedRepos';

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

export async function getCollapsedRepos(): Promise<Set<string>> {
  const result = await browser.storage.local.get(COLLAPSED_KEY);
  const stored = result[COLLAPSED_KEY];
  return new Set(Array.isArray(stored) ? stored : []);
}

export async function setRepoCollapsed(repoKey: string, collapsed: boolean): Promise<void> {
  const repos = await getCollapsedRepos();
  if (collapsed) repos.add(repoKey);
  else repos.delete(repoKey);
  await browser.storage.local.set({ [COLLAPSED_KEY]: [...repos] });
}
