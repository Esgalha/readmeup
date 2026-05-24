// @vitest-environment jsdom
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBitbucketAdapter } from '../../../src/adapters/bitbucket.js';

const fixturesDir = resolve(__dirname, 'fixtures');

function loadFixture(name: string): void {
  document.documentElement.innerHTML = readFileSync(resolve(fixturesDir, name), 'utf-8');
}

function setLocation(path: string): void {
  Object.defineProperty(window, 'location', {
    value: { pathname: path, hostname: 'bitbucket.org' },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  document.documentElement.innerHTML = '';
});

describe('isRepoPage', () => {
  it('returns true for workspace/repo', () => {
    setLocation('/atlassian/python-bitbucket');
    expect(createBitbucketAdapter().isRepoPage()).toBe(true);
  });

  it('returns true for /workspace/repo/src/branch/', () => {
    setLocation('/atlassian/python-bitbucket/src/master/');
    expect(createBitbucketAdapter().isRepoPage()).toBe(true);
  });

  it('returns false for a file path', () => {
    setLocation('/atlassian/python-bitbucket/src/master/README.md');
    expect(createBitbucketAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for pull requests', () => {
    setLocation('/atlassian/python-bitbucket/pull-requests');
    expect(createBitbucketAdapter().isRepoPage()).toBe(false);
  });

  it('returns false for the homepage', () => {
    setLocation('/');
    expect(createBitbucketAdapter().isRepoPage()).toBe(false);
  });
});

describe('reorganize', () => {
  it('moves article before the file-browser div inside main', () => {
    loadFixture('bitbucket-repo.html');
    const main = document.querySelector('main')!;
    const fileBrowser = document.querySelector('[data-testid="file-browser"]')!;
    const article = document.querySelector('article')!;

    expect(main.children[0]).toBe(fileBrowser);
    expect(main.children[1]).toBe(article);

    createBitbucketAdapter().reorganize();

    expect(main.children[0]).toBe(article);
    expect(main.children[1]).toBe(fileBrowser);
  });

  it('cleanup restores article after the file-browser div', () => {
    loadFixture('bitbucket-repo.html');
    const main = document.querySelector('main')!;
    const fileBrowser = document.querySelector('[data-testid="file-browser"]')!;
    const article = document.querySelector('article')!;

    const cleanup = createBitbucketAdapter().reorganize();
    cleanup!();

    expect(main.children[0]).toBe(fileBrowser);
    expect(main.children[1]).toBe(article);
  });

  it('returns null when there is no article', () => {
    document.documentElement.innerHTML = '<main><div>no readme</div></main>';
    expect(createBitbucketAdapter().reorganize()).toBeNull();
  });

  it('returns null when article has no content', () => {
    document.documentElement.innerHTML = '<main><div>files</div><article></article></main>';
    expect(createBitbucketAdapter().reorganize()).toBeNull();
  });

  it('returns null when article has no preceding sibling at any level', () => {
    document.documentElement.innerHTML = '<main><article><h1>Readme</h1></article></main>';
    expect(createBitbucketAdapter().reorganize()).toBeNull();
  });
});

describe('onNavigate', () => {
  it('fires callback on popstate', () => {
    const cb = vi.fn();
    const cleanup = createBitbucketAdapter().onNavigate(cb);
    window.dispatchEvent(new Event('popstate'));
    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('stops firing after cleanup', () => {
    const cb = vi.fn();
    const cleanup = createBitbucketAdapter().onNavigate(cb);
    cleanup();
    window.dispatchEvent(new Event('popstate'));
    expect(cb).not.toHaveBeenCalled();
  });
});
