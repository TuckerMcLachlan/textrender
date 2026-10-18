var ne = Object.defineProperty;
var oe = (a, e, t) => e in a ? ne(a, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : a[e] = t;
var m = (a, e, t) => oe(a, typeof e != "symbol" ? e + "" : e, t);
import { jsx as re } from "react/jsx-runtime";
import { useRef as H, useState as se, isValidElement as Y, version as ae, useCallback as le, useEffect as $, cloneElement as ue } from "react";
const ce = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`, fe = (a, e = !1) => `#version 300 es
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
uniform float u_puffiness;
uniform vec3 u_puffColor;
uniform vec3 u_puffShadowColor;
uniform vec3 u_puffSecondaryShadowColor;
uniform vec3 u_puffHighlightColor;
uniform float u_puffCornerRoundness;
uniform float u_puffExpansion;
uniform float u_puffRadius;
uniform float u_puffNormalSmoothing;
uniform float u_puffGrainStrength;
uniform vec3 u_puffKeyLight;
uniform float u_puffHighlightSize;
uniform float u_puffRimStrength;
uniform float u_puffGlossStrength;
uniform float u_puffAmbient;
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
${a}
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
}`, p = {
  id: "resin",
  label: "Resin",
  defaults: {
    puffiness: 0.5,
    baseColor: "#111111",
    shadowColor: "#000000",
    bounceShadowColor: "#000000",
    highlightColor: "#ffffff",
    cornerRoundness: 0,
    radius: 0.1,
    smoothing: 0.022,
    lightX: -0.65,
    lightY: 0.85,
    lightZ: 0.85,
    highlightSize: 22,
    glossStrength: 0.16,
    ambient: 0.4,
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
  float sampleRadius = mix(baseRadius, u_fontSize * 0.055, u_puffCornerRoundness);
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
  if (u_puffCornerRoundness < 0.0001) return distanceAt(uv);
  return mix(distanceAt(uv), puffRoundedDistance(uv), u_puffCornerRoundness);
}
float puffOutlineDistance(vec2 uv) {
  if (u_puffCornerRoundness < 0.0001) return puffDistance(uv);
  return mix(puffDistance(uv), puffRoundedDistance(uv), u_puffCornerRoundness);
}
// A circular cross-section gives strokes a soft crown and steep, rounded sides.
float puffHeight(vec2 uv) {
  float expansion = u_fontSize * u_puffExpansion * u_puffiness;
  float radius = u_fontSize * u_puffRadius + expansion;
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
  float d = puffOutlineDistance(s.uv) + u_fontSize * u_puffExpansion * u_puffiness;
  float pixel = u_cssSize.y / u_resolution.y;
  float aa = max(fwidth(d), pixel * 0.75);
  float original = texture(u_mask, s.uv).r;
  float rounded = smoothstep(-aa, aa, d);
  float expanded = mix(max(original, rounded), rounded, u_puffCornerRoundness);
  // Retain exact raster coverage when both shaping controls are zero. Roundness
  // may erode sharp tips as well as filling tight interior corners.
  float shaping = max(smoothstep(0.0, 0.06, u_puffiness), u_puffCornerRoundness);
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
  float gloss = (u_puffGlossStrength + 0.12 * u_intensity) * soft
    + 0.04 * sheen * keyVisibility;
  gloss *= mix(0.15, 1.0, normalReliability);
  float texture = (noise(s.p * 150.0) - 0.5) * 0.012 * u_intensity;
  float bodyLight = u_puffAmbient + 0.70 * diffuse + 0.20 * n.z + rim * u_puffRimStrength + texture;
  float shade = clamp(bodyLight, 0.0, 1.0);
  vec3 col = mix(u_puffShadowColor, u_puffColor, shade);
  col += u_puffColor * max(bodyLight - 1.0, 0.0);
  float secondaryShadow = (1.0 - opposingDiffuse) * u_puffSecondaryShadowStrength;
  col = mix(col, u_puffSecondaryShadowColor, secondaryShadow);
  col += u_puffHighlightColor * gloss;
  return vec4(col, alpha);
}`
}, Se = { resin: p }, j = (a) => ({
  puffiness: a.puffiness ?? p.defaults.puffiness,
  baseColor: a.baseColor ?? p.defaults.baseColor,
  shadowColor: a.shadowColor ?? p.defaults.shadowColor,
  bounceShadowColor: a.bounceShadowColor ?? p.defaults.bounceShadowColor,
  highlightColor: a.highlightColor ?? p.defaults.highlightColor,
  cornerRoundness: a.cornerRoundness ?? p.defaults.cornerRoundness,
  radius: a.radius ?? p.defaults.radius,
  smoothing: a.smoothing ?? p.defaults.smoothing,
  lightX: a.lightX ?? p.defaults.lightX,
  lightY: a.lightY ?? p.defaults.lightY,
  lightZ: a.lightZ ?? p.defaults.lightZ,
  highlightSize: a.highlightSize ?? p.defaults.highlightSize,
  glossStrength: a.glossStrength ?? p.defaults.glossStrength,
  ambient: a.ambient ?? p.defaults.ambient,
  bounceStrength: a.bounceStrength ?? p.defaults.bounceStrength
});
class he {
  constructor(e, t, i, o) {
    m(this, "gl");
    m(this, "program", null);
    m(this, "texture");
    m(this, "uniforms", /* @__PURE__ */ new Map());
    m(this, "mask", null);
    m(this, "frame", 0);
    m(this, "elapsed", 0);
    m(this, "last", 0);
    m(this, "visible", !0);
    m(this, "options");
    m(this, "reduced");
    m(this, "disposed", !1);
    m(this, "observer");
    m(this, "tick", (e) => {
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
      } catch (o) {
        this.fail(o);
        return;
      }
      i ? this.frame = requestAnimationFrame(this.tick) : this.last = 0;
    });
    m(this, "wake", () => {
      this.disposed || (!this.visible || document.hidden ? (cancelAnimationFrame(this.frame), this.frame = 0, this.last = 0) : this.frame || (this.frame = requestAnimationFrame(this.tick)));
    });
    this.canvas = e, this.host = t, this.fail = o;
    const n = e.getContext("webgl2", { alpha: !0, antialias: !1, premultipliedAlpha: !0, depth: !1, stencil: !1 });
    if (!n) throw new Error("WebGL2 is unavailable.");
    this.gl = n;
    const r = n.createTexture();
    if (!r) throw new Error("Unable to allocate a text texture.");
    this.texture = r, this.options = j(i), n.bindTexture(n.TEXTURE_2D, r), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), this.reduced = matchMedia("(prefers-reduced-motion: reduce)"), this.reduced.addEventListener("change", this.wake), document.addEventListener("visibilitychange", this.wake), this.observer = new IntersectionObserver((l) => {
      this.visible = l[0].isIntersecting, this.wake();
    }), this.observer.observe(this.host), this.initializeProgram();
  }
  get maxTextureSize() {
    return Math.min(8192, this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
  }
  initializeProgram() {
    const e = fe(p.fragment, !0), t = this.gl, i = (l, c) => {
      const s = t.createShader(l);
      if (!s) throw new Error("Unable to allocate a shader.");
      if (t.shaderSource(s, c), t.compileShader(s), !t.getShaderParameter(s, t.COMPILE_STATUS)) {
        const h = t.getShaderInfoLog(s);
        throw t.deleteShader(s), new Error(`Resin shader: ${h}`);
      }
      return s;
    }, o = i(t.VERTEX_SHADER, ce);
    let n = null, r = null;
    try {
      if (n = i(t.FRAGMENT_SHADER, e), r = t.createProgram(), !r) throw new Error("Unable to allocate a shader program.");
      if (t.attachShader(r, o), t.attachShader(r, n), t.linkProgram(r), !t.getProgramParameter(r, t.LINK_STATUS)) throw new Error(t.getProgramInfoLog(r) || "Shader linking failed.");
    } catch (l) {
      throw r && t.deleteProgram(r), l;
    } finally {
      t.deleteShader(o), n && t.deleteShader(n);
    }
    this.program && t.deleteProgram(this.program), this.program = r, this.uniforms.clear(), this.wake();
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
    const o = this.host.getBoundingClientRect(), n = t.getBoundingClientRect(), r = n.width / e.cssWidth || 1, l = n.height / e.cssHeight || 1;
    if (t.style.left = `${(o.left + e.left * e.scaleX - n.left) / r}px`, t.style.top = `${(o.top + e.top * e.scaleY - n.top) / l}px`, i.bindTexture(i.TEXTURE_2D, this.texture), i.texImage2D(i.TEXTURE_2D, 0, i.RGBA, e.width, e.height, 0, i.RGBA, i.UNSIGNED_BYTE, e.pixels), i.getError() !== i.NO_ERROR) throw new Error("Unable to upload the text mask.");
    this.draw(), this.wake();
  }
  setOptions(e) {
    this.options = j(e), this.wake();
  }
  location(e) {
    return this.uniforms.has(e) || this.uniforms.set(e, this.gl.getUniformLocation(this.program, e)), this.uniforms.get(e);
  }
  draw() {
    if (!this.program || !this.mask || this.disposed || this.gl.isContextLost()) return;
    const { gl: e, mask: t, options: i } = this;
    e.viewport(0, 0, t.width, t.height), e.useProgram(this.program), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.texture), e.uniform1i(this.location("u_mask"), 0), e.uniform2f(this.location("u_resolution"), t.width, t.height), e.uniform2f(this.location("u_cssSize"), t.cssWidth, t.cssHeight), e.uniform1f(this.location("u_fontSize"), t.fontSize), e.uniform1f(this.location("u_distanceRange"), t.distanceRange);
    const o = i.puffiness, n = Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 0.5, r = Math.min(1, n * 7 / 3), l = r > 0 ? n * 0.035 / r : 0.015;
    e.uniform1f(this.location("u_puffiness"), r);
    const c = Number.parseInt(i.baseColor.slice(1), 16);
    e.uniform3f(this.location("u_puffColor"), (c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255);
    const s = Number.parseInt(i.shadowColor.slice(1), 16);
    e.uniform3f(this.location("u_puffShadowColor"), (s >> 16 & 255) / 255, (s >> 8 & 255) / 255, (s & 255) / 255);
    const h = Number.parseInt(i.bounceShadowColor.slice(1), 16);
    e.uniform3f(this.location("u_puffSecondaryShadowColor"), (h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255);
    const d = Number.parseInt(i.highlightColor.slice(1), 16);
    e.uniform3f(this.location("u_puffHighlightColor"), (d >> 16 & 255) / 255, (d >> 8 & 255) / 255, (d & 255) / 255), e.uniform1f(this.location("u_puffCornerRoundness"), Math.max(0, Math.min(1, i.cornerRoundness))), e.uniform1f(this.location("u_puffExpansion"), l), e.uniform1f(this.location("u_puffRadius"), i.radius), e.uniform1f(this.location("u_puffNormalSmoothing"), i.smoothing), e.uniform1f(this.location("u_puffGrainStrength"), 0), e.uniform3f(this.location("u_puffKeyLight"), i.lightX, i.lightY, i.lightZ), e.uniform1f(this.location("u_puffHighlightSize"), i.highlightSize), e.uniform1f(this.location("u_puffRimStrength"), 0), e.uniform1f(this.location("u_puffGlossStrength"), i.glossStrength), e.uniform1f(this.location("u_puffAmbient"), i.ambient), e.uniform1f(this.location("u_puffSecondaryShadowStrength"), Math.max(0, Math.min(1, i.bounceStrength))), e.drawArrays(e.TRIANGLES, 0, 3);
  }
  dispose() {
    this.disposed = !0, cancelAnimationFrame(this.frame), this.observer.disconnect(), this.reduced.removeEventListener("change", this.wake), document.removeEventListener("visibilitychange", this.wake), this.gl.deleteTexture(this.texture), this.program && this.gl.deleteProgram(this.program);
  }
}
function Z(a, e, t, i, o) {
  let n = 0;
  i[0] = 0, o[0] = -1 / 0, o[1] = 1 / 0;
  for (let r = 1; r < t; r++) {
    let l = (a[r] + r * r - (a[i[n]] + i[n] * i[n])) / (2 * r - 2 * i[n]);
    for (; l <= o[n]; )
      n--, l = (a[r] + r * r - (a[i[n]] + i[n] * i[n])) / (2 * r - 2 * i[n]);
    n++, i[n] = r, o[n] = l, o[n + 1] = 1 / 0;
  }
  n = 0;
  for (let r = 0; r < t; r++) {
    for (; o[n + 1] < r; ) n++;
    e[r] = (r - i[n]) ** 2 + a[i[n]];
  }
}
function J(a, e, t) {
  const i = Math.max(e, t), o = new Float64Array(i), n = new Float64Array(i), r = new Int32Array(i), l = new Float64Array(i + 1);
  for (let c = 0; c < e; c++) {
    for (let s = 0; s < t; s++) o[s] = a[s * e + c];
    Z(o, n, t, r, l);
    for (let s = 0; s < t; s++) a[s * e + c] = n[s];
  }
  for (let c = 0; c < t; c++) {
    for (let s = 0; s < e; s++) o[s] = a[c * e + s];
    Z(o, n, e, r, l);
    for (let s = 0; s < e; s++) a[c * e + s] = n[s];
  }
}
function de(a, e, t) {
  const { width: i, height: o, data: n } = a, r = new Float64Array(i * o), l = new Float64Array(i * o);
  for (let s = 0; s < i * o; s++) {
    const h = n[s * 4 + 3] / 255;
    if (h === 1)
      r[s] = 1e12, l[s] = 0;
    else if (h === 0)
      r[s] = 0, l[s] = 1e12;
    else {
      const d = h - 0.5;
      r[s] = Math.max(0, d) ** 2, l[s] = Math.max(0, -d) ** 2;
    }
  }
  J(r, i, o), J(l, i, o);
  const c = new Uint8Array(i * o * 4);
  for (let s = 0; s < o; s++) for (let h = 0; h < i; h++) {
    const d = s * i + h, R = ((o - 1 - s) * i + h) * 4, k = (Math.sqrt(r[d]) - Math.sqrt(l[d])) / e;
    c[R] = n[d * 4 + 3], c[R + 1] = Math.round(Math.max(0, Math.min(1, 0.5 + k / (2 * t))) * 255), c[R + 3] = 255;
  }
  return c;
}
const W = (a) => Number.parseFloat(a) || 0;
function Q(a) {
  const e = getComputedStyle(a);
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
function ge(a, e) {
  var A;
  const t = getComputedStyle(a), i = Array.from(a.childNodes).filter((y) => y.nodeType === Node.TEXT_NODE);
  if (!i.length || !((A = a.textContent) != null && A.trim())) return null;
  const o = i.map((y) => y.textContent).join("");
  if (i.length !== 1) throw new Error("ShaderText expects one plain text child.");
  if (t.writingMode !== "horizontal-tb" || t.direction !== "ltr" || /[\u0590-\u08ff\u0900-\u109f\u1780-\u17ff\u200e-\u200f\u202a-\u202e\u2066-\u2069]/u.test(o) || !["normal", "pre-wrap"].includes(t.whiteSpace) || t.textAlign === "justify" || t.textTransform !== "none" || t.fontFeatureSettings !== "normal" || t.fontVariationSettings !== "normal" || t.fontVariant !== "normal" || t.fontStretch !== "100%" && t.fontStretch !== "normal" || t.textDecorationLine !== "none" || t.textShadow !== "none" || t.hyphens === "auto" || o.includes("­") || o.includes("	"))
    throw new Error("This typography is outside the initial ShaderText support; displaying HTML text.");
  const n = i[0], r = W(t.fontSize), l = a.getBoundingClientRect(), c = a.offsetWidth, s = l.width / (c || l.width || 1), h = l.height / (a.offsetHeight || l.height || 1);
  if (!l.width || !l.height || !r) return null;
  const d = document.createRange(), R = [], k = new Intl.Segmenter(void 0, { granularity: "grapheme" });
  for (const y of k.segment(o)) {
    const v = y.index, x = v + y.segment.length;
    d.setStart(n, v), d.setEnd(n, x);
    const S = d.getBoundingClientRect();
    if (!S.height || y.segment === `
`) continue;
    const T = R.at(-1);
    T && Math.abs(S.top - T.top) < 1 ? T.end = x : R.push({ start: v, end: x, top: S.top });
  }
  const E = Math.ceil(r * 0.25 + 2), z = l.width / s + E * 2, w = l.height / h + E * 2, _ = Math.min(
    devicePixelRatio || 1,
    2,
    e / z,
    e / w,
    Math.sqrt(3e6 / (z * w))
  );
  if (_ < 0.25) throw new Error("Text surface is too large; displaying HTML text.");
  const C = document.createElement("canvas");
  C.width = Math.max(1, Math.ceil(z * _)), C.height = Math.max(1, Math.ceil(w * _));
  const g = C.getContext("2d", { willReadFrequently: !0 });
  if (!g) throw new Error("Canvas 2D is unavailable.");
  if (g.scale(_, _), g.font = `${t.fontStyle} ${t.fontWeight} ${t.fontSize} ${t.fontFamily}`, g.textBaseline = "alphabetic", g.fillStyle = "#fff", g.direction = "ltr", g.fontKerning = t.fontKerning, W(t.letterSpacing) && !("letterSpacing" in g)) throw new Error("Canvas letter spacing is unavailable.");
  if (W(t.wordSpacing) && !("wordSpacing" in g)) throw new Error("Canvas word spacing is unavailable.");
  g.letterSpacing = t.letterSpacing === "normal" ? "0px" : t.letterSpacing, g.wordSpacing = t.wordSpacing === "normal" ? "0px" : t.wordSpacing;
  const f = g.measureText("Hg"), b = f.fontBoundingBoxAscent, M = f.fontBoundingBoxDescent;
  if (!Number.isFinite(b) || !Number.isFinite(M)) throw new Error("Font bounds are unavailable.");
  for (const y of R) {
    let { start: v, end: x } = y;
    if (t.whiteSpace === "normal") {
      for (; v < x && /\s/.test(o[v]); ) v++;
      for (; x > v && /\s/.test(o[x - 1]); ) x--;
    }
    if (v === x) continue;
    d.setStart(n, v), d.setEnd(n, x);
    const S = d.getBoundingClientRect(), T = t.whiteSpace === "normal" ? o.slice(v, x).replace(/\s+/g, " ") : o.slice(v, x), P = (S.left - l.left) / s + E, I = S.height / h, U = (S.top - l.top) / h + (I - b - M) / 2 + b + E;
    g.fillText(T, P, U);
  }
  const L = Math.max(8, r * 0.12);
  return {
    pixels: de(g.getImageData(0, 0, C.width, C.height), _, L),
    width: C.width,
    height: C.height,
    cssWidth: z,
    cssHeight: w,
    // Canvas placement is anchored to the host's border-box rectangle. The
    // renderer translates that viewport-space target into the canvas's actual
    // absolute-positioning context, which may differ for fragmented inlines.
    left: -E,
    top: -E,
    scaleX: s,
    scaleY: h,
    fontSize: r,
    distanceRange: L
  };
}
const pe = (a, e, t, i) => Number.isFinite(a) ? Math.max(t, Math.min(i, a)) : e;
function we(a) {
  var g;
  const { children: e, shader: t = "resin", onError: i, ...o } = a, n = H(null), r = H(null), l = H(null), c = H(null), [s, h] = se(!1), d = H({ onError: i });
  d.current = { onError: i };
  const R = {
    puffiness: pe(o.puffiness ?? 0.5, 0.5, 0, 1),
    baseColor: /^#[0-9a-f]{6}$/i.test(o.baseColor ?? "") ? o.baseColor : "#111111",
    shadowColor: /^#[0-9a-f]{6}$/i.test(o.shadowColor ?? "") ? o.shadowColor : "#000000",
    bounceShadowColor: /^#[0-9a-f]{6}$/i.test(o.bounceShadowColor ?? "") ? o.bounceShadowColor : "#000000",
    highlightColor: /^#[0-9a-f]{6}$/i.test(o.highlightColor ?? "") ? o.highlightColor : "#ffffff",
    cornerRoundness: o.cornerRoundness,
    radius: o.radius,
    smoothing: o.smoothing,
    lightX: o.lightX,
    lightY: o.lightY,
    lightZ: o.lightZ,
    highlightSize: o.highlightSize,
    glossStrength: o.glossStrength,
    ambient: o.ambient,
    bounceStrength: o.bounceStrength
  }, k = H(R);
  k.current = R;
  const E = Y(e) && typeof e.type == "string" && /^(h[1-6]|p|span)$/.test(e.type), z = E && (typeof e.props.children == "string" || typeof e.props.children == "number"), w = Y(e) ? Number.parseInt(ae) >= 19 ? e.props.ref : e.ref : void 0, _ = H(void 0), C = le((f) => {
    n.current = f, _.current ? (_.current(), _.current = void 0) : !f && typeof w == "function" && w(null), f && typeof w == "function" ? _.current = w(f) : w && typeof w != "function" && (w.current = f);
  }, [w]);
  return $(() => {
    const f = n.current, b = r.current;
    if (!f || !b || !z) return;
    let M = !1, L = 0, A = 0, y = "", v = !1, x = "", S = !1, T = !1;
    const P = () => {
      cancelAnimationFrame(A), A = 0, T = !1, b.style.visibility = "hidden", h(!1);
    }, I = (u) => {
      var D, q;
      M || (P(), (q = (D = d.current).onError) == null || q.call(D, u));
    }, U = () => Array.from(f.getClientRects(), (u) => `${u.left},${u.top},${u.width},${u.height}`).join(";"), ee = () => {
      if (L = 0, !(M || !v || !l.current || l.current.gl.isContextLost()))
        try {
          y = Q(f);
          const u = y + "|" + U() + "|" + f.textContent;
          if (u !== x || !S) {
            const D = ge(f, l.current.maxTextureSize);
            if (!D) {
              S = !1, P();
              return;
            }
            l.current.setMask(D), S = !0, x = u;
          }
          !T && !A && (A = requestAnimationFrame(() => {
            var D;
            A = 0, !(M || !S || (D = l.current) != null && D.gl.isContextLost()) && (T = !0, h(!0));
          }));
        } catch (u) {
          I(u);
        }
    }, F = () => {
      M || L || (L = requestAnimationFrame(ee));
    };
    c.current = F;
    const G = () => {
      try {
        if (t !== "resin") throw new Error("Only the Resin shader is supported.");
        l.current = new he(b, f, k.current, I), F();
      } catch (u) {
        I(u);
      }
    }, O = (u) => {
      u.preventDefault(), I(new Error("WebGL context lost; displaying HTML text."));
    }, V = () => {
      var u;
      (u = l.current) == null || u.dispose(), l.current = null, S = !1, G();
    };
    b.addEventListener("webglcontextlost", O), b.addEventListener("webglcontextrestored", V), G();
    const X = new ResizeObserver(F);
    X.observe(f);
    const B = new MutationObserver(F), K = getComputedStyle(f).display.startsWith("inline"), te = K && f.parentElement ? f.parentElement : f;
    if (B.observe(te, { characterData: !0, childList: !0, subtree: !0 }), K) {
      let u = f.parentElement;
      for (; u != null && u.parentElement && getComputedStyle(u).display.startsWith("inline"); )
        u = u.parentElement;
      u && X.observe(u);
    }
    const N = () => {
      v = !0, S = !1, F();
    };
    document.fonts.ready.then(N), document.fonts.addEventListener("loadingdone", N);
    const ie = window.setInterval(() => {
      !document.hidden && Q(f) !== y && F();
    }, 400);
    return () => {
      var u;
      M = !0, cancelAnimationFrame(L), cancelAnimationFrame(A), clearInterval(ie), c.current = null, X.disconnect(), B.disconnect(), document.fonts.removeEventListener("loadingdone", N), b.removeEventListener("webglcontextlost", O), b.removeEventListener("webglcontextrestored", V), (u = l.current) == null || u.dispose(), l.current = null;
    };
  }, [z, e.type, t]), $(() => {
    var f;
    (f = l.current) == null || f.setOptions(k.current);
  }), $(() => {
    var f;
    (f = c.current) == null || f.call(c);
  }, [e.props.children, e.props.className, e.props.style]), !E || !z ? e : ue(
    e,
    {
      ref: C,
      "data-shader-state": s ? "ready" : "fallback",
      style: {
        ...e.props.style,
        position: (g = e.props.style) != null && g.position && e.props.style.position !== "static" ? e.props.style.position : "relative",
        ...s ? { WebkitTextFillColor: "transparent" } : {}
      }
    },
    String(e.props.children),
    /* @__PURE__ */ re("canvas", { ref: r, "aria-hidden": "true", style: {
      position: "absolute",
      background: "transparent",
      pointerEvents: "none",
      visibility: s ? "visible" : "hidden",
      display: "block",
      maxWidth: "none",
      userSelect: "none"
    } }, "shader-canvas")
  );
}
export {
  we as TextRender,
  p as resin,
  Se as skins
};
