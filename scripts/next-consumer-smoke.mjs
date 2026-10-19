import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temp = mkdtempSync(join(tmpdir(), 'textrender-next-'));
const port = 4188;
const url = `http://127.0.0.1:${port}`;
const run = (command, args, cwd = temp) => execFileSync(command, args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
const write = (path, contents) => {
  mkdirSync(dirname(join(temp, path)), { recursive: true });
  writeFileSync(join(temp, path), contents);
};
let server;
let browser;
let output = '';
async function stop() {
  if (server && server.exitCode === null && server.signalCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}

try {
  run('npm', ['run', 'build'], root);
  mkdirSync(join(temp, 'artifact'));
  const [artifact] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', join(temp, 'artifact')], root));
  write('package.json', JSON.stringify({
    name: 'textrender-next-consumer', private: true, type: 'module',
    dependencies: { next: '16.4.0', react: '19.3.0', 'react-dom': '19.3.0', textrender: `file:./artifact/${artifact.filename}` },
  }, null, 2));
  write('next.config.mjs', 'export default { cacheComponents: true, partialPrefetching: true };\n');
  write('app/layout.jsx', `export default function Layout({ children }) {
    return <html><head><link rel="icon" href="data:," /></head><body style={{ fontFamily: 'sans-serif', fontSize: 48 }}>{children}</body></html>;
  }`);
  write('app/page.jsx', `import { Suspense } from 'react';
    import { connection } from 'next/server';
    import { TextRender } from 'textrender';
    import { Cases } from './cases';
    async function Deferred() {
      await connection();
      await new Promise(resolve => setTimeout(resolve, 100));
      return <span data-testid="deferred">Deferred text</span>;
    }
    export default function Page() {
      return <main>
        <p><TextRender><span data-testid="server">Server text</span></TextRender></p>
        <Suspense fallback={<p>Loading text</p>}>
          <p><TextRender><Deferred /></TextRender></p>
        </Suspense>
        <Cases />
      </main>;
    }`);
  // JSX intentionally exercises invalid runtime inputs without widening the public API.
  write('app/cases.jsx', `'use client';
    import { useState } from 'react';
    import { TextRender } from 'textrender';
    export function Cases() {
      const [mode, setMode] = useState('supported');
      const child = mode === 'absent' ? undefined : mode === 'unsupported'
        ? <div data-testid="unsupported">Unsupported text</div>
        : mode === 'nested' ? <span data-testid="nested"><b>Nested text</b></span>
        : mode === 'multiple' ? [<span key="a">First</span>, <span key="b">Second</span>]
        : <span key={mode} data-testid="changing">Changing text</span>;
      return <section>
        <div data-testid="case"><TextRender>{child}</TextRender></div>
        {['supported', 'unsupported', 'absent', 'nested', 'multiple', 'replacement'].map(value =>
          <button key={value} onClick={() => setMode(value)}>{value}</button>)}
      </section>;
    }`);
  run('npm', ['install', '--no-audit', '--no-fund']);
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  for (const mode of ['dev', 'start']) {
    if (mode === 'start') run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
    output = '';
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', mode, '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: temp, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    });
    server.stdout.on('data', chunk => { output += chunk; });
    server.stderr.on('data', chunk => { output += chunk; });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__draws = new WeakMap();
      window.__deleted = new WeakSet();
      const draw = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function (...args) {
        draw.apply(this, args);
        const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
        this.readPixels(0, 0, this.canvas.width, this.canvas.height, this.RGBA, this.UNSIGNED_BYTE, pixels);
        window.__draws.set(this.canvas, pixels.some((v, i) => i % 4 === 3 && v > 0));
      };
      const dispose = WebGL2RenderingContext.prototype.deleteProgram;
      WebGL2RenderingContext.prototype.deleteProgram = function (...args) {
        window.__deleted.add(this.canvas);
        return dispose.apply(this, args);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await expect.poll(async () => {
      try { return (await fetch(url)).ok; } catch { return false; }
    }, { timeout: 60_000 }).toBe(true);
    await page.goto(url);
    for (const id of ['server', 'deferred', 'changing']) {
      await expect(page.getByTestId(id)).toHaveAttribute('data-shader-state', 'ready', { timeout: 30_000 });
      await expect.poll(() => page.getByTestId(id).locator('canvas').evaluate(canvas => window.__draws.get(canvas))).toBe(true);
    }
    for (const target of ['unsupported', 'absent', 'nested', 'multiple', 'replacement']) {
      const oldCanvas = await page.getByTestId('changing').locator('canvas').elementHandle();
      await page.getByRole('button', { name: target, exact: true }).click();
      await expect.poll(() => oldCanvas.evaluate(canvas => window.__deleted.has(canvas))).toBe(true);
      if (target === 'replacement') {
        await expect(page.getByTestId('changing')).toHaveAttribute('data-shader-state', 'ready');
      } else {
        await expect(page.getByTestId('case').locator('canvas')).toHaveCount(0);
        await expect(page.getByTestId('case')).toHaveText({ unsupported: 'Unsupported text', absent: '', nested: 'Nested text', multiple: 'FirstSecond' }[target]);
      }
      await oldCanvas.dispose();
      await page.getByRole('button', { name: 'supported', exact: true }).click();
      await expect(page.getByTestId('changing')).toHaveAttribute('data-shader-state', 'ready');
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const htmlPage = await noScript.newPage();
    await htmlPage.goto(url);
    await expect(htmlPage.getByTestId('server')).toHaveText('Server text');
    await expect(htmlPage.getByTestId('server')).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(htmlPage.getByTestId('server').locator('canvas')).toHaveCSS('visibility', 'hidden');
    await noScript.close();
    assert.deepEqual(errors, [], `Next.js ${mode} browser errors`);
    await context.close();
    await stop();
    console.log(`Next.js ${mode} consumer passed: server/deferred children, rendered pixels, child replacement, cleanup, and readable HTML.`);
  }
} catch (error) {
  console.error(output);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally {
  await browser?.close();
  await stop();
  rmSync(temp, { recursive: true, force: true });
}
