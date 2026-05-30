import browser from 'webextension-polyfill';

const versionEl = document.getElementById('version');
if (versionEl) {
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = `v${manifest.version}`;
}

(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  let state: { repoKey: string | null; enabled: boolean } | undefined;
  try {
    state = await browser.tabs.sendMessage(tab.id, { type: 'getState' });
  } catch {
    // Content script not running on this page.
    return;
  }

  if (!state?.repoKey) return;

  const controls = document.getElementById('repo-controls');
  const repoLabel = document.getElementById('repo-label');
  const toggleBtn = document.getElementById('toggle-btn');
  if (!controls || !repoLabel || !toggleBtn) return;

  repoLabel.textContent = state.repoKey;
  let enabled = state.enabled;
  const updateBtn = () => {
    toggleBtn.textContent = enabled ? 'Disable for this repo' : 'Enable for this repo';
  };
  updateBtn();
  controls.style.display = '';

  toggleBtn.addEventListener('click', () => {
    enabled = !enabled;
    updateBtn();
    browser.tabs.sendMessage(tab.id!, { type: 'toggle' });
  });
})();
