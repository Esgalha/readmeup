import type { PlatformAdapter } from './types.js';

export function createGitLabAdapter(): PlatformAdapter {
  return {
    isRepoPage() {
      const path = location.pathname.replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      if (parts.length < 2) return false;
      if (parts.length === 2) return true;
      if (parts.length >= 4 && parts[2] === '-' && parts[3] === 'tree') return true;
      return false;
    },

    reorganize() {
      const readmeHolder = document.querySelector('.readme-holder') as HTMLElement | null;
      if (!readmeHolder || !readmeHolder.textContent?.trim()) return null;

      let readmeSection: HTMLElement = readmeHolder;
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

      const innerParent = readmeSection.parentElement!;
      const innerOriginalNextSibling = readmeSection.nextSibling;

      // Lift to outer level if the file-browser container has preceding siblings (e.g. branch bar).
      if (innerParent.parentElement && innerParent.parentElement !== document.documentElement) {
        const outerParent = innerParent.parentElement;
        if (outerParent.children[0] !== innerParent) {
          outerParent.insertBefore(readmeSection, outerParent.firstChild);
          return function cleanup() {
            if (innerOriginalNextSibling && innerParent.contains(innerOriginalNextSibling)) {
              innerParent.insertBefore(readmeSection, innerOriginalNextSibling);
            } else {
              innerParent.appendChild(readmeSection);
            }
          };
        }
      }

      innerParent.insertBefore(readmeSection, innerParent.firstChild);

      return function cleanup() {
        if (innerOriginalNextSibling && innerParent.contains(innerOriginalNextSibling)) {
          innerParent.insertBefore(readmeSection, innerOriginalNextSibling);
        } else {
          innerParent.appendChild(readmeSection);
        }
      };
    },

    onNavigate(callback) {
      window.addEventListener('popstate', callback);

      let lastTitle = document.title;
      const observer = new MutationObserver(() => {
        if (document.title !== lastTitle) {
          lastTitle = document.title;
          callback();
        }
      });
      observer.observe(document.querySelector('title') ?? document.head, {
        subtree: true,
        characterData: true,
        childList: true,
      });

      return () => {
        window.removeEventListener('popstate', callback);
        observer.disconnect();
      };
    },
  };
}
