import { expect, test } from '@playwright/test';

test('adjacent TextRender spans preserve inline flow and reflow', async ({ page }) => {
  await page.goto('/test');
  const fixture = page.locator('#inline-fixture');
  const first = page.locator('#inline-first[data-shader-state="ready"]');
  const second = page.locator('#inline-second[data-shader-state="ready"]');
  await first.waitFor();
  await second.waitFor();

  const inspect = () => page.evaluate(() => {
    const measure = (id: string) => {
      const host = document.querySelector<HTMLElement>(id)!;
      const text = host.firstChild!;
      const range = document.createRange();
      range.selectNodeContents(text);
      const fragments = Array.from(range.getClientRects(), rect => ({
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      }));
      const canvas = host.querySelector('canvas')!.getBoundingClientRect();
      return {
        display: getComputedStyle(host).display,
        fragments,
        canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom },
      };
    };
    return { first: measure('#inline-first'), second: measure('#inline-second') };
  });

  const initial = await inspect();
  expect(initial.first.display).toBe('inline');
  expect(initial.second.display).toBe('inline');
  expect(initial.second.fragments.length).toBeGreaterThan(1);
  expect(Math.abs(initial.first.fragments[0].top - initial.second.fragments[0].top)).toBeLessThan(1);
  for (const fragment of initial.second.fragments) {
    expect(initial.second.canvas.left).toBeLessThanOrEqual(fragment.left);
    expect(initial.second.canvas.right).toBeGreaterThanOrEqual(fragment.right);
    expect(initial.second.canvas.top).toBeLessThanOrEqual(fragment.top);
    expect(initial.second.canvas.bottom).toBeGreaterThanOrEqual(fragment.bottom);
  }

  await fixture.evaluate(element => { element.style.width = '420px'; });
  await expect.poll(async () => (await inspect()).second.fragments.length)
    .toBeGreaterThan(initial.second.fragments.length);
  await expect.poll(async () => {
    const { second: current } = await inspect();
    return current.fragments.every(fragment =>
      current.canvas.left <= fragment.left && current.canvas.right >= fragment.right &&
      current.canvas.top <= fragment.top && current.canvas.bottom >= fragment.bottom);
  }).toBe(true);
  const reflowed = await inspect();
  for (const fragment of reflowed.second.fragments) {
    expect(reflowed.second.canvas.left).toBeLessThanOrEqual(fragment.left);
    expect(reflowed.second.canvas.right).toBeGreaterThanOrEqual(fragment.right);
    expect(reflowed.second.canvas.top).toBeLessThanOrEqual(fragment.top);
    expect(reflowed.second.canvas.bottom).toBeGreaterThanOrEqual(fragment.bottom);
  }
});
