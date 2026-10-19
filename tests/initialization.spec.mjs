import assert from 'node:assert/strict';
import { expect, test } from '@playwright/test';

const transparent = 'rgba(0, 0, 0, 0)';

async function prepare(page, { blockTransition = false, loseDuringFade = false } = {}) {
  await page.addInitScript(({ blockTransition, loseDuringFade }) => {
    let release;
    let released = false;
    const gate = new Promise(resolve => { release = resolve; });
    const ready = document.fonts.ready;
    Object.defineProperty(document.fonts, 'ready', { get: () => ready.then(() => gate) });
    document.fonts.addEventListener('loadingdone', event => {
      if (!released) event.stopImmediatePropagation();
    });
    window.__releaseFonts = () => { released = true; release(); };
    if (blockTransition) document.addEventListener('transitionend', event => event.stopImmediatePropagation(), true);
    window.__textRenderFrames = [];
    let frame = 0;
    let lost = false;
    const sample = () => {
      const host = document.querySelector('#fixture-text');
      const canvas = host?.querySelector('canvas');
      if (canvas) {
        const style = getComputedStyle(canvas);
        window.__textRenderFrames.push({
          frame, state: host.dataset.shaderState, visibility: style.visibility,
          opacity: Number(style.opacity), fill: getComputedStyle(host).webkitTextFillColor,
          width: canvas.width, height: canvas.height,
        });
        if (loseDuringFade && !lost && host.dataset.shaderState === 'ready' && Number(style.opacity) < 1) {
          lost = true;
          const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
          window.__restoreContext = () => extension.restoreContext();
          extension.loseContext();
        }
      }
      frame++;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, { blockTransition, loseDuringFade });
  await page.goto('/test');
  await page.locator('#fixture-text[data-shader-state="pending"]').waitFor();
}

async function finish(page) {
  await expect(page.locator('#fixture-text')).toHaveCSS('-webkit-text-fill-color', transparent);
  await expect(page.locator('#fixture-text canvas')).toHaveCSS('opacity', '1');
  // Let the frame sampler observe the completed React commit.
  return page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    return window.__textRenderFrames;
  });
}

test('initialization keeps HTML readable through a delayed startup and shader fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page);
  await expect(page.locator('#fixture-text')).not.toHaveCSS('-webkit-text-fill-color', transparent);
  // Remain pending longer than the fade fallback timer.
  await page.waitForTimeout(300);
  await expect(page.locator('#fixture-text')).toHaveAttribute('data-shader-state', 'pending');
  await expect(page.locator('#fixture-text canvas')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('#fixture-text')).not.toHaveCSS('-webkit-text-fill-color', transparent);
  await page.evaluate(() => window.__releaseFonts());
  const samples = await finish(page);
  const sized = samples.find(sample => sample.width !== 300 || sample.height !== 150);
  const visible = samples.find(sample => sample.visibility === 'visible');
  assert.ok(sized && visible && visible.frame > sized.frame, 'Draw the backing canvas before revealing it.');
  assert.ok(samples.some(sample => sample.state === 'ready' && sample.opacity < 1), 'Preserve the canvas fade.');
  assert.ok(samples.every(sample => sample.state !== 'pending' || sample.fill !== transparent), 'Pending HTML stays readable.');
  assert.ok(samples.every(sample => sample.state !== 'ready' || sample.opacity === 1 || sample.fill !== transparent),
    'HTML remains visible beneath the canvas throughout the fade.');
  assert.ok(samples.every(sample => sample.visibility !== 'visible' || sample.state === 'ready'));
  const fallback = page.locator('#shader-fallback[data-shader-state="fallback"]');
  await expect(fallback).not.toHaveCSS('-webkit-text-fill-color', transparent);
  await expect(fallback.locator('canvas')).toHaveCSS('visibility', 'hidden');
});

test('reduced motion swaps directly to an opaque canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page);
  await page.evaluate(() => window.__releaseFonts());
  const samples = await finish(page);
  assert.ok(samples.every(sample => sample.state !== 'ready' || (sample.opacity === 1 && sample.fill === transparent)));
});

test('enabling reduced motion during a fade completes the handoff', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page);
  // Hold the CSS transition open so the preference change definitely happens mid-fade.
  await page.addStyleTag({ content: '#fixture-text canvas { transition-duration: 10s !important; }' });
  await page.evaluate(() => window.__releaseFonts());
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  await expect(page.locator('#fixture-text')).not.toHaveCSS('-webkit-text-fill-color', transparent);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finish(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#fixture-text')).toHaveCSS('-webkit-text-fill-color', transparent);
});

test('missing transition events still complete the fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page, { blockTransition: true });
  await page.addStyleTag({ content: '#fixture-text canvas { transition-duration: 10s !important; }' });
  await page.evaluate(() => window.__releaseFonts());
  await finish(page);
});

test('unmounting during the fade cancels the old handoff', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page);
  await page.addStyleTag({ content: '#fixture-text canvas { transition-duration: 10s !important; }' });
  await page.evaluate(() => window.__releaseFonts());
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  await page.getByRole('button', { name: 'Mount', exact: true }).click();
  await expect(page.locator('#fixture-text')).toHaveCount(0);
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Mount', exact: true }).click();
  await finish(page);
  assert.deepEqual(errors, []);
});

test('context loss during a fade restores HTML and safely repeats the handoff', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page, { loseDuringFade: true });
  await page.evaluate(() => window.__releaseFonts());
  await page.locator('#fixture-text[data-shader-state="fallback"]').waitFor();
  // A late transition event and the old timeout must not hide fallback text.
  await page.locator('#fixture-text canvas').evaluate(canvas => {
    canvas.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }));
  });
  await page.waitForTimeout(250);
  await expect(page.locator('#fixture-text')).not.toHaveCSS('-webkit-text-fill-color', transparent);
  await expect(page.locator('#fixture-text canvas')).toHaveCSS('visibility', 'hidden');
  await page.evaluate(() => window.__restoreContext());
  const samples = await finish(page);
  const restored = samples.slice(samples.findLastIndex(sample => sample.state === 'fallback') + 1);
  assert.ok(restored.some(sample => sample.state === 'ready' && sample.opacity < 1 && sample.fill !== transparent),
    'Restoration resets the handoff and keeps HTML visible during the new fade.');
});
