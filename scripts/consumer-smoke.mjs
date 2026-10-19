import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
async function testConsumer(reactMajor) {
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
    const packOutput = run('npm', ['pack', '--pack-destination', artifactDir, '--json', '--ignore-scripts'], root);
    const packageInfo = JSON.parse(packOutput)[0];

    run('npm', ['init', '--yes']);
    writeFileSync(join(temp, 'package.json'), JSON.stringify({
      name: 'textrender-consumer-smoke',
      private: true,
      type: 'module',
      scripts: { dev: 'vite --host 127.0.0.1 --port 4173' },
      dependencies: {
        react: `^${reactMajor}.0.0`,
        'react-dom': `^${reactMajor}.0.0`,
        textrender: `file:./artifact/${packageInfo.filename}`,
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.5.0',
        '@types/react': `^${reactMajor}.0.0`,
        '@types/react-dom': `^${reactMajor}.0.0`,
        typescript: '^5.8.0',
        vite: '^6.3.0',
      },
    }, null, 2) + '\n');

    run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts']);

    const versions = JSON.parse(run(process.execPath, ['--input-type=module', '-e', `
      import { version as react } from 'react';
      import { version as reactDom } from 'react-dom';
      console.log(JSON.stringify({ react, reactDom }));
    `]));
    assert.equal(Number(versions.react.split('.')[0]), reactMajor);
    assert.equal(versions.reactDom, versions.react, 'React and React DOM versions must match.');
    console.log(`Testing packed consumer with React ${versions.react} and React DOM ${versions.reactDom}.`);

    const entryUrl = run(process.execPath, ['--input-type=module', '-e',
      "console.log(import.meta.resolve('textrender'))"]).trim();
    assert.match(readFileSync(fileURLToPath(entryUrl), 'utf8'), /^\s*(['"])use client\1;/,
      'The installed package entry must begin with the Next.js client directive.');

    write('index.html', `<!doctype html>
  <html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`);
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
    write('src/main.tsx', `import { useRef } from 'react';
  import { createRoot } from 'react-dom/client';
  import { TextRender, resin } from 'textrender';
  import type { ResinOptions } from 'textrender';

  const options: ResinOptions = { ...resin.defaults, puff: 0.6, roundness: 0.4, depth: 0.7 };

  function Consumer() {
    const ref = useRef<HTMLSpanElement>(null);
    return <>
      <TextRender shader="resin" {...options}>
        <span ref={ref} data-testid="consumer-text">Packed package</span>
      </TextRender>
      <button onClick={() => ref.current?.setAttribute('data-ref-working', 'yes')}>Check ref</button>
    </>;
  }

  createRoot(document.getElementById('root')!).render(<Consumer />);
  `);

    run('npx', ['--no-install', 'tsc', '--noEmit']);

    server = spawn(process.execPath, [join(temp, 'node_modules/vite/bin/vite.js'),
      '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
      cwd: temp,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
    server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

    browser = await chromium.launch();
    const serverHtml = run(process.execPath, ['--input-type=module', '-e', `
      import { createElement } from 'react';
      import { renderToString } from 'react-dom/server';
      import { TextRender } from 'textrender';
      console.log(renderToString(createElement('main', null,
        createElement(TextRender, null, createElement('h1', { id: 'ssr-inherited' }, 'Readable without JavaScript')),
        createElement(TextRender, null, createElement('h2', {
          id: 'ssr-styled', style: { color: '#123456', WebkitTextFillColor: '#234567' },
        }, 'Author text colors')),
      )));
    `]);
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
    try {
      const noScriptPage = await noScriptContext.newPage();
      await noScriptPage.setContent(`<!doctype html><html><body style="color: #345678">${serverHtml}</body></html>`);
      const serverText = await noScriptPage.locator('[data-shader-state]').evaluateAll(hosts => hosts.map(host => ({
        state: host.dataset.shaderState, text: host.textContent,
        color: getComputedStyle(host).color, fill: getComputedStyle(host).webkitTextFillColor,
        canvasVisibility: getComputedStyle(host.querySelector('canvas')).visibility,
      })));
      assert.equal(serverText.length, 2);
      assert.deepEqual(serverText.map(host => host.state), ['pending', 'pending']);
      assert.deepEqual(serverText.map(host => host.canvasVisibility), ['hidden', 'hidden']);
      assert.deepEqual(serverText.map(host => host.color), ['rgb(52, 86, 120)', 'rgb(18, 52, 86)']);
      assert.deepEqual(serverText.map(host => host.fill), ['rgb(52, 86, 120)', 'rgb(35, 69, 103)']);
      assert.equal(serverText[0].text, 'Readable without JavaScript');
    } finally {
      await noScriptContext.close();
    }
    const page = await browser.newPage();
    await page.addInitScript(() => {
      // Read immediately after drawing: an idle renderer's default WebGL buffer
      // may be cleared by the browser after compositing.
      window.__consumerDraws = new WeakMap();
      const draw = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function (...args) {
        draw.apply(this, args);
        const { width, height } = this.canvas;
        const pixels = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
        window.__consumerDraws.set(this.canvas, {
          width, height,
          nonEmptyPixels: pixels.some((value, index) => index % 4 === 3 && value > 0),
        });
      };
    });
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
    await page.getByRole('button', { name: 'Check ref' }).click();
    assert.equal(await page.getByTestId('consumer-text').getAttribute('data-ref-working'), 'yes',
      'The child ref reaches the rendered element.');
    const result = await page.locator('[data-testid="consumer-text"] canvas').evaluate(canvas => {
      const drawn = window.__consumerDraws.get(canvas);
      if (!drawn) throw new Error('The packed consumer app did not draw with WebGL2.');
      return drawn;
    });

    if (!result.width || !result.height || !result.nonEmptyPixels) {
      throw new Error(`Packed consumer rendered an empty canvas: ${JSON.stringify(result)}`);
    }
    if (pageErrors.length || consoleErrors.length) {
      throw new Error(`Packed consumer reported errors. Page: ${pageErrors.join('; ')} Console: ${consoleErrors.join('; ')}`);
    }

    console.log(`React ${versions.react} consumer smoke test passed (${result.width}x${result.height} rendered canvas).`);
  } catch (error) {
    if (serverOutput) console.error(serverOutput);
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server && server.exitCode === null && server.signalCode === null) {
      server.kill('SIGTERM');
      await once(server, 'exit');
    }
    rmSync(temp, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--react=18', '--react=19'].includes(args[0]))) {
  throw new Error('Usage: node scripts/consumer-smoke.mjs [--react=18|--react=19]');
}
const reactMajors = args.length ? [Number(args[0].split('=')[1])] : [18, 19];
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
for (const reactMajor of reactMajors) await testConsumer(reactMajor);
