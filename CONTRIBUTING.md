# Contributing to ReadmeUp

Thanks for your interest in contributing.

## Prerequisites

- Node.js 20 or later
- npm 9 or later

## Setup

```bash
git clone https://github.com/Esgalha/readmeup.git
cd readmeup
npm install
```

## Development workflow

```bash
npm run dev:chrome    # start Vite in watch mode for Chrome
npm run dev:firefox   # start Vite in watch mode for Firefox
```

Load the extension from `dist/chrome` or `dist/firefox` as an unpacked extension in your browser.

## Checks

All of the following must pass before submitting a pull request:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Adding a new platform adapter

1. Create `src/adapters/<platform>.ts` implementing `PlatformAdapter` from `src/adapters/types.ts`.
2. Register it in `src/content.ts` with `registerAdapter('<hostname>', create<Platform>Adapter)`.
3. Add the platform's hostname to `host_permissions` in both manifests (`manifest.chrome.json`, `manifest.firefox.json`).
4. Add unit tests in `tests/unit/adapters/<platform>.test.ts` with HTML fixtures in `tests/unit/adapters/fixtures/`.
5. Add E2E fixtures in `tests/e2e/fixtures/` and cases in `tests/e2e/extension.spec.ts`.

### Implementing `reorganize()`

The recommended approach for new adapters is to implement `reorganize()` rather than relying on the panel-injection fallback. `reorganize()` should:

- Find the README element in the DOM.
- Walk up from it until finding the level where a preceding sibling contains the file browser (look for a `<table>` or another stable marker).
- Insert the README section before all siblings at that level (phase 1).
- Check if the file-browser container itself has preceding siblings in its parent (e.g. a branch picker bar); if so, lift the README section up to that outer level instead (phase 2).
- Return a cleanup function that restores the original DOM order.
- Return `null` if the required elements are not in the DOM yet (the content script will retry via `MutationObserver`).

See the existing GitHub, GitLab, and Bitbucket adapters for reference implementations.

## Submitting a pull request

- Keep PRs focused on a single change.
- Write a clear PR description explaining what and why, not just what changed.
- Update `CHANGELOG.md` under `[Unreleased]`.

## Reporting issues

Open a GitHub issue with steps to reproduce, expected behavior, and actual behavior.
