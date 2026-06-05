# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Collapsible README toggle: a Hide/Show button above the moved README section, with collapsed state persisted per repo across browser sessions.
- Per-repo toggle in the extension popup to permanently disable ReadmeUp on individual repositories, with the preference stored across browser sessions.
- Extension now available on the [Chrome Web Store](https://chromewebstore.google.com/detail/readmeup/blmmekffobioflgmkdfgechgjkicmema).

### Fixed

- Extension icon now appears in the browser toolbar, extension manager, and store listings.

### Changed

- CI workflow skips the test and build pipeline when only documentation files or Dependabot config change.
- Release job moved to a dedicated `release.yml` workflow triggered by version tags only.

## [1.0.0] - 2026-05-25

### Added

- Physical DOM reordering via `reorganize()` on GitHub, GitLab, and Bitbucket. The README section is moved using `insertBefore` on existing DOM elements; no new nodes are created and no extra network requests are made.
- Two-phase hoist: when a branch picker bar lives one DOM level above the file-browser container, the README section is lifted to that outer level so the final order is always README, branch bar, file browser.
- Plain-text README support (`<pre>` elements, e.g. `torvalds/linux`).
- SPA navigation handling: GitHub (`turbo:load` + `popstate`), GitLab (`MutationObserver` on `<title>` + `popstate`), Bitbucket (`popstate`).
- `turbo:before-cache` listener restores the original DOM order before Turbo snapshots it, preventing stale previews on the next visit.
- `turbo:frame-load` listener re-runs `reorganize()` after `repo-content-turbo-frame` replaces its children, fixing broken state when switching between the Code tab and PRs or Issues.
- Guard `MutationObserver` that detects when GitHub's post-hydration re-render moves the README back and immediately re-applies the reorganization.
- Platform adapter interface (`PlatformAdapter`) and a hostname-keyed adapter registry.
- Unit tests for all platform adapters against HTML fixture snapshots (Vitest + jsdom).
- Integration tests covering the full panel and reorganize lifecycles.
- E2E tests using Playwright with route interception to serve local fixtures at real platform URLs.
- Chrome MV3 and Firefox MV2 builds via Vite and vite-plugin-web-extension.
- Extension popup showing version and link to repository.
- GitHub Actions CI pipeline (lint, typecheck, unit/integration tests with coverage, build, E2E).
- GitHub Actions release pipeline (triggered on `v*.*.*` tags; builds both targets, zips, attaches to GitHub Release).
- Dependabot for weekly npm and GitHub Actions updates with vitest and eslint packages grouped.
- `eslint-plugin-security` in the lint step.
