import assert from 'node:assert/strict';
import { test } from '@playwright/test';

const missingFeatures = [
  'ResizeObserver',
  'IntersectionObserver',
  'MutationObserver',
  'Intl.Segmenter',
  'Font Loading API',
  'WebGL2',
  'Canvas 2D',
];

for (const feature of missingFeatures) {
  test(`falls back to HTML when ${feature} is unavailable`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ feature: missing }) => {
      if (missing === 'Intl.Segmenter') {
        Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });
      } else if (missing === 'Font Loading API') {
        Object.defineProperty(Document.prototype, 'fonts', { configurable: true, get: () => undefined });
      } else if (missing === 'WebGL2' || missing === 'Canvas 2D') {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if ((missing === 'WebGL2' && kind === 'webgl2') || (missing === 'Canvas 2D' && kind === '2d')) return null;
          return getContext.call(this, kind, ...args);
        };
      } else {
        Object.defineProperty(window, missing, { configurable: true, value: undefined });
      }
    }, { feature });
    await page.goto('/test');
    const fallback = page.locator('#fixture-text[data-shader-state="fallback"]');
    await fallback.waitFor();
    assert.notEqual(await fallback.evaluate(element => getComputedStyle(element).color), 'rgba(0, 0, 0, 0)',
      'HTML text remains visible during fallback.');
    assert.equal(await fallback.locator('canvas').evaluate(canvas => getComputedStyle(canvas).visibility), 'hidden',
      'The shader canvas remains hidden during fallback.');
    assert.notEqual(await page.getByTestId('errors').textContent(), '',
      'The compatibility failure is reported through onError.');
    assert.deepEqual(errors, [], 'Compatibility failures do not escape as page errors.');
  });
}
