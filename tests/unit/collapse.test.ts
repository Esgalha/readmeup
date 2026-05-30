// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setupCollapse } from '../../src/collapse.js';

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

beforeEach(() => {
  document.body.innerHTML = '';
  sessionStorage.clear();
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

  it('persists collapsed state to sessionStorage', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    const key =
      'readmeup:collapsed:' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
    expect(sessionStorage.getItem(key)).toBe('1');
  });

  it('removes collapsed state from sessionStorage on expand', () => {
    const { anchor, collapseTarget } = makeDOM();
    setupCollapse(anchor, collapseTarget);
    const btn = document.querySelector<HTMLButtonElement>('[data-readmeup-toggle]')!;
    btn.click();
    btn.click();
    const key =
      'readmeup:collapsed:' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('starts collapsed when sessionStorage has the key set', () => {
    const key =
      'readmeup:collapsed:' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
    sessionStorage.setItem(key, '1');
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
