import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temp = mkdtempSync(join(tmpdir(), 'textrender-consumer-'));
const artifactDir = join(temp, 'artifact');
mkdirSync(artifactDir);

const run = (command, args, cwd = temp) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const write = (relativePath, contents) => {
  const path = join(temp, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
};

let server;
let serverOutput = '';
let browser;

try {
  run('npm', ['run', 'build'], root);
  const packOutput = run('npm', ['pack', '--pack-destination', artifactDir, '--json', '--ignore-scripts'], root);
  const packageInfo = JSON.parse(packOutput)[0];
  const tarball = join(artifactDir, packageInfo.filename);

  run('npm', ['init', '--yes']);
  writeFileSync(join(temp, 'package.json'), JSON.stringify({
    name: 'textrender-consumer-smoke',
    private: true,
    type: 'module',
    scripts: { dev: 'vite --host 127.0.0.1 --port 4173' },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      textrender: `file:./artifact/${packageInfo.filename}`,
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.5.0',
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      typescript: '^5.8.0',
      vite: '^6.3.0',
    },
  }, null, 2) + '\n');

  run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts']);

  write('index.html', `<!doctype html>
<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`);
  write('vite.config.mjs', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
`);
  write('tsconfig.json', JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      skipLibCheck: true,
    },
    include: ['src'],
  }, null, 2) + '\n');
  write('src/main.tsx', `import { createRoot } from 'react-dom/client';
import { TextRender, resin } from 'textrender';
import type { ResinOptions } from 'textrender';

const options: ResinOptions = { ...resin.defaults, puff: 0.6, roundness: 0.4, depth: 0.7 };

createRoot(document.getElementById('root')!).render(
  <TextRender shader="resin" {...options}>
    <span data-testid="consumer-text">Packed package</span>
  </TextRender>,
);
`);

  run('npx', ['--no-install', 'tsc', '--noEmit']);

  server = spawn('npm', ['run', 'dev'], {
    cwd: temp,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
  server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

  browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  let navigationError;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
      navigationError = undefined;
      break;
    } catch (error) {
      navigationError = error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (navigationError) throw navigationError;
  await page.locator('[data-testid="consumer-text"][data-shader-state="ready"]').waitFor();
  const result = await page.locator('[data-testid="consumer-text"] canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('The packed consumer app could not create a WebGL2 context.');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return {
      width: canvas.width,
      height: canvas.height,
      nonEmptyPixels: pixels.some((value, index) => index % 4 === 3 && value > 0),
    };
  });

  if (!result.width || !result.height || !result.nonEmptyPixels) {
    throw new Error(`Packed consumer rendered an empty canvas: ${JSON.stringify(result)}`);
  }
  if (pageErrors.length || consoleErrors.length) {
    throw new Error(`Packed consumer reported errors. Page: ${pageErrors.join('; ')} Console: ${consoleErrors.join('; ')}`);
  }

  console.log(`Consumer smoke test passed (${result.width}x${result.height} rendered canvas).`);
} catch (error) {
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
  rmSync(temp, { recursive: true, force: true });
}
