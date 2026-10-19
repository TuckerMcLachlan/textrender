import { expect, test } from '@playwright/test';

for (const kerning of ['auto', 'normal', 'none']) {
  test(`mask word positions match HTML with ${kerning} kerning`, async ({ page }) => {
    await page.goto('/test');
    await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
    const result = await page.evaluate(async (kerning) => {
      const { createTextMask } = await import('/src/lib/typography.ts');
      const host = document.createElement('span');
      host.textContent = 'typography for the web';
      Object.assign(host.style, {
        fontFamily: 'Space Grotesk', fontSize: '96px', fontWeight: '700',
        letterSpacing: '-3px', fontKerning: kerning, whiteSpace: 'normal',
      });
      const container = document.createElement('div');
      container.style.width = '800px';
      container.append(host);
      document.body.append(container);
      await document.fonts.ready;
      const offsets = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        // Compare positions inside the exact shaped line sent to the mask.
        for (const word of ['for', 'the']) {
          const index = text.indexOf(word);
          if (index < 0) continue;
          const lineStart = host.textContent.indexOf(text);
          const range = document.createRange();
          range.setStart(host.firstChild, lineStart);
          range.setEnd(host.firstChild, lineStart + 1);
          const left = range.getBoundingClientRect().left;
          range.setStart(host.firstChild, lineStart + index);
          range.setEnd(host.firstChild, lineStart + index + word.length);
          const domOffset = range.getBoundingClientRect().left - left;
          offsets.push({ word, error: Math.abs(this.measureText(text.slice(0, index)).width - domOffset) });
        }
        return original.call(this, text, ...args);
      };
      try {
        createTextMask(host, 4096);
        return offsets;
      } finally {
        CanvasRenderingContext2D.prototype.fillText = original;
        container.remove();
      }
    }, kerning);
    expect(result.map(value => value.word)).toEqual(['for', 'the']);
    for (const value of result) expect(value.error, `${value.word} offset`).toBeLessThan(0.1);
  });
}
