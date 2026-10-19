import assert from 'node:assert/strict';
import { expect, test } from '@playwright/test';

const typographyError = 'This typography is outside the initial ShaderText support; displaying HTML text.';

async function expectStableFallback(page, count) {
  const host = page.locator('#fixture-text');
  const messages = Array(count).fill(typographyError).join('\n');
  await expect(host).toHaveAttribute('data-shader-state', 'fallback');
  await expect(page.getByTestId('errors')).toHaveText(messages);
  // Include several typography polls and the rerender triggered by onError.
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('errors')).toHaveText(messages);
  await expect(host).not.toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
  await expect(host.locator('canvas')).toHaveCSS('visibility', 'hidden');
}

test('unchanged failures stop after onError rerenders, while changed text can retry and recover', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/test');
  await expect(page.locator('#fixture-text')).toHaveAttribute('data-shader-state', 'ready');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Unsupported\ttext');
  await expectStableFallback(page, 1);

  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Different\ttext');
  await expectStableFallback(page, 2);

  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Supported text');
  await expect(page.locator('#fixture-text')).toHaveAttribute('data-shader-state', 'ready');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Different\ttext');
  await expectStableFallback(page, 3);
  assert.deepEqual(errors, []);
});

test('computed typography changes and font events allow a fresh attempt', async ({ page }) => {
  await page.goto('/test');
  await expect(page.locator('#fixture-text')).toHaveAttribute('data-shader-state', 'ready');
  const style = await page.addStyleTag({ content: '#fixture-text { hyphens: auto; }' });
  await expectStableFallback(page, 1);

  await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
  await expectStableFallback(page, 2);

  await style.evaluate(element => { element.textContent = '#fixture-text { hyphens: manual; }'; });
  await expect(page.locator('#fixture-text')).toHaveAttribute('data-shader-state', 'ready');
  await style.evaluate(element => { element.textContent = '#fixture-text { hyphens: auto; }'; });
  await expectStableFallback(page, 3);
});
