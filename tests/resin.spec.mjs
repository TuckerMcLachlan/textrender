import assert from 'node:assert/strict';
import { test } from '@playwright/test';

test('resin renders with WebGL2 across the browser project', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/test');
  await page.locator('#fixture-text[data-shader-state="ready"]').waitFor();
  const lighting = await page.evaluate(async () => {
    const { TextRenderer } = await import('/src/lib/renderer.ts');
    const { maskWithDistance } = await import('/src/lib/distance.ts');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) throw new Error('WebGL2 is unavailable in this browser project.');
    const options = {};
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
    const render = puff => {
      renderer.setOptions({ ...options, puff });
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
    const roundCorner = alpha(27, 40) > 200 && alpha(27, 27) < 100;
    const bounded = full.every((v, i) => i % 4 !== 3 || (i / 4 % 480 > 15 && i / 4 % 480 < 85) || v === 0);
    renderer.setOptions({ ...options, puff: 1, baseColor: '#22aa44' });
    renderer.setMask(mask);
    const tinted = new Uint8Array(pixels.length);
    gl.readPixels(0, 0, 480, 100, gl.RGBA, gl.UNSIGNED_BYTE, tinted);
    const tintedPixels = [];
    for (let i = 0; i < tinted.length; i += 4) if (tinted[i + 3] > 250) tintedPixels.push([tinted[i], tinted[i + 1], tinted[i + 2]]);
    const tintMean = tintedPixels.reduce((sum, pixel) => sum.map((value, channel) => value + pixel[channel]), [0, 0, 0]).map(value => value / tintedPixels.length);
    renderer.setOptions({
      ...options,
      puff: 1,
      shadowColor: '#ff0000',
      bounceShadowColor: '#00ff00',
      highlightColor: '#0000ff',
      bounceStrength: 0.75,
    });
    renderer.setMask(mask);
    const shadowUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffShadowColor')));
    const secondaryShadowUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffSecondaryShadowColor')));
    const secondaryShadowStrengthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffSecondaryShadowStrength'));
    const highlightUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffHighlightColor')));
    renderer.setOptions({ ...options, puff: 1, roundness: 1 });
    renderer.setMask(mask);
    const roundnessUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffRoundness'));
    const expansionUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffExpansion'));
    const fullpuffUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puff'));
    renderer.setOptions({ ...options, depth: 0, smoothing: 0, lightX: 0, lightY: 0, lightZ: 0, highlightSize: 0 });
    renderer.setMask(mask);
    const minimumDepthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffDepth'));
    const minimumSmoothingUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffNormalSmoothing'));
    const minimumLightUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffKeyLight')));
    const maximumHighlightSizeUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffHighlightSize'));
    renderer.setOptions({ ...options, depth: 1, smoothing: 1, lightX: 0, lightY: 0, lightZ: 1, highlightSize: 1 });
    renderer.setMask(mask);
    const maximumDepthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffDepth'));
    const maximumSmoothingUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffNormalSmoothing'));
    const maximumLightUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffKeyLight')));
    const minimumHighlightSizeUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffHighlightSize'));
    renderer.setOptions({ ...options, depth: -1, smoothing: 2, lightX: 0, lightY: 0, lightZ: 2, highlightSize: -1 });
    renderer.setMask(mask);
    const clampedDepthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffDepth'));
    const clampedSmoothingUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffNormalSmoothing'));
    const clampedLightUniform = Array.from(gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffKeyLight')));
    const clampedHighlightSizeUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffHighlightSize'));
    const grainStrengthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffGrainStrength'));
    const rimStrengthUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffRimStrength'));
    renderer.setOptions({ ...options, puff: 0 });
    renderer.setMask(mask);
    const zeroExpansionUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puffExpansion'));
    const zeropuffUniform = gl.getUniform(renderer.program, gl.getUniformLocation(renderer.program, 'u_puff'));
    renderer.dispose();
    return {
      webgl2: Boolean(context),
      stats, exactOutline, levels, roundCorner, bounded, tintMean, shadowUniform,
      secondaryShadowUniform, secondaryShadowStrengthUniform, highlightUniform, roundnessUniform,
      expansionUniform, fullpuffUniform, zeroExpansionUniform, zeropuffUniform, grainStrengthUniform, rimStrengthUniform,
      minimumDepthUniform, minimumSmoothingUniform, minimumLightUniform, maximumHighlightSizeUniform,
      maximumDepthUniform, maximumSmoothingUniform, maximumLightUniform, minimumHighlightSizeUniform,
      clampedDepthUniform, clampedSmoothingUniform, clampedLightUniform, clampedHighlightSizeUniform,
    };
  });
  assert.equal(lighting.webgl2, true, 'The browser project must provide WebGL2.');
  assert.ok(lighting.exactOutline, 'Zero puff preserves original antialiased coverage exactly');
  assert.ok(lighting.levels.every((v, i, a) => i === 0 || v > a[i - 1]), 'Coverage increases with puff');
  assert.ok(lighting.roundCorner, 'Expanded corners are round, not square');
  assert.ok(lighting.bounded, 'Expansion remains bounded');
  assert.ok(lighting.tintMean[1] > lighting.tintMean[0] * 2 && lighting.tintMean[1] > lighting.tintMean[2] * 1.5, 'Resin base colour tints the rendered material');
  assert.deepEqual(lighting.shadowUniform, [1, 0, 0], 'Resin shadow colour reaches the shader');
  assert.deepEqual(lighting.secondaryShadowUniform, [0, 1, 0], 'Resin secondary shadow colour reaches the shader');
  assert.equal(lighting.secondaryShadowStrengthUniform, 0.75, 'Resin secondary shadow strength reaches the shader');
  assert.deepEqual(lighting.highlightUniform, [0, 0, 1], 'Resin highlight colour reaches the shader');
  assert.equal(lighting.roundnessUniform, 1, 'Resin roundness reaches the shader');
  assert.equal(lighting.minimumDepthUniform, 0, 'Normalized depth maps to zero');
  assert.ok(Math.abs(lighting.minimumSmoothingUniform - 0.025) < 1e-6, 'Normalized smoothing maps to its minimum');
  assert.deepEqual(lighting.minimumLightUniform, [0, 0, 0], 'Normalized light height maps to zero');
  assert.equal(lighting.maximumHighlightSizeUniform, 40, 'Normalized highlight size zero maps to exponent 40');
  assert.ok(Math.abs(lighting.maximumDepthUniform - 0.2) < 1e-6, 'Normalized depth one maps to 0.2');
  assert.ok(Math.abs(lighting.maximumSmoothingUniform - 0.06) < 1e-6, 'Normalized smoothing one maps to 0.06');
  assert.deepEqual(lighting.maximumLightUniform, [0, 0, 0.5], 'Normalized light height one maps to 0.5');
  assert.equal(lighting.minimumHighlightSizeUniform, 5, 'Normalized highlight size one maps to exponent 5');
  assert.equal(lighting.clampedDepthUniform, 0, 'Depth clamps below zero');
  assert.ok(Math.abs(lighting.clampedSmoothingUniform - 0.06) < 1e-6, 'Smoothing clamps above one');
  assert.deepEqual(lighting.clampedLightUniform, [0, 0, 0.5], 'Light height clamps above one');
  assert.equal(lighting.clampedHighlightSizeUniform, 40, 'Highlight size clamps below zero');
  assert.ok(Math.abs(lighting.expansionUniform * lighting.fullpuffUniform - 0.035) < 1e-6, 'puff maps to at most 0.035em expansion');
  assert.equal(lighting.zeroExpansionUniform * lighting.zeropuffUniform, 0, 'Zero puff maps to zero expansion');
  assert.equal(lighting.grainStrengthUniform, 0, 'Resin grain is fixed at zero');
  assert.equal(lighting.rimStrengthUniform, 0, 'Resin rim lighting is fixed at zero');
  for (const glyph of lighting.stats) {
    assert.ok(glyph.max - glyph.min > 40, 'Each glyph has visible dimensional shading');
    assert.equal(glyph.counter, 0, 'Counters remain open');
  }
  assert.ok(Math.max(...lighting.stats.map(g => g.mean)) - Math.min(...lighting.stats.map(g => g.mean)) < 3, 'Lighting is uniform across distant glyphs');
  assert.equal(await page.getByTestId('errors').textContent(), '');
  assert.deepEqual(errors, []);
});
