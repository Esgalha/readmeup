import type { PlatformAdapter } from './types.js';

export function createBitbucketAdapter(): PlatformAdapter {
  return {
    isRepoPage() {
      const path = location.pathname.replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      // Bitbucket: /workspace/repo  or  /workspace/repo/src/branch/
      if (parts.length < 2) return false;
      if (parts.length === 2) return true;
      if (parts.length === 4 && parts[2] === 'src') return true;
      return false;
    },

    reorganize() {
      const article = document.querySelector('article') as HTMLElement | null;
      if (!article || !article.textContent?.trim()) return null;

      let readmeSection: HTMLElement = article;
      let filesSection: HTMLElement | null = null;

      // Walk up until we find the level where a preceding sibling contains the file-browser table.
      while (
        readmeSection.parentElement &&
        readmeSection.parentElement !== document.documentElement
      ) {
        const parent = readmeSection.parentElement;
        const siblings = Array.from(parent.children) as HTMLElement[];
        const idx = siblings.indexOf(readmeSection);
        if (idx > 0) {
          const candidate = (siblings.slice(0, idx) as HTMLElement[])
            .reverse()
            .find((el) => !!el.querySelector('table'));
          if (candidate) {
            filesSection = candidate;
            break;
          }
        }
        readmeSection = parent;
      }

      if (!filesSection) return null;

      const parent = readmeSection.parentElement!;
      const originalNextSibling = readmeSection.nextSibling;

      parent.insertBefore(readmeSection, parent.firstChild);

      return function cleanup() {
        if (originalNextSibling && parent.contains(originalNextSibling)) {
          parent.insertBefore(readmeSection, originalNextSibling);
        } else {
          parent.appendChild(readmeSection);
        }
      };
    },

    onNavigate(callback) {
      window.addEventListener('popstate', callback);
      return () => {
        window.removeEventListener('popstate', callback);
      };
    },
  };
}
