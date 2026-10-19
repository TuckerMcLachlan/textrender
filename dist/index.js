var ae = Object.defineProperty;
var le = (o, e, t) => e in o ? ae(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var S = (o, e, t) => le(o, typeof e != "symbol" ? e + "" : e, t);
import { jsx as ue } from "react/jsx-runtime";
import { useRef as H, useState as J, isValidElement as Q, version as fe, useCallback as ce, useEffect as B, cloneElement as he } from "react";
const de = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`, ge = (o, e = !1) => `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform vec2 u_cssSize;
uniform float u_fontSize;
uniform float u_distanceRange;
uniform float u_time;
uniform float u_intensity;
uniform float u_textureScale;
uniform float u_seed;
uniform float u_puff;
uniform vec3 u_puffColor;
uniform vec3 u_puffShadowColor;
uniform vec3 u_puffSecondaryShadowColor;
uniform vec3 u_puffHighlightColor;
uniform float u_puffRoundness;
uniform float u_puffExpansion;
uniform float u_puffDepth;
uniform float u_puffNormalSmoothing;
uniform float u_puffGrainStrength;
uniform vec3 u_puffKeyLight;
uniform float u_puffHighlightSize;
uniform float u_puffRimStrength;
uniform float u_puffGloss;
uniform float u_puffBrightness;
uniform float u_puffSecondaryShadowStrength;
struct Surface { vec2 uv; vec2 p; vec3 normal; float depth; float time; };
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
    mix(hash(i + vec2(0, 1)), hash(i + 1.0), u.x), u.y);
}
float distanceAt(vec2 uv) { return (texture(u_mask, uv).g - 0.5) * 2.0 * u_distanceRange; }
${o}
void main() {
  float alpha = texture(u_mask, v_uv).r;
  ${e ? "" : "if (alpha < 0.005) { outColor = vec4(0.0); return; }"}
  // A wider derivative footprint smooths raster stair steps before specular lighting.
  float footprint = max(1.5, u_fontSize * 0.018);
  vec2 texel = vec2(footprint) / u_cssSize;
  float depth = max(0.0, distanceAt(v_uv));
  vec2 grad = vec2(distanceAt(v_uv + vec2(texel.x, 0)), distanceAt(v_uv + vec2(0, texel.y)))
    - vec2(distanceAt(v_uv - vec2(texel.x, 0)), distanceAt(v_uv - vec2(0, texel.y)));
  grad /= 2.0 * footprint;
  float bevel = max(1.0, u_fontSize * 0.065);
  float edge = 1.0 - smoothstep(0.0, bevel, depth);
  vec3 normal = normalize(vec3(-grad * edge * 1.8, 1.0));
  Surface s = Surface(v_uv, vec2(v_uv.x, 1.0 - v_uv.y) * u_cssSize / u_fontSize * u_textureScale + vec2(u_seed * 3.17, u_seed * 1.91), normal, depth, u_time);
  ${e ? "vec4 result = material(s); alpha = clamp(result.a, 0.0, 1.0); vec3 col = max(result.rgb, vec3(0.0));" : "vec3 col = max(material(s), vec3(0.0));"}
  outColor = vec4(col * alpha, alpha);
}`, c = {
  id: "resin",
  label: "Resin",
  defaults: {
    puff: 0.5,
    baseColor: "#111111",
    shadowColor: "#000000",
    bounceShadowColor: "#000000",
    highlightColor: "#ffffff",
    roundness: 0,
    depth: 0.5,
    smoothing: 0,
    lightX: -0.65,
    lightY: 0.85,
    lightZ: 1,
    highlightSize: 18 / 35,
    gloss: 0.16,
    brightness: 0.4,
    bounceStrength: 0
  },
  fragment: `
