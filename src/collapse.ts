const STYLE_ID = 'readmeup-toggle-style';
const STORAGE_PREFIX = 'readmeup:collapsed:';

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  // Uses GitHub's own CSS variable so the hover background works in both light and dark mode.
  s.textContent =
    '[data-readmeup-toggle]:hover{background:var(--color-neutral-muted,rgba(175,184,193,.2))!important;border-radius:6px}';
  document.head.appendChild(s);
}

function repoKey(): string {
  return location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
}

export function setupCollapse(anchor: HTMLElement, collapseTarget: HTMLElement): () => void {
  injectStyle();

  const key = STORAGE_PREFIX + repoKey();
  const startCollapsed = sessionStorage.getItem(key) === '1';

  const btn = document.createElement('button');
  btn.setAttribute('data-readmeup-toggle', '');
  // ︎ forces text presentation on both triangles so they render as plain grey glyphs
  // rather than coloured emoji (▶ defaults to emoji in Chrome without it).
  btn.textContent = startCollapsed ? '▶︎' : '▼︎';
  Object.assign(btn.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    margin: '0 4px 0 8px',
    cursor: 'pointer',
    padding: '0',
    fontSize: 'inherit',
    lineHeight: '1',
    color: 'inherit',
    opacity: '0.7',
    flexShrink: '0',
    transition: 'background 0.12s',
  });

  anchor.insertBefore(btn, anchor.firstChild);

  if (startCollapsed) collapseTarget.style.display = 'none';

  function collapse(): void {
    collapseTarget.style.display = 'none';
    sessionStorage.setItem(key, '1');
    btn.textContent = '▶︎';
  }

  function expand(): void {
    collapseTarget.style.display = '';
    sessionStorage.removeItem(key);
    btn.textContent = '▼︎';
  }

  btn.addEventListener('click', () => {
    if (collapseTarget.style.display === 'none') expand();
    else collapse();
  });

  return () => {
    btn.remove();
    collapseTarget.style.display = '';
  };
}
