// Exact squared Euclidean distance transform, separable in O(width * height).
// Lower envelopes of parabolas; finite INF avoids Infinity - Infinity for empty rows.
function transform1D(f: Float64Array, d: Float64Array, n: number, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}
function edt(grid: Float64Array, w: number, h: number) {
  const size = Math.max(w, h);
  const f = new Float64Array(size), d = new Float64Array(size);
  const v = new Int32Array(size), z = new Float64Array(size + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    transform1D(f, d, h, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    transform1D(f, d, w, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}
/** R: original antialiased coverage. G: signed distance (positive inside), 0.5 at edge. */
export function maskWithDistance(image: ImageData, pixelRatio: number, range: number): Uint8Array {
  const { width: w, height: h, data } = image;
  const inside = new Float64Array(w * h), outside = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] / 255;
    if (a === 1) {
      inside[i] = 1e12;
      outside[i] = 0;
    } else if (a === 0) {
      inside[i] = 0;
      outside[i] = 1e12;
    } else {
      // Seed partially covered pixels with their subpixel distance from the
      // 50% contour. Thresholding them here makes diagonal and curved edges
      // inherit the source bitmap's stair steps before the shader can AA them.
      const offset = a - 0.5;
      inside[i] = Math.max(0, offset) ** 2;
      outside[i] = Math.max(0, -offset) ** 2;
    }
  }
  edt(inside, w, h); edt(outside, w, h);
  const result = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    // Typed-array textures have no unpack Y flip: store bottom row first.
    const j = ((h - 1 - y) * w + x) * 4;
    const signed = (Math.sqrt(inside[i]) - Math.sqrt(outside[i])) / pixelRatio;
    result[j] = data[i * 4 + 3];
    result[j + 1] = Math.round(Math.max(0, Math.min(1, 0.5 + signed / (2 * range))) * 255);
    result[j + 3] = 255;
  }
  return result;
}
