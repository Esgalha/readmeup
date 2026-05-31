// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupCollapse, preloadCollapsedState } from '../../src/collapse.js';

vi.mock('../../src/storage.js', () => ({
  setRepoCollapsed: vi.fn().mockResolvedValue(undefined),
}));

import { setRepoCollapsed } from '../../src/storage.js';

function makeDOM(): { anchor: HTMLElement; collapseTarget: HTMLElement } {
  const wrapper = document.createElement('div');
  const anchor = document.createElement('div');
  anchor.textContent = 'README';
  const collapseTarget = document.createElement('div');
  const content = document.createElement('div');
  content.textContent = 'README content';
  collapseTarget.appendChild(content);
  wrapper.appendChild(anchor);
  wrapper.appendChild(collapseTarget);
  document.body.appendChild(wrapper);
  return { anchor, collapseTarget };
}

const repoKey = location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');

beforeEach(() => {
  document.body.innerHTML = '';
  preloadCollapsedState(new Set());
  vi.mocked(setRepoCollapsed).mockClear();
});

describe('setupCollapse', () => {
  it('inserts toggle as first child of the anchor', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    expect(anchor.firstElementChild?.getAttribute('data-readmeup-toggle')).not.toBeNull();
  });

  it('shows ▼︎ when expanded', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    expect(btn.textContent).toBe('▼︎');
  });

  it('hides collapseTarget and shows ▶︎ when collapsed', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    expect(collapseTarget.style.display).toBe('none');
    expect(btn.textContent).toBe('▶︎');
  });

  it('restores collapseTarget and shows ▼︎ when expanded again', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    btn.click();
    expect(collapseTarget.style.display).toBe('');
    expect(btn.textContent).toBe('▼︎');
  });

  it('calls setRepoCollapsed(key, true) on collapse', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    expect(setRepoCollapsed).toHaveBeenCalledWith(repoKey, true);
  });

  it('calls setRepoCollapsed(key, false) on expand', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    btn.click();
    expect(setRepoCollapsed).toHaveBeenLastCalledWith(repoKey, false);
  });

  it('starts collapsed when preloadCollapsedState contains the repo key', () => {
    preloadCollapsedState(new Set([repoKey]));
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    expect(collapseTarget.style.display).toBe('none');
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    expect(btn.textContent).toBe('▶︎');
  });

  it('cleanup removes the button and restores collapseTarget display', () => {
    const { anchor, collapseTarget } = makeDOM();
    const cleanup = setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector('[data-readmeup-toggle]')!;
    btn.dispatchEvent(new MouseEvent('click'));
    cleanup();
    expect(document.querySelector('[data-readmeup-toggle]')).toBeNull();
    expect(collapseTarget.style.display).toBe('');
  });
});
