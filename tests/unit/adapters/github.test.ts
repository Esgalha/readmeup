// @vitest-environment jsdom
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitHubAdapter } from '../../../src/adapters/github.js';

const fixturesDir = resolve(__dirname, 'fixtures');

function loadFixture(name: string): void {
  document.documentElement.innerHTML = readFileSync(resolve(fixturesDir, name), 'utf-8');
}

function setLocation(path: string): void {
  Object.defineProperty(window, 'location', {
    value: { pathname: path, hostname: 'github.com' },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  document.documentElement.innerHTML = '';
});

describe('isRepoPage', () => {
  it('returns true for a two-segment path', () => {
    setLocation('/torvalds/linux');
    expect(createGitHubAdapter().isRepoPage()).toBe(true);
  });

  it('returns true for /owner/repo/ with trailing slash', () => {
    setLocation('/torvalds/linux/');
    expect(createGitHubAdapter().isRepoPage()).toBe(true);
  });

  it('returns true for /owner/repo/tree/branch', () => {
    setLocation('/torvalds/linux/tree/master');
    expect(createGitHubAdapter().isRepoPage()).toBe(true);
  });

  it('returns false for a file path', () => {
    setLocation('/torvalds/linux/blob/master/Makefile');
    expect(createGitHubAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for an issues path', () => {
    setLocation('/torvalds/linux/issues');
    expect(createGitHubAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for the homepage', () => {
    setLocation('/');
    expect(createGitHubAdapter().isRepoPage()).toBe(false);
  });
});

describe('reorganize', () => {
  it('moves OverviewHeader before OverviewRepoFiles', () => {
    loadFixture('github-repo.html');
    const parent = document.querySelector('#repo-content-turbo-frame')!;
    const header = document.querySelector('[class*="OverviewHeader-module__Box"]')!;
    const files = document.querySelector('[class*="OverviewRepoFiles-module__Box"]')!;

    // Sanity check: before reorganize, files comes first in the fixture
    expect(parent.children[0]).toBe(files);
    expect(parent.children[1]).toBe(header);

    createGitHubAdapter().reorganize();

    expect(parent.children[0]).toBe(header);
    expect(parent.children[1]).toBe(files);
  });

  it('cleanup restores the original order', () => {
    loadFixture('github-repo.html');
    const parent = document.querySelector('#repo-content-turbo-frame')!;
    const header = document.querySelector('[class*="OverviewHeader-module__Box"]')!;
    const files = document.querySelector('[class*="OverviewRepoFiles-module__Box"]')!;

    const cleanup = createGitHubAdapter().reorganize();
    cleanup!();

    expect(parent.children[0]).toBe(files);
    expect(parent.children[1]).toBe(header);
  });

  it('moves readme before all preceding siblings, including non-table ones like a branch toolbar', () => {
    document.documentElement.innerHTML = `
      <div id="repo-content-turbo-frame">
        <div class="branch-toolbar">Branch dropdown</div>
        <div class="OverviewRepoFiles"><table><tbody><tr><td>file.txt</td></tr></tbody></table></div>
        <div class="OverviewHeader"><div class="markdown-body"><h1>Readme</h1></div></div>
      </div>`;
    const frame = document.getElementById('repo-content-turbo-frame')!;
    const toolbar = frame.children[0] as HTMLElement;
    const files = frame.children[1] as HTMLElement;
    const header = frame.children[2] as HTMLElement;

    createGitHubAdapter().reorganize();

    expect(frame.children[0]).toBe(header);
    expect(frame.children[1]).toBe(toolbar);
    expect(frame.children[2]).toBe(files);
  });

  it('moves a plain-text pre README above the file browser', () => {
    document.documentElement.innerHTML = `
      <div id="repo-content-turbo-frame">
        <div class="OverviewRepoFiles"><table><tbody><tr><td>Makefile</td></tr></tbody></table></div>
        <div class="OverviewHeader"><pre>Linux kernel source</pre></div>
      </div>`;
    const frame = document.getElementById('repo-content-turbo-frame')!;
    const files = frame.children[0] as HTMLElement;
    const header = frame.children[1] as HTMLElement;

    createGitHubAdapter().reorganize();

    expect(frame.children[0]).toBe(header);
    expect(frame.children[1]).toBe(files);
  });

  it('lifts README to outer level when branch bar precedes the file-browser container', () => {
    // Real-world structure: branch picker lives one level above the turbo frame.
    document.documentElement.innerHTML = `
      <div id="outer">
        <div class="branch-bar">master | Go to file | Code</div>
        <div id="repo-content-turbo-frame">
          <div class="OverviewRepoFiles"><table><tbody><tr><td>Makefile</td></tr></tbody></table></div>
          <div class="OverviewHeader"><div class="markdown-body"><h1>Linux kernel</h1></div></div>
        </div>
      </div>`;
    const outer = document.getElementById('outer')!;
    const branchBar = outer.children[0] as HTMLElement;
    const frame = document.getElementById('repo-content-turbo-frame')!;
    const header = frame.querySelector('.OverviewHeader') as HTMLElement;

    createGitHubAdapter().reorganize();

    // README lifted to outer level, before branch bar
    expect(outer.children[0]).toBe(header);
    expect(outer.children[1]).toBe(branchBar);
    // Frame contains only the file browser
    expect(frame.children.length).toBe(1);
  });

  it('cleanup restores README inside the frame when branch bar was at outer level', () => {
    document.documentElement.innerHTML = `
      <div id="outer">
        <div class="branch-bar">master | Go to file | Code</div>
        <div id="repo-content-turbo-frame">
          <div class="OverviewRepoFiles"><table><tbody><tr><td>Makefile</td></tr></tbody></table></div>
          <div class="OverviewHeader"><div class="markdown-body"><h1>Linux kernel</h1></div></div>
        </div>
      </div>`;
    const outer = document.getElementById('outer')!;
    const branchBar = outer.children[0] as HTMLElement;
    const frame = document.getElementById('repo-content-turbo-frame')!;
    const files = frame.children[0] as HTMLElement;
    const header = frame.children[1] as HTMLElement;

    const cleanup = createGitHubAdapter().reorganize()!;
    cleanup();

    // Branch bar back at first position in outer
    expect(outer.children[0]).toBe(branchBar);
    // Frame restored: files first, README last
    expect(frame.children[0]).toBe(files);
    expect(frame.children[1]).toBe(header);
  });

  it('returns null when the OverviewHeader or OverviewRepoFiles box is absent', () => {
    document.documentElement.innerHTML = `
      <div id="repo-content-turbo-frame">
        <table><tbody><tr><td>file.txt</td></tr></tbody></table>
      </div>`;
    expect(createGitHubAdapter().reorganize()).toBeNull();
  });

  it('returns null when the OverviewHeader section has no content yet', () => {
    document.documentElement.innerHTML = `
      <div id="repo-content-turbo-frame">
        <div class="OverviewRepoFiles-module__Box__a"><table></table></div>
        <div class="OverviewHeader-module__Box__b"></div>
      </div>`;
    expect(createGitHubAdapter().reorganize()).toBeNull();
  });
});

describe('onNavigate', () => {
  it('fires callback on turbo:load', () => {
    const cb = vi.fn();
    const cleanup = createGitHubAdapter().onNavigate(cb);
    document.dispatchEvent(new Event('turbo:load'));
    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('fires callback on popstate', () => {
    const cb = vi.fn();
    const cleanup = createGitHubAdapter().onNavigate(cb);
    window.dispatchEvent(new Event('popstate'));
    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('stops firing after cleanup', () => {
    const cb = vi.fn();
    const cleanup = createGitHubAdapter().onNavigate(cb);
    cleanup();
    document.dispatchEvent(new Event('turbo:load'));
    window.dispatchEvent(new Event('popstate'));
    expect(cb).not.toHaveBeenCalled();
  });
});