// Filter the outline as well as the normals so raster steps don't become seams.
float puffDistance(vec2 uv) {
  vec2 e = vec2(max(0.7, u_fontSize * 0.008)) / u_cssSize;
  return (distanceAt(uv) * 4.0
    + distanceAt(uv + vec2(e.x, 0.0)) + distanceAt(uv - vec2(e.x, 0.0))
    + distanceAt(uv + vec2(0.0, e.y)) + distanceAt(uv - vec2(0.0, e.y))) / 8.0;
}
// Smooth the signed-distance field before thresholding it. A balanced circular
// ring avoids the axial bumps produced by a sparse cross/diagonal kernel.
float puffRoundedDistance(vec2 uv) {
  float baseRadius = max(0.7, u_fontSize * 0.008);
  float sampleRadius = mix(baseRadius, u_fontSize * 0.055, u_puffRoundness);
  vec2 e = vec2(sampleRadius) / u_cssSize;
  return (distanceAt(uv) * 4.0
    + distanceAt(uv + e * vec2(1.0, 0.0))
    + distanceAt(uv + e * vec2(0.8660254, 0.5))
    + distanceAt(uv + e * vec2(0.5, 0.8660254))
    + distanceAt(uv + e * vec2(0.0, 1.0))
    + distanceAt(uv + e * vec2(-0.5, 0.8660254))
    + distanceAt(uv + e * vec2(-0.8660254, 0.5))
    + distanceAt(uv + e * vec2(-1.0, 0.0))
    + distanceAt(uv + e * vec2(-0.8660254, -0.5))
    + distanceAt(uv + e * vec2(-0.5, -0.8660254))
    + distanceAt(uv + e * vec2(0.0, -1.0))
    + distanceAt(uv + e * vec2(0.5, -0.8660254))
    + distanceAt(uv + e * vec2(0.8660254, -0.5))) / 16.0;
}
float puffShapeDistance(vec2 uv) {
  if (u_puffRoundness < 0.0001) return distanceAt(uv);
  return mix(distanceAt(uv), puffRoundedDistance(uv), u_puffRoundness);
}
float puffOutlineDistance(vec2 uv) {
  if (u_puffRoundness < 0.0001) return puffDistance(uv);
  return mix(puffDistance(uv), puffRoundedDistance(uv), u_puffRoundness);
}
// A circular cross-section gives strokes a soft crown and steep, rounded sides.
float puffHeight(vec2 uv) {
  float expansion = u_fontSize * u_puffExpansion * u_puff;
  float radius = u_fontSize * u_puffDepth + expansion;
  float d = clamp(puffShapeDistance(uv) + expansion, 0.0, radius);
  return sqrt(max(0.0, d * (2.0 * radius - d)));
}
// Reconstruct the height gradient from a circular footprint. Opposing samples
// cancel gradually at stroke centres, unlike a local finite difference whose
// nearest-edge direction can flip abruptly along the SDF's medial axis.
vec2 puffHeightGradient(vec2 uv, float radius) {
  vec2 e = vec2(radius) / u_cssSize;
  vec2 gradient = vec2(0.0);
  gradient += puffHeight(uv + e * vec2(1.0, 0.0)) * vec2(1.0, 0.0);
  gradient += puffHeight(uv + e * vec2(0.8660254, 0.5)) * vec2(0.8660254, 0.5);
  gradient += puffHeight(uv + e * vec2(0.5, 0.8660254)) * vec2(0.5, 0.8660254);
  gradient += puffHeight(uv + e * vec2(0.0, 1.0)) * vec2(0.0, 1.0);
  gradient += puffHeight(uv + e * vec2(-0.5, 0.8660254)) * vec2(-0.5, 0.8660254);
  gradient += puffHeight(uv + e * vec2(-0.8660254, 0.5)) * vec2(-0.8660254, 0.5);
  gradient += puffHeight(uv + e * vec2(-1.0, 0.0)) * vec2(-1.0, 0.0);
  gradient += puffHeight(uv + e * vec2(-0.8660254, -0.5)) * vec2(-0.8660254, -0.5);
  gradient += puffHeight(uv + e * vec2(-0.5, -0.8660254)) * vec2(-0.5, -0.8660254);
  gradient += puffHeight(uv + e * vec2(0.0, -1.0)) * vec2(0.0, -1.0);
  gradient += puffHeight(uv + e * vec2(0.5, -0.8660254)) * vec2(0.5, -0.8660254);
  gradient += puffHeight(uv + e * vec2(0.8660254, -0.5)) * vec2(0.8660254, -0.5);
  return gradient / (6.0 * radius);
}
vec4 material(Surface s) {
  // Offsetting the Euclidean distance field dilates the glyph with a circular
  // kernel: corners grow round, and nearby letters can merge naturally.
  // Maximum expansion stays within the mask's 0.12em distance range.
  float d = puffOutlineDistance(s.uv) + u_fontSize * u_puffExpansion * u_puff;
  float pixel = u_cssSize.y / u_resolution.y;
  float aa = max(fwidth(d), pixel * 0.75);
  float original = texture(u_mask, s.uv).r;
  float rounded = smoothstep(-aa, aa, d);
  float expanded = mix(max(original, rounded), rounded, u_puffRoundness);
  // Retain exact raster coverage when both shaping controls are zero. Roundness
  // may erode sharp tips as well as filling tight interior corners.
  float shaping = max(smoothstep(0.0, 0.06, u_puff), u_puffRoundness);
  float alpha = mix(original, expanded, shaping);
  if (alpha < 0.005) return vec4(0.0);
  float normalRadius = max(1.25, u_fontSize * max(0.02, u_puffNormalSmoothing * 1.35));
  vec2 slope = puffHeightGradient(s.uv, normalRadius);

  // This value only mutes specular light at ambiguous joins. It no longer
  // alters the surface normal, which previously introduced a second contour.
  float reliabilityStep = normalRadius;
  vec2 reliabilityUV = vec2(reliabilityStep) / u_cssSize;
  vec2 distanceGradient = vec2(
    distanceAt(s.uv + vec2(reliabilityUV.x, 0.0)) - distanceAt(s.uv - vec2(reliabilityUV.x, 0.0)),
    distanceAt(s.uv + vec2(0.0, reliabilityUV.y)) - distanceAt(s.uv - vec2(0.0, reliabilityUV.y))) / (2.0 * reliabilityStep);
  float normalReliability = smoothstep(0.0, 0.85, length(distanceGradient));
  vec2 grain = vec2(noise(s.p * 95.0), noise(s.p * 95.0 + 17.0)) - 0.5;
  vec3 n = normalize(vec3(-slope + grain * u_puffGrainStrength * u_intensity, 1.0));

  // Directional softboxes illuminate every glyph equally: no spatial falloff.
  vec2 drift = vec2(sin(s.time * 0.32), cos(s.time * 0.27)) * 0.07;
  vec3 key = normalize(vec3(u_puffKeyLight.xy + drift, u_puffKeyLight.z));
  // Mirror the key light across the viewing axis. Keeping its positive height
  // puts the second source in front of the surface while reversing its X/Y
  // direction, so its shadow falls beneath the primary highlight.
  vec3 opposingKey = normalize(vec3(-key.xy, key.z));
  vec3 fill = normalize(vec3(0.80, -0.35, 0.65));
  vec3 view = vec3(0.0, 0.0, 1.0);
  // Wrapped diffuse lighting spreads the base-to-shadow transition over a
  // broader range of normals instead of drawing a hard terminator on the form.
  float diffuse = smoothstep(-0.35, 0.9, dot(n, key));
  float opposingDiffuse = smoothstep(-0.35, 0.9, dot(n, opposingKey));
  float soft = pow(max(dot(n, normalize(key + view)), 0.0), u_puffHighlightSize);
  float sheen = pow(max(dot(n, normalize(fill + view)), 0.0), 34.0);
  float rim = pow(1.0 - n.z, 2.5);
  float keyVisibility = smoothstep(0.05, 0.35, diffuse);
  float gloss = (u_puffGloss + 0.12 * u_intensity) * soft
    + 0.04 * sheen * keyVisibility;
  gloss *= mix(0.15, 1.0, normalReliability);
  float texture = (noise(s.p * 150.0) - 0.5) * 0.012 * u_intensity;
  float bodyLight = u_puffBrightness + 0.70 * diffuse + 0.20 * n.z + rim * u_puffRimStrength + texture;
  float shade = clamp(bodyLight, 0.0, 1.0);
  vec3 col = mix(u_puffShadowColor, u_puffColor, shade);
  col += u_puffColor * max(bodyLight - 1.0, 0.0);
  float secondaryShadow = (1.0 - opposingDiffuse) * u_puffSecondaryShadowStrength;
  col = mix(col, u_puffSecondaryShadowColor, secondaryShadow);
  col += u_puffHighlightColor * gloss;
  return vec4(col, alpha);
}`
}, be = { resin: c }, ee = (o) => ({
  puff: o.puff ?? c.defaults.puff,
  baseColor: o.baseColor ?? c.defaults.baseColor,
  shadowColor: o.shadowColor ?? c.defaults.shadowColor,
  bounceShadowColor: o.bounceShadowColor ?? c.defaults.bounceShadowColor,
  highlightColor: o.highlightColor ?? c.defaults.highlightColor,
  roundness: o.roundness ?? c.defaults.roundness,
  depth: o.depth ?? c.defaults.depth,
  smoothing: o.smoothing ?? c.defaults.smoothing,
  lightX: o.lightX ?? c.defaults.lightX,
  lightY: o.lightY ?? c.defaults.lightY,
  lightZ: o.lightZ ?? c.defaults.lightZ,
  highlightSize: o.highlightSize ?? c.defaults.highlightSize,
  gloss: o.gloss ?? c.defaults.gloss,
  brightness: o.brightness ?? c.defaults.brightness,
  bounceStrength: o.bounceStrength ?? c.defaults.bounceStrength
}), K = (o, e, t, i) => Number.isFinite(o) ? Math.max(e, Math.min(t, o)) : i, k = (o, e = 0.5) => K(o, 0, 1, e);
class pe {
  constructor(e, t, i, r) {
    S(this, "gl");
    S(this, "program", null);
    S(this, "texture");
    S(this, "uniforms", /* @__PURE__ */ new Map());
    S(this, "mask", null);
    S(this, "frame", 0);
    S(this, "elapsed", 0);
    S(this, "last", 0);
    S(this, "visible", !0);
    S(this, "options");
    S(this, "reduced");
    S(this, "disposed", !1);
    S(this, "observer");
    S(this, "tick", (e) => {
      if (this.frame = 0, this.disposed || !this.visible || document.hidden) {
        this.last = 0;
        return;
      }
      const t = this.last ? Math.min((e - this.last) / 1e3, 0.05) : 0;
      this.last = e;
      const i = !this.reduced.matches;
      i && (this.elapsed += t);
      try {
        this.draw();
      } catch (r) {
        this.fail(r);
        return;
      }
      i ? this.frame = requestAnimationFrame(this.tick) : this.last = 0;
    });
    S(this, "wake", () => {
      this.disposed || (!this.visible || document.hidden ? (cancelAnimationFrame(this.frame), this.frame = 0, this.last = 0) : this.frame || (this.frame = requestAnimationFrame(this.tick)));
    });
    this.canvas = e, this.host = t, this.fail = r;
    const n = e.getContext("webgl2", { alpha: !0, antialias: !1, premultipliedAlpha: !0, depth: !1, stencil: !1 });
    if (!n) throw new Error("WebGL2 is unavailable.");
    this.gl = n;
    const s = n.createTexture();
    if (!s) throw new Error("Unable to allocate a text texture.");
    this.texture = s, this.options = ee(i), n.bindTexture(n.TEXTURE_2D, s), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), this.reduced = matchMedia("(prefers-reduced-motion: reduce)"), this.reduced.addEventListener("change", this.wake), document.addEventListener("visibilitychange", this.wake), this.observer = new IntersectionObserver((l) => {
      this.visible = l[0].isIntersecting, this.wake();
    }), this.observer.observe(this.host), this.initializeProgram();
  }
  get maxTextureSize() {
    return Math.min(8192, this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
  }
  initializeProgram() {
    const e = ge(c.fragment, !0), t = this.gl, i = (l, f) => {
      const a = t.createShader(l);
      if (!a) throw new Error("Unable to allocate a shader.");
      if (t.shaderSource(a, f), t.compileShader(a), !t.getShaderParameter(a, t.COMPILE_STATUS)) {
        const d = t.getShaderInfoLog(a);
        throw t.deleteShader(a), new Error(`Resin shader: ${d}`);
      }
      return a;
    }, r = i(t.VERTEX_SHADER, de);
    let n = null, s = null;
    try {
      if (n = i(t.FRAGMENT_SHADER, e), s = t.createProgram(), !s) throw new Error("Unable to allocate a shader program.");
      if (t.attachShader(s, r), t.attachShader(s, n), t.linkProgram(s), !t.getProgramParameter(s, t.LINK_STATUS)) throw new Error(t.getProgramInfoLog(s) || "Shader linking failed.");
    } catch (l) {
      throw s && t.deleteProgram(s), l;
    } finally {
      t.deleteShader(r), n && t.deleteShader(n);
    }
    this.program && t.deleteProgram(this.program), this.program = s, this.uniforms.clear(), this.wake();
  }
  setMask(e) {
    this.mask = e;
    const { canvas: t, gl: i } = this;
    t.width = e.width, t.height = e.height, Object.assign(t.style, {
      width: `${e.cssWidth}px`,
      height: `${e.cssHeight}px`,
      left: "0px",
      top: "0px"
    });
    const r = this.host.getBoundingClientRect(), n = t.getBoundingClientRect(), s = n.width / e.cssWidth || 1, l = n.height / e.cssHeight || 1;
    if (t.style.left = `${(r.left + e.left * e.scaleX - n.left) / s}px`, t.style.top = `${(r.top + e.top * e.scaleY - n.top) / l}px`, i.bindTexture(i.TEXTURE_2D, this.texture), i.texImage2D(i.TEXTURE_2D, 0, i.RGBA, e.width, e.height, 0, i.RGBA, i.UNSIGNED_BYTE, e.pixels), i.getError() !== i.NO_ERROR) throw new Error("Unable to upload the text mask.");
    this.draw(), this.wake();
  }
  setOptions(e) {
    this.options = ee(e), this.wake();
  }
  location(e) {
    return this.uniforms.has(e) || this.uniforms.set(e, this.gl.getUniformLocation(this.program, e)), this.uniforms.get(e);
  }
  draw() {
    if (!this.program || !this.mask || this.disposed || this.gl.isContextLost()) return;
    const { gl: e, mask: t, options: i } = this;
    e.viewport(0, 0, t.width, t.height), e.useProgram(this.program), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.texture), e.uniform1i(this.location("u_mask"), 0), e.uniform2f(this.location("u_resolution"), t.width, t.height), e.uniform2f(this.location("u_cssSize"), t.cssWidth, t.cssHeight), e.uniform1f(this.location("u_fontSize"), t.fontSize), e.uniform1f(this.location("u_distanceRange"), t.distanceRange);
    const r = i.puff, n = k(r, c.defaults.puff), s = Math.min(1, n * 7 / 3), l = s > 0 ? n * 0.035 / s : 0.015;
    e.uniform1f(this.location("u_puff"), s);
    const f = Number.parseInt(i.baseColor.slice(1), 16);
    e.uniform3f(this.location("u_puffColor"), (f >> 16 & 255) / 255, (f >> 8 & 255) / 255, (f & 255) / 255);
    const a = Number.parseInt(i.shadowColor.slice(1), 16);
    e.uniform3f(this.location("u_puffShadowColor"), (a >> 16 & 255) / 255, (a >> 8 & 255) / 255, (a & 255) / 255);
    const d = Number.parseInt(i.bounceShadowColor.slice(1), 16);
    e.uniform3f(this.location("u_puffSecondaryShadowColor"), (d >> 16 & 255) / 255, (d >> 8 & 255) / 255, (d & 255) / 255);
    const g = Number.parseInt(i.highlightColor.slice(1), 16);
    e.uniform3f(this.location("u_puffHighlightColor"), (g >> 16 & 255) / 255, (g >> 8 & 255) / 255, (g & 255) / 255), e.uniform1f(this.location("u_puffRoundness"), k(i.roundness, c.defaults.roundness)), e.uniform1f(this.location("u_puffExpansion"), l), e.uniform1f(this.location("u_puffDepth"), k(i.depth, c.defaults.depth) * 0.2), e.uniform1f(this.location("u_puffNormalSmoothing"), 0.025 + k(i.smoothing, c.defaults.smoothing) * 0.035), e.uniform1f(this.location("u_puffGrainStrength"), 0), e.uniform3f(this.location("u_puffKeyLight"), K(i.lightX, -1, 1, c.defaults.lightX), K(i.lightY, -1, 1, c.defaults.lightY), k(i.lightZ, c.defaults.lightZ) * 0.5), e.uniform1f(this.location("u_puffHighlightSize"), 40 - k(i.highlightSize, c.defaults.highlightSize) * 35), e.uniform1f(this.location("u_puffRimStrength"), 0), e.uniform1f(this.location("u_puffGloss"), k(i.gloss, c.defaults.gloss)), e.uniform1f(this.location("u_puffBrightness"), k(i.brightness, c.defaults.brightness)), e.uniform1f(this.location("u_puffSecondaryShadowStrength"), Math.max(0, Math.min(1, i.bounceStrength))), e.drawArrays(e.TRIANGLES, 0, 3);
  }
  dispose() {
    this.disposed = !0, cancelAnimationFrame(this.frame), this.observer.disconnect(), this.reduced.removeEventListener("change", this.wake), document.removeEventListener("visibilitychange", this.wake), this.gl.deleteTexture(this.texture), this.program && this.gl.deleteProgram(this.program);
  }
}
function te(o, e, t, i, r) {
  let n = 0;
  i[0] = 0, r[0] = -1 / 0, r[1] = 1 / 0;
  for (let s = 1; s < t; s++) {
    let l = (o[s] + s * s - (o[i[n]] + i[n] * i[n])) / (2 * s - 2 * i[n]);
    for (; l <= r[n]; )
      n--, l = (o[s] + s * s - (o[i[n]] + i[n] * i[n])) / (2 * s - 2 * i[n]);
    n++, i[n] = s, r[n] = l, r[n + 1] = 1 / 0;
  }
  n = 0;
  for (let s = 0; s < t; s++) {
    for (; r[n + 1] < s; ) n++;
    e[s] = (s - i[n]) ** 2 + o[i[n]];
  }
}
function ie(o, e, t) {
  const i = Math.max(e, t), r = new Float64Array(i), n = new Float64Array(i), s = new Int32Array(i), l = new Float64Array(i + 1);
  for (let f = 0; f < e; f++) {
    for (let a = 0; a < t; a++) r[a] = o[a * e + f];
    te(r, n, t, s, l);
    for (let a = 0; a < t; a++) o[a * e + f] = n[a];
  }
  for (let f = 0; f < t; f++) {
    for (let a = 0; a < e; a++) r[a] = o[f * e + a];
    te(r, n, e, s, l);
    for (let a = 0; a < e; a++) o[f * e + a] = n[a];
  }
}
function me(o, e, t) {
  const { width: i, height: r, data: n } = o, s = new Float64Array(i * r), l = new Float64Array(i * r);
  for (let a = 0; a < i * r; a++) {
    const d = n[a * 4 + 3] / 255;
    if (d === 1)
      s[a] = 1e12, l[a] = 0;
    else if (d === 0)
      s[a] = 0, l[a] = 1e12;
    else {
      const g = d - 0.5;
      s[a] = Math.max(0, g) ** 2, l[a] = Math.max(0, -g) ** 2;
    }
  }
  ie(s, i, r), ie(l, i, r);
  const f = new Uint8Array(i * r * 4);
  for (let a = 0; a < r; a++) for (let d = 0; d < i; d++) {
    const g = a * i + d, R = ((r - 1 - a) * i + d) * 4, F = (Math.sqrt(s[g]) - Math.sqrt(l[g])) / e;
    f[R] = n[g * 4 + 3], f[R + 1] = Math.round(Math.max(0, Math.min(1, 0.5 + F / (2 * t))) * 255), f[R + 3] = 255;
  }
  return f;
}
const q = (o) => Number.parseFloat(o) || 0;
function ne(o) {
  const e = getComputedStyle(o);
  return [
    e.font,
    e.fontFamily,
    e.fontSize,
    e.fontWeight,
    e.fontStyle,
    e.fontStretch,
    e.lineHeight,
    e.letterSpacing,
    e.wordSpacing,
    e.textAlign,
    e.whiteSpace,
    e.direction,
    e.writingMode,
    e.textTransform,
    e.fontFeatureSettings,
    e.fontVariationSettings,
    e.fontVariant,
    e.fontKerning,
    e.textIndent,
    e.textDecorationLine,
    e.textShadow,
    e.wordBreak,
    e.overflowWrap,
    e.width,
    e.height,
    e.padding,
    e.borderWidth,
    devicePixelRatio
  ].join("|");
}
function ve(o, e) {
  var T;
  const t = getComputedStyle(o), i = Array.from(o.childNodes).filter((w) => w.nodeType === Node.TEXT_NODE);
  if (!i.length || !((T = o.textContent) != null && T.trim())) return null;
  const r = i.map((w) => w.textContent).join("");
  if (i.length !== 1) throw new Error("ShaderText expects one plain text child.");
  if (t.writingMode !== "horizontal-tb" || t.direction !== "ltr" || /[\u0590-\u08ff\u0900-\u109f\u1780-\u17ff\u200e-\u200f\u202a-\u202e\u2066-\u2069]/u.test(r) || !["normal", "pre-wrap"].includes(t.whiteSpace) || t.textAlign === "justify" || t.textTransform !== "none" || t.fontFeatureSettings !== "normal" || t.fontVariationSettings !== "normal" || t.fontVariant !== "normal" || t.fontStretch !== "100%" && t.fontStretch !== "normal" || t.textDecorationLine !== "none" || t.textShadow !== "none" || t.hyphens === "auto" || r.includes("­") || r.includes("	"))
    throw new Error("This typography is outside the initial ShaderText support; displaying HTML text.");
  const n = i[0], s = q(t.fontSize), l = o.getBoundingClientRect(), f = o.offsetWidth, a = l.width / (f || l.width || 1), d = l.height / (o.offsetHeight || l.height || 1);
  if (!l.width || !l.height || !s) return null;
  const g = document.createRange(), R = [], F = new Intl.Segmenter(void 0, { granularity: "grapheme" });
  for (const w of F.segment(r)) {
    const m = w.index, x = m + w.segment.length;
    g.setStart(n, m), g.setEnd(n, x);
    const E = g.getBoundingClientRect();
    if (!E.height || w.segment === `
