import { fileURLToPath } from 'url';
import path from 'path';
import { BrowserContext, chromium, expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../../dist/chrome');
const fixturesPath = path.resolve(__dirname, 'fixtures');

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

// Helper: open a page with a fixture routed to a platform URL so content scripts fire
async function openFixture(platformUrl: string, fixtureName: string) {
  const page = await context.newPage();
  await page.route(`${platformUrl}**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      path: path.join(fixturesPath, fixtureName),
    }),
  );
  await page.goto(platformUrl, { waitUntil: 'domcontentloaded' });
  return page;
}

test.describe('GitHub – reorganize layout', () => {
  test('README section appears above the file browser after load', async () => {
    const page = await openFixture('https://github.com/torvalds/linux', 'github.html');
    const header = page.locator('[data-testid="overview-header"]');
    const files = page.locator('[data-testid="overview-repo-files"]');
    await expect(header).toBeVisible();
    await expect(files).toBeVisible();
    // OverviewHeader should appear higher on the page than OverviewRepoFiles
    const headerBox = await header.boundingBox();
    const filesBox = await files.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(filesBox).not.toBeNull();
    expect(headerBox!.y).toBeLessThan(filesBox!.y);
    await page.close();
  });

  test('README content is visible without scrolling', async () => {
    const page = await openFixture('https://github.com/torvalds/linux', 'github.html');
    await expect(page.locator('.markdown-body h1')).toContainText('Linux kernel');
    await page.close();
  });

  test('no custom panel element is injected for GitHub', async () => {
    const page = await openFixture('https://github.com/torvalds/linux', 'github.html');
    await expect(page.locator('[data-rmu-panel]')).toHaveCount(0);
    await page.close();
  });

  test('layout is restored and re-applied after turbo:load navigation', async () => {
    const page = await openFixture('https://github.com/torvalds/linux', 'github.html');
    // Verify initial reorganization
    const header = page.locator('[data-testid="overview-header"]');
    const files = page.locator('[data-testid="overview-repo-files"]');
    let headerBox = await header.boundingBox();
    let filesBox = await files.boundingBox();
    expect(headerBox!.y).toBeLessThan(filesBox!.y);
    // Simulate Turbo SPA navigation away then back
    await page.evaluate(() => {
      (
        window as unknown as { __simulateNavigation: (path: string, title: string) => void }
      ).__simulateNavigation('/torvalds/linux', 'torvalds/linux: Linux kernel source tree');
    });
    // After navigation the elements should still be reorganized
    headerBox = await header.boundingBox();
    filesBox = await files.boundingBox();
    expect(headerBox!.y).toBeLessThan(filesBox!.y);
    await page.close();
  });

  test('README remains above files after turbo:frame-load replaces frame content', async () => {
    const page = await openFixture('https://github.com/torvalds/linux', 'github.html');
    const header = page.locator('[data-testid="overview-header"]');
    const files = page.locator('[data-testid="overview-repo-files"]');
    // Verify initial reorganization
    let headerBox = await header.boundingBox();
    let filesBox = await files.boundingBox();
    expect(headerBox!.y).toBeLessThan(filesBox!.y);
    // Simulate GitHub's turbo-frame lazy-loading fresh server content (files first, README second)
    await page.evaluate(() => {
      (window as unknown as { __simulateFrameLoad: () => void }).__simulateFrameLoad();
    });
    // The turbo:frame-load handler should have re-run reorganize() on the fresh DOM
    headerBox = await header.boundingBox();
    filesBox = await files.boundingBox();
    expect(headerBox!.y).toBeLessThan(filesBox!.y);
    await page.close();
  });
});

test.describe('GitLab – reorganize layout', () => {
  test('README section appears above the file browser after load', async () => {
    const page = await openFixture('https://gitlab.com/gitlab-org/gitlab', 'gitlab.html');
    const readme = page.locator('[data-testid="readme-holder"]');
    const tree = page.locator('[data-testid="tree-holder"]');
    await expect(readme).toBeVisible();
    await expect(tree).toBeVisible();
    const readmeBox = await readme.boundingBox();
    const treeBox = await tree.boundingBox();
    expect(readmeBox).not.toBeNull();
    expect(treeBox).not.toBeNull();
    expect(readmeBox!.y).toBeLessThan(treeBox!.y);
    await page.close();
  });

  test('README content is visible without scrolling', async () => {
    const page = await openFixture('https://gitlab.com/gitlab-org/gitlab', 'gitlab.html');
    await expect(page.locator('.readme-holder h1')).toContainText('GitLab');
    await page.close();
  });

  test('no custom panel element is injected for GitLab', async () => {
    const page = await openFixture('https://gitlab.com/gitlab-org/gitlab', 'gitlab.html');
    await expect(page.locator('[data-rmu-panel]')).toHaveCount(0);
    await page.close();
  });
});

test.describe('Bitbucket – reorganize layout', () => {
  test('README article appears above the file browser after load', async () => {
    const page = await openFixture(
      'https://bitbucket.org/atlassian/python-bitbucket',
      'bitbucket.html',
    );
    const readme = page.locator('[data-testid="readme-article"]');
    const fileBrowser = page.locator('[data-testid="file-browser"]');
    await expect(readme).toBeVisible();
    await expect(fileBrowser).toBeVisible();
    const readmeBox = await readme.boundingBox();
    const fileBrowserBox = await fileBrowser.boundingBox();
    expect(readmeBox).not.toBeNull();
    expect(fileBrowserBox).not.toBeNull();
    expect(readmeBox!.y).toBeLessThan(fileBrowserBox!.y);
    await page.close();
  });

  test('README content is visible without scrolling', async () => {
    const page = await openFixture(
      'https://bitbucket.org/atlassian/python-bitbucket',
      'bitbucket.html',
    );
    await expect(page.locator('article h1')).toContainText('Fargo3D');
    await page.close();
  });

  test('no custom panel element is injected for Bitbucket', async () => {
    const page = await openFixture(
      'https://bitbucket.org/atlassian/python-bitbucket',
      'bitbucket.html',
    );
    await expect(page.locator('[data-rmu-panel]')).toHaveCount(0);
    await page.close();
  });
});
