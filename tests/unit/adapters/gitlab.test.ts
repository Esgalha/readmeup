// @vitest-environment jsdom
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitLabAdapter } from '../../../src/adapters/gitlab.js';

const fixturesDir = resolve(__dirname, 'fixtures');

function loadFixture(name: string): void {
  document.documentElement.innerHTML = readFileSync(resolve(fixturesDir, name), 'utf-8');
}

function setLocation(path: string): void {
  Object.defineProperty(window, 'location', {
    value: { pathname: path, hostname: 'gitlab.com' },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  document.documentElement.innerHTML = '';
});

describe('isRepoPage', () => {
  it('returns true for namespace/repo', () => {
    setLocation('/gitlab-org/gitlab');
    expect(createGitLabAdapter().isRepoPage()).toBe(true);
  });

  it('returns true for /-/tree/branch', () => {
    setLocation('/gitlab-org/gitlab/-/tree/master');
    expect(createGitLabAdapter().isRepoPage()).toBe(true);
  });

  it('returns false for a file path', () => {
    setLocation('/gitlab-org/gitlab/-/blob/master/README.md');
    expect(createGitLabAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for issues path', () => {
    setLocation('/gitlab-org/gitlab/-/issues');
    expect(createGitLabAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for homepage', () => {
    setLocation('/');
    expect(createGitLabAdapter().isRepoPage()).toBe(false);
  });
});

describe('reorganize', () => {
  it('moves .readme-holder before #tree-holder', () => {
    loadFixture('gitlab-repo.html');
    const parent = document.querySelector('.project-home-panel')!;
    const treeHolder = document.getElementById('tree-holder')!;
    const readmeHolder = document.querySelector('.readme-holder')!;

    expect(parent.children[0]).toBe(treeHolder);
    expect(parent.children[1]).toBe(readmeHolder);

    createGitLabAdapter().reorganize();

    expect(parent.children[0]).toBe(readmeHolder);
    expect(parent.children[1]).toBe(treeHolder);
  });

  it('cleanup restores original order', () => {
    loadFixture('gitlab-repo.html');
    const parent = document.querySelector('.project-home-panel')!;
    const treeHolder = document.getElementById('tree-holder')!;
    const readmeHolder = document.querySelector('.readme-holder')!;

    const cleanup = createGitLabAdapter().reorganize();
    cleanup!();

    expect(parent.children[0]).toBe(treeHolder);
    expect(parent.children[1]).toBe(readmeHolder);
  });

  it('lifts readme-holder to outer level when branch bar precedes the file-browser container', () => {
    document.documentElement.innerHTML = `
      <div id="outer">
        <div class="branch-bar">master | Find file | Code</div>
        <div class="project-home-panel">
          <div id="tree-holder"><table class="tree-table"><tbody><tr><td>.gitignore</td></tr></tbody></table></div>
          <article class="readme-holder"><h1>GitLab</h1></article>
        </div>
      </div>`;
    const outer = document.getElementById('outer')!;
    const branchBar = outer.children[0] as HTMLElement;
    const panel = outer.children[1] as HTMLElement;
    const readme = document.querySelector('.readme-holder') as HTMLElement;

    createGitLabAdapter().reorganize();

    // README lifted to outer level, before branch bar
    expect(outer.children[0]).toBe(readme);
    expect(outer.children[1]).toBe(branchBar);
    // Panel now contains only the tree holder
    expect(panel.children.length).toBe(1);
  });

  it('cleanup restores readme-holder inside the panel when branch bar was at outer level', () => {
    document.documentElement.innerHTML = `
      <div id="outer">
        <div class="branch-bar">master | Find file | Code</div>
        <div class="project-home-panel">
          <div id="tree-holder"><table class="tree-table"><tbody><tr><td>.gitignore</td></tr></tbody></table></div>
          <article class="readme-holder"><h1>GitLab</h1></article>
        </div>
      </div>`;
    const outer = document.getElementById('outer')!;
    const branchBar = outer.children[0] as HTMLElement;
    const panel = outer.children[1] as HTMLElement;
    const treeHolder = document.getElementById('tree-holder')!;
    const readme = document.querySelector('.readme-holder') as HTMLElement;

    const cleanup = createGitLabAdapter().reorganize()!;
    cleanup();

    expect(outer.children[0]).toBe(branchBar);
    expect(panel.children[0]).toBe(treeHolder);
    expect(panel.children[1]).toBe(readme);
  });

  it('returns null when #tree-holder or .readme-holder is absent', () => {
    document.documentElement.innerHTML = '<div><div id="tree-holder"><table></table></div></div>';
    expect(createGitLabAdapter().reorganize()).toBeNull();
  });

  it('returns null when .readme-holder has no content', () => {
    document.documentElement.innerHTML = `
      <div class="project-home-panel">
        <div id="tree-holder"><table></table></div>
        <article class="file-holder readme-holder"></article>
      </div>`;
    expect(createGitLabAdapter().reorganize()).toBeNull();
  });
});

describe('getCollapseTargets', () => {
  it('returns title bar as anchor and blob viewer as collapseTarget', () => {
    document.documentElement.innerHTML = `
      <article class="readme-holder">
        <div id="title" class="js-file-title">README.md</div>
        <div id="blob" class="blob-viewer"><div class="file-content"><h1>GitLab</h1></div></div>
      </article>`;
    const result = createGitLabAdapter().getCollapseTargets();
    expect(result?.anchor).toBe(document.getElementById('title'));
    expect(result?.collapseTarget).toBe(document.getElementById('blob'));
  });

  it('uses the inner container as anchor when title bar first child has element children', () => {
    document.documentElement.innerHTML = `
      <article class="readme-holder">
        <div class="js-file-title">
          <div class="file-header-content"><a>README.md</a></div>
        </div>
        <div class="blob-viewer"><h1>Content</h1></div>
      </article>`;
    const result = createGitLabAdapter().getCollapseTargets();
    expect(result?.anchor).toBe(document.querySelector('.file-header-content'));
  });

  it('returns null when .readme-holder has only one child', () => {
    document.documentElement.innerHTML = `
      <article class="readme-holder">
        <div class="only-child"><h1>Content</h1></div>
      </article>`;
    expect(createGitLabAdapter().getCollapseTargets()).toBeNull();
  });

  it('returns null when .readme-holder does not exist', () => {
    document.documentElement.innerHTML = '<div><p>no readme</p></div>';
    expect(createGitLabAdapter().getCollapseTargets()).toBeNull();
  });
});

describe('onNavigate', () => {
  it('fires callback on popstate', () => {
    const cb = vi.fn();
    const cleanup = createGitLabAdapter().onNavigate(cb);
    window.dispatchEvent(new Event('popstate'));
    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('fires callback when document title changes', async () => {
    const cb = vi.fn();
    const cleanup = createGitLabAdapter().onNavigate(cb);
    document.title = 'New Page Title · GitLab';
    // Allow MutationObserver microtask to fire
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('stops firing after cleanup', () => {
    const cb = vi.fn();
    const cleanup = createGitLabAdapter().onNavigate(cb);
    cleanup();
    window.dispatchEvent(new Event('popstate'));
    expect(cb).not.toHaveBeenCalled();
  });
});
