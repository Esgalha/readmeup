import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, 'dist/chrome');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // E2E tests manage their own browser context (PersistentContext required for extensions)
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {
        browserName: 'chromium',
        launchOptions: {
          headless: false,
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],
});
