import { ZipArchive } from 'archiver';
import { createWriteStream, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const version = pkg.version;

function zipDirectory(sourceDir, outPath) {
  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}\nRun the build first.`);
  }

  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Created ${outPath} (${archive.pointer()} bytes)`);
      resolvePromise();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  const builds = [
    {
      source: resolve(root, 'dist', 'chrome'),
      output: resolve(root, 'dist', `readmeup-chrome-${version}.zip`),
    },
    {
      source: resolve(root, 'dist', 'firefox'),
      output: resolve(root, 'dist', `readmeup-firefox-${version}.zip`),
    },
  ];

  for (const { source, output } of builds) {
    console.log(`Zipping ${source} ...`);
    await zipDirectory(source, output);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
