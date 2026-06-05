/**
 * Takes screenshots of the extension on live repository pages.
 * Usage: node scripts/screenshots.mjs
 * Requires: npm run build:chrome && npx playwright install chromium
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../dist/chrome');

const TARGETS = [
  {
    url: 'https://github.com/torvalds/linux',
    out: 'screenshots/GitHubLinux.png',
    collapsed: false,
  },
  {
    url: 'https://github.com/Esgalha/readmeup',
    out: 'screenshots/GitHubReadmeup.png',
    collapsed: false,
  },
  {
    url: 'https://github.com/Esgalha/readmeup',
    out: 'screenshots/GitHubReadmeupCollapsed.png',
    collapsed: true,
  },
  {
    url: 'https://gitlab.com/gitlab-org/gitlab-foss',
    out: 'screenshots/GitLab.png',
    collapsed: false,
  },
  {
    url: 'https://bitbucket.org/atlassian/aui/src/master/',
    out: 'screenshots/Bitbucket.png',
    collapsed: false,
  },
];

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1280,800',
  ],
  viewport: { width: 1280, height: 800 },
});

for (const { url, out, collapsed } of TARGETS) {
  console.log(`Capturing ${url} → ${out} ...`);
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });

    // Dismiss cookie banners (Bitbucket shows one on first visit)
    for (const label of ['Only necessary', 'Accept all', 'Reject all']) {
      const btn = page.getByRole('button', { name: label });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(800);
        break;
      }
    }

    // Wait for the extension to reorganize. Bitbucket has no toggle (native collapse),
    // so fall back to a timed wait if the toggle never appears.
    const hasToggle = await page
      .waitForSelector('[data-readmeup-toggle]', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!hasToggle) {
      // Give the reorganize a moment to settle before screenshotting
      await page.waitForTimeout(2000);
    } else if (collapsed) {
      await page.click('[data-readmeup-toggle]');
      await page.waitForTimeout(400);
    }

    const outPath = path.resolve(__dirname, '..', out);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  ✓ saved ${out}`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
  }

  await page.close();
}

await context.close();
