// @vitest-environment jsdom
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitHubAdapter } from '../../src/adapters/github.js';
import { createGitLabAdapter } from '../../src/adapters/gitlab.js';
import { createBitbucketAdapter } from '../../src/adapters/bitbucket.js';

const fixturesDir = resolve(__dirname, '../unit/adapters/fixtures');

function loadFixture(name: string): void {
  document.documentElement.innerHTML = readFileSync(resolve(fixturesDir, name), 'utf-8');
}

function setLocation(path: string, hostname: string): void {
  Object.defineProperty(window, 'location', {
    value: { pathname: path, hostname },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  document.documentElement.innerHTML = '';
});

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

describe('GitHub reorganize lifecycle', () => {
  it('README appears before file browser after reorganize', () => {
    setLocation('/torvalds/linux', 'github.com');
    loadFixture('github-repo.html');
    const adapter = createGitHubAdapter();

    expect(adapter.isRepoPage()).toBe(true);

    const cleanup = adapter.reorganize();
    expect(cleanup).not.toBeNull();

    const frame = document.getElementById('repo-content-turbo-frame')!;
    const firstChild = frame.firstElementChild!;
    expect(firstChild.querySelector('.markdown-body')).not.toBeNull();
  });

  it('cleanup fully restores original DOM order', () => {
    setLocation('/torvalds/linux', 'github.com');
    loadFixture('github-repo.html');

    const frame = document.getElementById('repo-content-turbo-frame')!;
    const originalFirst = frame.children[0];
    const originalSecond = frame.children[1];

    const cleanup = createGitHubAdapter().reorganize()!;
    expect(frame.children[0]).not.toBe(originalFirst);

    cleanup();
    expect(frame.children[0]).toBe(originalFirst);
    expect(frame.children[1]).toBe(originalSecond);
  });

  it('re-apply after navigation shows README first again', () => {
    setLocation('/torvalds/linux', 'github.com');
    loadFixture('github-repo.html');
    const adapter = createGitHubAdapter();
    const frame = document.getElementById('repo-content-turbo-frame')!;

    const cleanup = adapter.reorganize()!;
    expect(frame.firstElementChild!.querySelector('.markdown-body')).not.toBeNull();

    cleanup();
    const cleanup2 = adapter.reorganize()!;
    expect(frame.firstElementChild!.querySelector('.markdown-body')).not.toBeNull();
    cleanup2();
  });

  it('onNavigate fires and can retrigger reorganize', () => {
    setLocation('/torvalds/linux', 'github.com');
    loadFixture('github-repo.html');
    const adapter = createGitHubAdapter();

    let callCount = 0;
    const stopListening = adapter.onNavigate(() => {
      callCount++;
    });

    document.dispatchEvent(new Event('turbo:load'));
    window.dispatchEvent(new Event('popstate'));
    expect(callCount).toBe(2);

    stopListening();
    document.dispatchEvent(new Event('turbo:load'));
    expect(callCount).toBe(2);
  });

  it('turbo:before-cache restores original DOM so the snapshot has the unmodified order', () => {
    setLocation('/torvalds/linux', 'github.com');
    loadFixture('github-repo.html');

    const frame = document.getElementById('repo-content-turbo-frame')!;
    const originalFirst = frame.children[0];

    const cleanup = createGitHubAdapter().reorganize()!;
    expect(frame.children[0]).not.toBe(originalFirst);

    cleanup();

    expect(frame.children[0]).toBe(originalFirst);
  });

  it('returns null and does not crash on a file page', () => {
    setLocation('/torvalds/linux/blob/master/Makefile', 'github.com');
    loadFixture('github-file.html');
    const adapter = createGitHubAdapter();
    expect(adapter.isRepoPage()).toBe(false);
    expect(adapter.reorganize()).toBeNull();
  });

  it('plain-text README (pre element) is moved above the file browser', () => {
    setLocation('/torvalds/linux', 'github.com');
    document.documentElement.innerHTML = `
      <html><body>
        <div id="repo-content-turbo-frame">
          <div class="OverviewRepoFiles">
            <table><tbody><tr><td>Makefile</td></tr></tbody></table>
          </div>
          <div class="OverviewHeader">
            <pre>Linux kernel source tree</pre>
          </div>
        </div>
      </body></html>`;
    const frame = document.getElementById('repo-content-turbo-frame')!;
    const cleanup = createGitHubAdapter().reorganize()!;
    expect(frame.firstElementChild!.querySelector('pre')).not.toBeNull();
    cleanup();
    expect(frame.firstElementChild!.querySelector('table')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GitLab
// ---------------------------------------------------------------------------

describe('GitLab reorganize lifecycle', () => {
  it('README appears before tree-holder after reorganize', () => {
    setLocation('/gitlab-org/gitlab', 'gitlab.com');
    loadFixture('gitlab-repo.html');
    const adapter = createGitLabAdapter();

    expect(adapter.isRepoPage()).toBe(true);

    const cleanup = adapter.reorganize();
    expect(cleanup).not.toBeNull();

    const panel = document.querySelector('.project-home-panel')!;
    expect(
      panel.firstElementChild!.classList.contains('readme-holder') ||
        panel.firstElementChild!.tagName.toLowerCase() === 'article',
    ).toBe(true);
  });

  it('cleanup fully restores original DOM order', () => {
    setLocation('/gitlab-org/gitlab', 'gitlab.com');
    loadFixture('gitlab-repo.html');

    const panel = document.querySelector('.project-home-panel')!;
    const treeHolder = document.getElementById('tree-holder')!;
    const readmeHolder = document.querySelector('.readme-holder')!;

    const cleanup = createGitLabAdapter().reorganize()!;
    expect(panel.children[0]).toBe(readmeHolder);

    cleanup();
    expect(panel.children[0]).toBe(treeHolder);
    expect(panel.children[1]).toBe(readmeHolder);
  });

  it('onNavigate fires on popstate and title mutation', async () => {
    setLocation('/gitlab-org/gitlab', 'gitlab.com');
    loadFixture('gitlab-repo.html');

    const cb = vi.fn();
    const stop = createGitLabAdapter().onNavigate(cb);

    window.dispatchEvent(new Event('popstate'));
    document.title = 'Other Repo · GitLab';
    await new Promise((r) => setTimeout(r, 0));
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2);

    stop();
  });

  it('returns null on a file page', () => {
    setLocation('/gitlab-org/gitlab/-/blob/master/README.md', 'gitlab.com');
    loadFixture('gitlab-file.html');
    expect(createGitLabAdapter().isRepoPage()).toBe(false);
    expect(createGitLabAdapter().reorganize()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bitbucket
// ---------------------------------------------------------------------------

describe('Bitbucket reorganize lifecycle', () => {
  it('README article appears before file browser after reorganize', () => {
    setLocation('/atlassian/python-bitbucket', 'bitbucket.org');
    loadFixture('bitbucket-repo.html');
    const adapter = createBitbucketAdapter();

    expect(adapter.isRepoPage()).toBe(true);

    const cleanup = adapter.reorganize();
    expect(cleanup).not.toBeNull();

    const main = document.querySelector('main')!;
    expect(main.firstElementChild!.tagName.toLowerCase()).toBe('article');
  });

  it('cleanup fully restores original DOM order', () => {
    setLocation('/atlassian/python-bitbucket', 'bitbucket.org');
    loadFixture('bitbucket-repo.html');

    const main = document.querySelector('main')!;
    const originalFirst = main.children[0];
    const originalSecond = main.children[1];

    const cleanup = createBitbucketAdapter().reorganize()!;
    expect(main.children[0]).not.toBe(originalFirst);

    cleanup();
    expect(main.children[0]).toBe(originalFirst);
    expect(main.children[1]).toBe(originalSecond);
  });

  it('onNavigate fires on popstate', () => {
    setLocation('/atlassian/python-bitbucket', 'bitbucket.org');
    const cb = vi.fn();
    const stop = createBitbucketAdapter().onNavigate(cb);
    window.dispatchEvent(new Event('popstate'));
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
    window.dispatchEvent(new Event('popstate'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns null on a file page', () => {
    setLocation('/atlassian/python-bitbucket/src/master/README.md', 'bitbucket.org');
    loadFixture('bitbucket-file.html');
    expect(createBitbucketAdapter().isRepoPage()).toBe(false);
    expect(createBitbucketAdapter().reorganize()).toBeNull();
  });
});
