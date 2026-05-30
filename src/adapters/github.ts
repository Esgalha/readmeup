import type { PlatformAdapter } from './types.js';

export function createGitHubAdapter(): PlatformAdapter {
  return {
    isRepoPage() {
      const path = location.pathname.replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      if (parts.length < 2) return false;
      if (parts.length === 2) return true;
      if (parts.length >= 3 && parts[2] === 'tree') return true;
      return false;
    },

    reorganize() {
      const frame = document.getElementById('repo-content-turbo-frame');
      let readmeBody: HTMLElement | null = document.querySelector('.markdown-body');
      if (!readmeBody && frame) {
        const pre = frame.querySelector('pre');
        if (pre && !pre.closest('.blob-wrapper')) readmeBody = pre as HTMLElement;
      }
      if (!readmeBody || !readmeBody.textContent?.trim()) return null;

      let readmeSection: HTMLElement = readmeBody;
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

    getCollapseTargets() {
      const markdownBody = document.querySelector<HTMLElement>('.markdown-body');
      if (markdownBody) {
        const collapseTarget = markdownBody.parentElement;
        if (!collapseTarget) return null;
        const anchor = collapseTarget.previousElementSibling as HTMLElement | null;
        if (!anchor) return null;
        return { anchor, collapseTarget };
      }
      const hpcContent = document.querySelector<HTMLElement>('[data-hpc]');
      if (hpcContent) {
        const anchor = hpcContent.previousElementSibling as HTMLElement | null;
        if (!anchor) return null;
        return { anchor, collapseTarget: hpcContent };
      }
      return null;
    },

    onNavigate(callback) {
      document.addEventListener('turbo:load', callback);
      window.addEventListener('popstate', callback);
      return () => {
        document.removeEventListener('turbo:load', callback);
        window.removeEventListener('popstate', callback);
      };
    },
  };
}
