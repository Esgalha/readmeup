// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetForTesting, getAdapter, registerAdapter } from '../../../src/adapters/registry.js';
import type { PlatformAdapter } from '../../../src/adapters/types.js';

function makeAdapter(): PlatformAdapter {
  return {
    isRepoPage: vi.fn(() => false),
    onNavigate: vi.fn(() => () => undefined),
    reorganize: vi.fn(() => null),
    getCollapseTargets: vi.fn(() => null),
  };
}

beforeEach(() => {
  _resetForTesting();
});

describe('getAdapter', () => {
  it('returns null for an unknown hostname', () => {
    expect(getAdapter('unknown.example.com')).toBeNull();
  });

  it('returns the adapter for a registered hostname', () => {
    const adapter = makeAdapter();
    registerAdapter('example.com', () => adapter);
    expect(getAdapter('example.com')).toBe(adapter);
  });

  it('returns null for a hostname that was not registered when another was', () => {
    registerAdapter('registered.com', makeAdapter);
    expect(getAdapter('other.com')).toBeNull();
  });

  it('resolves two different hostnames independently', () => {
    const adapterA = makeAdapter();
    const adapterB = makeAdapter();
    registerAdapter('site-a.com', () => adapterA);
    registerAdapter('site-b.com', () => adapterB);
    expect(getAdapter('site-a.com')).toBe(adapterA);
    expect(getAdapter('site-b.com')).toBe(adapterB);
  });

  it('calls the factory each time getAdapter is called', () => {
    const factory = vi.fn(makeAdapter);
    registerAdapter('example.com', factory);
    getAdapter('example.com');
    getAdapter('example.com');
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
