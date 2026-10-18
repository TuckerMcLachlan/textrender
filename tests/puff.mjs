import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/test');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const lighting = await page.evaluate(async () => {
    const { TextRenderer } = await import('/src/lib/renderer.ts');
    const { maskWithDistance } = await import('/src/lib/distance.ts');
    const canvas = document.createElement('canvas');
    const options = { animated: false, speed: 1, intensity: 0.8, textureScale: 1, seed: 1, time: 0 };
    const renderer = new TextRenderer(canvas, document.querySelector('#fixture-text'), options, e => { throw e; });
    const image = new ImageData(480, 100);
    for (const cx of [50, 240, 430]) {
      for (let y = 0; y < 100; y++) for (let x = cx - 35; x <= cx + 35; x++) {
        const r = Math.hypot(x - cx, y - 50);
        if (r < 35 && r > 16) image.data[(y * 480 + x) * 4 + 3] = 255;
      }
    }
    renderer.setMask({ pixels: maskWithDistance(image, 1, 12), width: 480, height: 100, cssWidth: 480, cssHeight: 100, left: 0, top: 0, fontSize: 100, distanceRange: 12 });
    const gl = renderer.gl;
    const pixels = new Uint8Array(480 * 100 * 4);
    gl.readPixels(0, 0, 480, 100, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const stats = [50, 240, 430].map(cx => {
      const values = [];
      for (let y = 10; y < 90; y++) for (let x = cx - 36; x <= cx + 36; x++) {
        const i = (y * 480 + x) * 4;
        if (pixels[i + 3] > 250) values.push(pixels[i]);
      }
      return { min: Math.min(...values), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length, counter: pixels[(50 * 480 + cx) * 4 + 3] };
    });
    const square = new ImageData(480, 100);
    for (let y = 30; y < 70; y++) for (let x = 30; x < 70; x++) square.data[(y * 480 + x) * 4 + 3] = 255;
    // Include antialiased coverage to check zero preserves the exact glyph mask.
    square.data[(50 * 480 + 29) * 4 + 3] = 90;
    const mask = { pixels: maskWithDistance(square, 1, 12), width: 480, height: 100, cssWidth: 480, cssHeight: 100, left: 0, top: 0, fontSize: 100, distanceRange: 12 };
    const render = puffiness => {
      renderer.setOptions({ ...options, puffiness });
      renderer.setMask(mask);
      const out = new Uint8Array(pixels.length);
      gl.readPixels(0, 0, 480, 100, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return out;
    };
    const zero = render(0);
    const exactOutline = mask.pixels.every((v, i) => i % 4 !== 0 || v === zero[i + 3]);
    const levels = [0, 0.01, 0.25, 0.5, 1].map(p => render(p).reduce((sum, v, i) => sum + (i % 4 === 3 ? v : 0), 0));
    const full = render(1);
    const alpha = (x, y) => full[(y * 480 + x) * 4 + 3];
    const roundCorner = alpha(25, 40) > 240 && alpha(25, 25) < 100;
    const bounded = full.every((v, i) => i % 4 !== 3 || (i / 4 % 480 > 15 && i / 4 % 480 < 85) || v === 0);
    renderer.setOptions({ ...options, puffiness: 1, puffColor: '#22aa44' });
    renderer.setMask(mask);
    const tinted = new Uint8Array(pixels.length);
    gl.readPixels(0, 0, 480, 100, gl.RGBA, gl.UNSIGNED_BYTE, tinted);
    const tintedPixels = [];
    for (let i = 0; i < tinted.length; i += 4) if (tinted[i + 3] > 250) tintedPixels.push([tinted[i], tinted[i + 1], tinted[i + 2]]);
    const tintMean = tintedPixels.reduce((sum, pixel) => sum.map((value, channel) => value + pixel[channel]), [0, 0, 0]).map(value => value / tintedPixels.length);
    renderer.setOptions({
      ...options,
      puffiness: 1,
      shadowColor: '#ff0000',
      secondaryShadowColor: '#00ff00',
      highlightColor: '#0000ff',
      puffSettings: { secondaryShadowStrength: 0.75 },
    });
    renderer.setMask(mask);
    const shadowUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffShadowColor')));
    const secondaryShadowUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffSecondaryShadowColor')));
    const secondaryShadowStrengthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffSecondaryShadowStrength'));
    const highlightUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffHighlightColor')));
    renderer.setOptions({ ...options, puffiness: 0, puffSettings: { cornerRoundness: 1 } });
    renderer.setMask(mask);
    const cornerRoundnessUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffCornerRoundness'));
    renderer.dispose();
    return {
      stats, exactOutline, levels, roundCorner, bounded, tintMean, shadowUniform,
      secondaryShadowUniform, secondaryShadowStrengthUniform, highlightUniform, cornerRoundnessUniform,
    };
  });
  assert.ok(lighting.exactOutline, 'Zero puffiness preserves original antialiased coverage exactly');
  assert.ok(lighting.levels.every((v, i, a) => i === 0 || v > a[i - 1]), 'Coverage increases with puffiness');
  assert.ok(lighting.roundCorner, 'Expanded corners are round, not square');
  assert.ok(lighting.bounded, 'Expansion remains bounded');
  assert.ok(lighting.tintMean[1] > lighting.tintMean[0] * 2 && lighting.tintMean[1] > lighting.tintMean[2] * 1.5, 'Puff base colour tints the rendered material');
  assert.deepEqual(lighting.shadowUniform, [1, 0, 0], 'Puff shadow colour reaches the shader');
  assert.deepEqual(lighting.secondaryShadowUniform, [0, 1, 0], 'Puff secondary shadow colour reaches the shader');
  assert.equal(lighting.secondaryShadowStrengthUniform, 0.75, 'Puff secondary shadow strength reaches the shader');
  assert.deepEqual(lighting.highlightUniform, [0, 0, 1], 'Puff highlight colour reaches the shader');
  assert.equal(lighting.cornerRoundnessUniform, 1, 'Puff corner roundness reaches the shader');
  for (const glyph of lighting.stats) {
    assert.ok(glyph.max - glyph.min > 40, 'Each glyph has visible dimensional shading');
    assert.equal(glyph.counter, 0, 'Counters remain open');
  }
  assert.ok(Math.max(...lighting.stats.map(g => g.mean)) - Math.min(...lighting.stats.map(g => g.mean)) < 3, 'Lighting is uniform across distant glyphs');
  assert.equal(await page.getByTestId('errors').textContent(), '');
  assert.deepEqual(errors, []);
  console.log('Puff: all glyphs shaded, counters open, picker working.', lighting);
} finally {
  await browser.close();
}
