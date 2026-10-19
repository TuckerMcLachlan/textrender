import assert from 'node:assert/strict';
import { test } from '@playwright/test';

test('initialization hands off from HTML text to the WebGL canvas safely', async ({ page }) => {
  await page.addInitScript(() => {
    window.__textRenderFrames = [];
    let frame = 0;
    const sample = () => {
      for (const host of document.querySelectorAll('[data-shader-state]')) {
        const canvas = host.querySelector('canvas');
        if (!canvas) continue;
        window.__textRenderFrames.push({
          frame,
          state: host.dataset.shaderState,
          visibility: getComputedStyle(canvas).visibility,
          opacity: getComputedStyle(canvas).opacity,
          fill: getComputedStyle(host).webkitTextFillColor,
          width: canvas.width,
          height: canvas.height,
        });
      }
      frame++;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.goto('/test');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const samples = await page.evaluate(() => window.__textRenderFrames);
  const sized = samples.find(sample => sample.width !== 300 || sample.height !== 150);
  const visible = samples.find(sample => sample.visibility === 'visible');
  const pending = samples.find(sample => sample.state === 'pending');

  assert.ok(sized, 'The renderer should size and draw its backing canvas.');
  assert.ok(visible, 'The rendered canvas should eventually become visible.');
  assert.ok(visible.frame > sized.frame, 'The backing canvas gets a paint frame before it is revealed.');
  assert.ok(pending, 'The component exposes a pending state during initialization.');
  assert.equal(pending.fill, 'rgba(0, 0, 0, 0)', 'Child text is hidden while the shader is pending.');
  assert.ok(samples.every(sample => sample.visibility !== 'visible' || sample.state === 'ready'),
    'The canvas is never visible while HTML fallback text is active.');
  assert.ok(samples.every(sample => sample.state !== 'ready' || sample.fill === 'rgba(0, 0, 0, 0)'),
    'HTML text becomes transparent in the same commit that reveals the canvas.');
  assert.ok(samples.some(sample => sample.state === 'ready' && Number(sample.opacity) < 1),
    'The shader canvas begins with a transparent opacity during its fade-in.');
  const fallback = page.locator('#shader-fallback[data-shader-state="fallback"]');
  await fallback.waitFor();
  assert.notEqual(await fallback.evaluate(element => getComputedStyle(element).color), 'rgba(0, 0, 0, 0)',
    'Child text is visible when shader rendering fails.');
  assert.equal(await fallback.locator('canvas').evaluate(canvas => getComputedStyle(canvas).visibility), 'hidden',
    'The canvas remains hidden when shader rendering fails.');
});
