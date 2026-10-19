import assert from 'node:assert/strict';
import { test } from '@playwright/test';

test('static rendering draws only for changed inputs and retains deferred updates', async ({ page }) => {
  await page.goto('/test');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const result = await page.evaluate(async () => {
    const { TextRenderer } = await import('/src/lib/renderer.ts');
    const originalObserver = window.IntersectionObserver;
    let intersect;
    let disconnected = false;
    window.IntersectionObserver = class {
      constructor(callback) { intersect = visible => callback([{ isIntersecting: visible }]); }
      observe() {}
      disconnect() { disconnected = true; }
    };
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    const visibility = value => {
      hidden = value;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    const canvas = document.createElement('canvas');
    const host = document.querySelector('#fixture-text');
    const errors = [];
    let renderer;
    try {
      renderer = new TextRenderer(canvas, host, {}, error => errors.push(error.message));
      const gl = renderer.gl;
      const draw = gl.drawArrays.bind(gl);
      let draws = 0;
      gl.drawArrays = (...args) => { draws++; draw(...args); };
      const settle = async () => {
        for (let i = 0; i < 4; i++) await new Promise(resolve => requestAnimationFrame(resolve));
      };
      const mask = {
        pixels: new Uint8Array(16 * 16 * 4).fill(255), width: 16, height: 16,
        cssWidth: 16, cssHeight: 16, left: 0, top: 0, scaleX: 1, scaleY: 1,
        fontSize: 16, distanceRange: 2,
      };
      const counts = {};
      renderer.setMask(mask);
      counts.initial = draws;
      await settle();
      counts.idle = draws;
      renderer.setOptions({ puff: 0.7 });
      renderer.setOptions({ puff: 0.8 });
      renderer.setOptions({ puff: 0.9 });
      await settle();
      counts.coalesced = draws;
      renderer.setOptions({ puff: 0.9 });
      intersect(false); intersect(true);
      visibility(true); visibility(false);
      await settle();
      counts.unchanged = draws;
      renderer.setOptions({ puff: 0.6 });
      renderer.setMask(mask);
      counts.maskImmediate = draws;
      await settle();
      counts.maskSettled = draws;
      // Hiding cancels an already queued draw, but retains the changed input.
      renderer.setOptions({ puff: 0.4 });
      intersect(false);
      await settle();
      counts.offscreen = draws;
      intersect(true);
      await settle();
      counts.returned = draws;
      visibility(true);
      renderer.setOptions({ puff: 0.3 });
      await settle();
      counts.hidden = draws;
      visibility(false);
      await settle();
      counts.shown = draws;
      // Scheduled draw errors continue to reach the fallback callback.
      gl.drawArrays = () => { throw new Error('scheduled draw failed'); };
      renderer.setOptions({ puff: 0.2 });
      await settle();
      gl.drawArrays = (...args) => { draws++; draw(...args); };
      renderer.setOptions({ puff: 0.1 });
      renderer.dispose();
      await settle();
      counts.disposed = draws;
      return { counts, errors, disconnected };
    } finally {
      renderer?.dispose();
      window.IntersectionObserver = originalObserver;
      if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
      else delete document.hidden;
    }
  });
  assert.deepEqual(result.counts, {
    initial: 1, idle: 1, coalesced: 2, unchanged: 2,
    maskImmediate: 3, maskSettled: 3, offscreen: 3, returned: 4,
    hidden: 4, shown: 5, disposed: 5,
  });
  assert.deepEqual(result.errors, ['scheduled draw failed']);
  assert.equal(result.disconnected, true);
});

test('context restoration draws a fresh mask and then becomes idle', async ({ page }) => {
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    window.__rendererDraws = new WeakMap();
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      const counts = window.__rendererDraws;
      counts.set(this.canvas, (counts.get(this.canvas) ?? 0) + 1);
      return draw.apply(this, args);
    };
  });
  await page.goto('/test');
  const host = page.locator('#fixture-text');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  await host.locator('canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('WEBGL_lose_context is required for this test.');
    window.__restoreRendererContext = () => extension.restoreContext();
    extension.loseContext();
  });
  await page.locator('#fixture-text[data-shader-state="fallback"]').waitFor();
  const before = await host.locator('canvas').evaluate(canvas => window.__rendererDraws.get(canvas));
  await page.evaluate(() => window.__restoreRendererContext());
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const counts = await host.locator('canvas').evaluate(async canvas => {
    const restored = window.__rendererDraws.get(canvas);
    for (let i = 0; i < 4; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    return { restored, settled: window.__rendererDraws.get(canvas) };
  });
  assert.ok(counts.restored > before, 'Restoration draws a new backing buffer.');
  assert.equal(counts.settled, counts.restored, 'The restored renderer does not keep drawing.');
});
