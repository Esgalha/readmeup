// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory mock of browser.storage.local
const store: Record<string, unknown> = {};
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
        }),
      },
    },
  },
}));

import {
  getDisabledRepos,
  setRepoEnabled,
  getCollapsedRepos,
  setRepoCollapsed,
} from '../../src/storage.js';

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.clearAllMocks();
});

describe('getDisabledRepos', () => {
  it('returns an empty set when nothing is stored', async () => {
    const result = await getDisabledRepos();
    expect(result.size).toBe(0);
  });

  it('returns stored repo keys as a Set', async () => {
    store['disabledRepos'] = ['github.com/owner/a', 'gitlab.com/owner/b'];
    const result = await getDisabledRepos();
    expect(result.has('github.com/owner/a')).toBe(true);
    expect(result.has('gitlab.com/owner/b')).toBe(true);
  });
});

describe('setRepoEnabled', () => {
  it('adds a repo key when disabled', async () => {
    await setRepoEnabled('github.com/owner/repo', false);
    const result = await getDisabledRepos();
    expect(result.has('github.com/owner/repo')).toBe(true);
  });

  it('removes a repo key when enabled', async () => {
    store['disabledRepos'] = ['github.com/owner/repo'];
    await setRepoEnabled('github.com/owner/repo', true);
    const result = await getDisabledRepos();
    expect(result.has('github.com/owner/repo')).toBe(false);
  });

  it('enabling a repo that was never disabled is a no-op', async () => {
    await setRepoEnabled('github.com/owner/repo', true);
    const result = await getDisabledRepos();
    expect(result.size).toBe(0);
  });

  it('disabling one repo does not affect others', async () => {
    store['disabledRepos'] = ['github.com/owner/other'];
    await setRepoEnabled('github.com/owner/repo', false);
    const result = await getDisabledRepos();
    expect(result.has('github.com/owner/other')).toBe(true);
    expect(result.has('github.com/owner/repo')).toBe(true);
  });
});

describe('getCollapsedRepos', () => {
  it('returns an empty set when nothing is stored', async () => {
    const result = await getCollapsedRepos();
    expect(result.size).toBe(0);
  });

  it('returns stored repo keys as a Set', async () => {
    store['collapsedRepos'] = ['github.com/owner/a', 'gitlab.com/owner/b'];
    const result = await getCollapsedRepos();
    expect(result.has('github.com/owner/a')).toBe(true);
    expect(result.has('gitlab.com/owner/b')).toBe(true);
  });
});

describe('setRepoCollapsed', () => {
  it('adds a repo key when collapsed', async () => {
    await setRepoCollapsed('github.com/owner/repo', true);
    const result = await getCollapsedRepos();
    expect(result.has('github.com/owner/repo')).toBe(true);
  });

  it('removes a repo key when expanded', async () => {
    store['collapsedRepos'] = ['github.com/owner/repo'];
    await setRepoCollapsed('github.com/owner/repo', false);
    const result = await getCollapsedRepos();
    expect(result.has('github.com/owner/repo')).toBe(false);
  });

  it('does not affect disabled repos storage', async () => {
    store['disabledRepos'] = ['github.com/owner/repo'];
    await setRepoCollapsed('github.com/owner/repo', true);
    const disabled = await getDisabledRepos();
    expect(disabled.has('github.com/owner/repo')).toBe(true);
  });
});
