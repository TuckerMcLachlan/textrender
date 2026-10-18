import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
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

  await page.goto('http://127.0.0.1:5174/test');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const samples = await page.evaluate(() => window.__textRenderFrames);
  const sized = samples.find(sample => sample.width !== 300 || sample.height !== 150);
  const visible = samples.find(sample => sample.visibility === 'visible');

  assert.ok(sized, 'The renderer should size and draw its backing canvas.');
  assert.ok(visible, 'The rendered canvas should eventually become visible.');
  assert.ok(visible.frame > sized.frame, 'The backing canvas gets a paint frame before it is revealed.');
  assert.ok(samples.every(sample => sample.visibility !== 'visible' || sample.state === 'ready'),
    'The canvas is never visible while HTML fallback text is active.');
  assert.ok(samples.every(sample => sample.state !== 'ready' || sample.fill === 'rgba(0, 0, 0, 0)'),
    'HTML text becomes transparent in the same commit that reveals the canvas.');
  console.log('Initialization: hidden canvas handoff is paint-safe.');
} finally {
  await browser.close();
}
