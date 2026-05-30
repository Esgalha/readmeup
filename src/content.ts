import { createBitbucketAdapter } from './adapters/bitbucket.js';
import { createGitHubAdapter } from './adapters/github.js';
import { createGitLabAdapter } from './adapters/gitlab.js';
import { registerAdapter, getAdapter } from './adapters/registry.js';
import { setupCollapse } from './collapse.js';

registerAdapter('github.com', createGitHubAdapter);
registerAdapter('gitlab.com', createGitLabAdapter);
registerAdapter('bitbucket.org', createBitbucketAdapter);

function tryInject(): (() => void) | null {
  const adapter = getAdapter(location.hostname);
  if (!adapter || !adapter.isRepoPage()) return null;
  const reorganizeCleanup = adapter.reorganize();
  if (!reorganizeCleanup) return null;
  const targets = adapter.getCollapseTargets();
  if (!targets) return reorganizeCleanup;
  const collapseCleanup = setupCollapse(targets.anchor, targets.collapseTarget);
  return () => {
    collapseCleanup();
    reorganizeCleanup();
  };
}

let currentCleanup: (() => void) | null = null;
let retryObserver: MutationObserver | null = null;
let guardObserver: MutationObserver | null = null;

function cancelRetry(): void {
  if (retryObserver) {
    retryObserver.disconnect();
    retryObserver = null;
  }
}

function cancelGuard(): void {
  if (guardObserver) {
    guardObserver.disconnect();
    guardObserver = null;
  }
}

// Only arm on repo pages; arming on PR/issue pages causes false negatives mid-navigation.
function setupRetry(): void {
  const a = getAdapter(location.hostname);
  if (!a || !a.isRepoPage()) return;
  const obs = new MutationObserver(() => {
    const result = tryInject();
    if (result) {
      currentCleanup = result;
      cancelRetry();
    }
  });
  retryObserver = obs;
  obs.observe(document.body, { childList: true, subtree: true });
  // Only cancel this specific observer, not a later one created by a subsequent setupRetry() call.
  setTimeout(() => {
    if (retryObserver === obs) cancelRetry();
  }, 5000);
}

// After a successful reorganize(), GitHub's JS sometimes re-renders and moves the README back.
// This guard detects that and re-applies once.
function setupGuard(): void {
  cancelGuard();
  const a = getAdapter(location.hostname);
  if (!a || !a.isRepoPage()) return;
  const obs = new MutationObserver(() => {
    const targets = a.getCollapseTargets();
    const table = document.querySelector('table');
    if (!targets || !table) return;
    // compareDocumentPosition flag 2 = table precedes readme in DOM (wrong order)
    if (!(targets.collapseTarget.compareDocumentPosition(table) & 2)) return;
    // GitHub moved README back — discard stale cleanup and re-apply once.
    if (guardObserver === obs) cancelGuard();
    currentCleanup = null;
    currentCleanup = tryInject();
  });
  guardObserver = obs;
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    if (guardObserver === obs) cancelGuard();
  }, 3000);
}

function run(): void {
  cancelRetry();
  cancelGuard();
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  currentCleanup = tryInject();

  if (!currentCleanup) {
    setupRetry();
  } else {
    setupGuard();
  }
}

const hostname = location.hostname;
const adapter = getAdapter(hostname);
if (adapter) {
  run();
  adapter.onNavigate(run);
}

// Restore DOM before Turbo snapshots it; stale cache breaks reorganize() on the next visit.
document.addEventListener('turbo:before-cache', () => {
  cancelRetry();
  cancelGuard();
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
});

// repo-content-turbo-frame replaces its children after turbo:load, leaving stale detached
// references in currentCleanup that would throw on insertBefore.
document.addEventListener('turbo:frame-load', (e) => {
  if ((e.target as Element).id !== 'repo-content-turbo-frame') return;
  cancelRetry();
  cancelGuard();
  currentCleanup = tryInject();
  if (!currentCleanup) {
    setupRetry();
  } else {
    setupGuard();
  }
});
