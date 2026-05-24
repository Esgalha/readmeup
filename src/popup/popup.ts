import browser from 'webextension-polyfill';

const versionEl = document.getElementById('version');
if (versionEl) {
  const manifest = browser.runtime.getManifest();
  versionEl.textContent = `v${manifest.version}`;
}
