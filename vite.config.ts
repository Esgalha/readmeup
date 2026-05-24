import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const browser = mode === 'firefox' ? 'firefox' : 'chrome';
  const manifestFile = resolve(__dirname, `manifests/manifest.${browser}.json`);

  return {
    build: {
      outDir: `dist/${browser}`,
      minify: false,
    },
    plugins: [
      webExtension({
        manifest: manifestFile,
        browser,
        disableAutoLaunch: true,
      }),
    ],
  };
});