`) continue;
    const z = R.at(-1);
    z && Math.abs(E.top - z.top) < 1 ? z.end = x : R.push({ start: m, end: x, top: E.top });
  }
  const C = Math.ceil(s * 0.25 + 2), A = l.width / a + C * 2, I = l.height / d + C * 2, b = Math.min(
    devicePixelRatio || 1,
    2,
    e / A,
    e / I,
    Math.sqrt(3e6 / (A * I))
  );
  if (b < 0.25) throw new Error("Text surface is too large; displaying HTML text.");
  const v = document.createElement("canvas");
  v.width = Math.max(1, Math.ceil(A * b)), v.height = Math.max(1, Math.ceil(I * b));
  const p = v.getContext("2d", { willReadFrequently: !0 });
  if (!p) throw new Error("Canvas 2D is unavailable.");
  if (p.scale(b, b), p.font = `${t.fontStyle} ${t.fontWeight} ${t.fontSize} ${t.fontFamily}`, p.textBaseline = "alphabetic", p.fillStyle = "#fff", p.direction = "ltr", p.fontKerning = t.fontKerning, q(t.letterSpacing) && !("letterSpacing" in p)) throw new Error("Canvas letter spacing is unavailable.");
  if (q(t.wordSpacing) && !("wordSpacing" in p)) throw new Error("Canvas word spacing is unavailable.");
  p.letterSpacing = t.letterSpacing === "normal" ? "0px" : t.letterSpacing, p.wordSpacing = t.wordSpacing === "normal" ? "0px" : t.wordSpacing;
  const W = p.measureText("Hg"), P = W.fontBoundingBoxAscent, u = W.fontBoundingBoxDescent;
  if (!Number.isFinite(P) || !Number.isFinite(u)) throw new Error("Font bounds are unavailable.");
  for (const w of R) {
    let { start: m, end: x } = w;
    if (t.whiteSpace === "normal") {
      for (; m < x && /\s/.test(r[m]); ) m++;
      for (; x > m && /\s/.test(r[x - 1]); ) x--;
    }
    if (m === x) continue;
    g.setStart(n, m), g.setEnd(n, x);
    const E = g.getBoundingClientRect(), z = t.whiteSpace === "normal" ? r.slice(m, x).replace(/\s+/g, " ") : r.slice(m, x), M = (E.left - l.left) / a + C, U = E.height / d, L = (E.top - l.top) / d + (U - P - u) / 2 + P + C;
    p.fillText(z, M, L);
  }
  const y = Math.max(8, s * 0.12);
  return {
    pixels: me(p.getImageData(0, 0, v.width, v.height), b, y),
    width: v.width,
    height: v.height,
    cssWidth: A,
    cssHeight: I,
    // Canvas placement is anchored to the host's border-box rectangle. The
    // renderer translates that viewport-space target into the canvas's actual
    // absolute-positioning context, which may differ for fragmented inlines.
    left: -C,
    top: -C,
    scaleX: a,
    scaleY: d,
    fontSize: s,
    distanceRange: y
  };
}
const xe = (o, e, t, i) => Number.isFinite(o) ? Math.max(t, Math.min(i, o)) : e, Se = () => {
  const o = [];
  return typeof ResizeObserver != "function" && o.push("ResizeObserver"), typeof IntersectionObserver != "function" && o.push("IntersectionObserver"), typeof MutationObserver != "function" && o.push("MutationObserver"), (typeof Intl > "u" || typeof Intl.Segmenter != "function") && o.push("Intl.Segmenter"), (!document.fonts || typeof document.fonts.addEventListener != "function" || !document.fonts.ready) && o.push("the Font Loading API"), o.length ? new Error(`TextRender requires ${o.join(", ")}; displaying HTML text.`) : null;
};
function Ee(o) {
  var P;
  const { children: e, shader: t = "resin", onError: i, ...r } = o, n = H(null), s = H(null), l = H(null), f = H(null), [a, d] = J("pending"), [g, R] = J(() => typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches), F = H({ onError: i });
  F.current = { onError: i };
  const C = {
    puff: xe(r.puff ?? 0.5, 0.5, 0, 1),
    baseColor: /^#[0-9a-f]{6}$/i.test(r.baseColor ?? "") ? r.baseColor : "#111111",
    shadowColor: /^#[0-9a-f]{6}$/i.test(r.shadowColor ?? "") ? r.shadowColor : "#000000",
    bounceShadowColor: /^#[0-9a-f]{6}$/i.test(r.bounceShadowColor ?? "") ? r.bounceShadowColor : "#000000",
    highlightColor: /^#[0-9a-f]{6}$/i.test(r.highlightColor ?? "") ? r.highlightColor : "#ffffff",
    roundness: r.roundness,
    depth: r.depth,
    smoothing: r.smoothing,
    lightX: r.lightX,
    lightY: r.lightY,
    lightZ: r.lightZ,
    highlightSize: r.highlightSize,
    gloss: r.gloss,
    brightness: r.brightness,
    bounceStrength: r.bounceStrength
  }, A = H(C);
  A.current = C;
  const I = Q(e) && typeof e.type == "string" && /^(h[1-6]|p|span)$/.test(e.type), b = I && (typeof e.props.children == "string" || typeof e.props.children == "number"), v = Q(e) ? Number.parseInt(fe) >= 19 ? e.props.ref : e.ref : void 0, p = H(void 0), W = ce((u) => {
    n.current = u, p.current ? (p.current(), p.current = void 0) : !u && typeof v == "function" && v(null), u && typeof v == "function" ? p.current = v(u) : v && typeof v != "function" && (v.current = u);
  }, [v]);
  return B(() => {
    const u = window.matchMedia("(prefers-reduced-motion: reduce)"), y = () => R(u.matches);
    return y(), u.addEventListener("change", y), () => u.removeEventListener("change", y);
  }, []), B(() => {
    const u = n.current, y = s.current;
    if (!u || !y || !b) return;
    let T = !1, w = 0, m = 0, x = "", E = !1, z = "", M = !1, U = !1, L = null, N = null, O = null;
    const V = () => {
      cancelAnimationFrame(m), m = 0, U = !1, y.style.visibility = "hidden", y.style.opacity = "0", d("pending");
    }, $ = (h) => {
      var _, G;
      T || (V(), d("fallback"), (G = (_ = F.current).onError) == null || G.call(_, h));
    }, oe = () => Array.from(u.getClientRects(), (h) => `${h.left},${h.top},${h.width},${h.height}`).join(";"), re = () => {
      if (w = 0, !(T || !E || !l.current || l.current.gl.isContextLost()))
        try {
          x = ne(u);
          const h = x + "|" + oe() + "|" + u.textContent;
          if (h !== z || !M) {
            const _ = ve(u, l.current.maxTextureSize);
            if (!_) {
              M = !1, V();
              return;
            }
            l.current.setMask(_), M = !0, z = h;
          }
          !U && !m && (m = requestAnimationFrame(() => {
            var _;
            m = 0, !(T || !M || (_ = l.current) != null && _.gl.isContextLost()) && (U = !0, d("ready"));
          }));
        } catch (h) {
          $(h);
        }
    }, X = () => {
      T || w || (w = requestAnimationFrame(re));
    };
    f.current = X;
    const Y = () => {
      try {
        if (t !== "resin") throw new Error("Only the Resin shader is supported.");
        l.current = new pe(y, u, A.current, $), X();
      } catch (h) {
        $(h);
      }
    }, j = (h) => {
      h.preventDefault(), $(new Error("WebGL context lost; displaying HTML text."));
    }, Z = () => {
      var h;
      V(), (h = l.current) == null || h.dispose(), l.current = null, M = !1, Y();
    };
    try {
      const h = Se();
      if (h) throw h;
      y.addEventListener("webglcontextlost", j), y.addEventListener("webglcontextrestored", Z), Y(), L = new ResizeObserver(X), L.observe(u), N = new MutationObserver(X);
      const _ = getComputedStyle(u).display.startsWith("inline"), G = _ && u.parentElement ? u.parentElement : u;
      if (N.observe(G, { characterData: !0, childList: !0, subtree: !0 }), _) {
        let D = u.parentElement;
        for (; D != null && D.parentElement && getComputedStyle(D).display.startsWith("inline"); )
          D = D.parentElement;
        D && L.observe(D);
      }
      O = () => {
        E = !0, M = !1, X();
      }, document.fonts.ready.then(O), document.fonts.addEventListener("loadingdone", O);
    } catch (h) {
      $(h);
    }
    const se = window.setInterval(() => {
      !document.hidden && ne(u) !== x && X();
    }, 400);
    return () => {
      var h;
      T = !0, cancelAnimationFrame(w), cancelAnimationFrame(m), clearInterval(se), f.current = null, L == null || L.disconnect(), N == null || N.disconnect(), O && document.fonts.removeEventListener("loadingdone", O), y.removeEventListener("webglcontextlost", j), y.removeEventListener("webglcontextrestored", Z), (h = l.current) == null || h.dispose(), l.current = null;
    };
  }, [b, e.type, t]), B(() => {
    var u;
    (u = l.current) == null || u.setOptions(A.current);
  }), B(() => {
    var u;
    (u = f.current) == null || u.call(f);
  }, [e.props.children, e.props.className, e.props.style]), !I || !b ? e : he(
    e,
    {
      ref: W,
      "data-shader-state": a,
      style: {
        ...e.props.style,
        position: (P = e.props.style) != null && P.position && e.props.style.position !== "static" ? e.props.style.position : "relative",
        ...a !== "fallback" ? { color: "transparent", WebkitTextFillColor: "transparent" } : {}
      }
    },
    String(e.props.children),
    /* @__PURE__ */ ue("canvas", { ref: s, "aria-hidden": "true", style: {
      position: "absolute",
      background: "transparent",
      pointerEvents: "none",
      visibility: a === "ready" ? "visible" : "hidden",
      opacity: a === "ready" ? 1 : 0,
      transition: g ? "none" : "opacity 150ms ease",
      display: "block",
      maxWidth: "none",
      userSelect: "none"
    } }, "shader-canvas")
  );
}
export {
  Ee as TextRender,
  c as resin,
  be as skins
};
