var oe = Object.defineProperty;
var re = (u, e, i) => e in u ? oe(u, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : u[e] = i;
var v = (u, e, i) => re(u, typeof e != "symbol" ? e + "" : e, i);
import { jsx as se } from "react/jsx-runtime";
import { useRef as z, useState as ae, isValidElement as j, version as ue, useCallback as le, useEffect as $, cloneElement as fe } from "react";
const ce = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`, he = (u, e = !1) => `#version 300 es
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
${u}
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
}`, Q = {
  id: "puff",
  label: "Puff",
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
}, ye = { puff: Q }, de = {
  cornerRoundness: 0,
  expansion: 0.065,
  radius: 0.1,
  normalSmoothing: 0.022,
  grainStrength: 0.055,
  keyLightX: -0.65,
  keyLightY: 0.85,
  keyLightZ: 0.85,
  highlightSize: 22,
  rimStrength: 0.55,
  glossStrength: 0.16,
  ambient: 0.4,
  secondaryShadowStrength: 0
};
class pe {
  constructor(e, i, o, s) {
    v(this, "gl");
    v(this, "program", null);
    v(this, "texture");
    v(this, "uniforms", /* @__PURE__ */ new Map());
    v(this, "mask", null);
    v(this, "frame", 0);
    v(this, "elapsed", 0);
    v(this, "last", 0);
    v(this, "visible", !0);
    v(this, "options");
    v(this, "reduced");
    v(this, "disposed", !1);
    v(this, "observer");
    v(this, "tick", (e) => {
      if (this.frame = 0, this.disposed || !this.visible || document.hidden) {
        this.last = 0;
        return;
      }
      const i = this.last ? Math.min((e - this.last) / 1e3, 0.05) : 0;
      this.last = e;
      const o = !this.reduced.matches && this.options.animated && this.options.time === void 0 && this.options.speed > 0;
      o && (this.elapsed += i * this.options.speed);
      try {
        this.draw();
      } catch (s) {
        this.fail(s);
        return;
      }
      o ? this.frame = requestAnimationFrame(this.tick) : this.last = 0;
    });
    v(this, "wake", () => {
      this.disposed || (!this.visible || document.hidden ? (cancelAnimationFrame(this.frame), this.frame = 0, this.last = 0) : this.frame || (this.frame = requestAnimationFrame(this.tick)));
    });
    this.canvas = e, this.host = i, this.fail = s;
    const t = e.getContext("webgl2", { alpha: !0, antialias: !1, premultipliedAlpha: !0, depth: !1, stencil: !1 });
    if (!t) throw new Error("WebGL2 is unavailable.");
    this.gl = t;
    const r = t.createTexture();
    if (!r) throw new Error("Unable to allocate a text texture.");
    this.texture = r, this.options = o, t.bindTexture(t.TEXTURE_2D, r), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), this.reduced = matchMedia("(prefers-reduced-motion: reduce)"), this.reduced.addEventListener("change", this.wake), document.addEventListener("visibilitychange", this.wake), this.observer = new IntersectionObserver((a) => {
      this.visible = a[0].isIntersecting, this.wake();
    }), this.observer.observe(this.host), this.initializeProgram();
  }
  get maxTextureSize() {
    return Math.min(8192, this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
  }
  initializeProgram() {
    const e = he(Q.fragment, !0), i = this.gl, o = (a, l) => {
      const n = i.createShader(a);
      if (!n) throw new Error("Unable to allocate a shader.");
      if (i.shaderSource(n, l), i.compileShader(n), !i.getShaderParameter(n, i.COMPILE_STATUS)) {
        const h = i.getShaderInfoLog(n);
        throw i.deleteShader(n), new Error(`Puff shader: ${h}`);
      }
      return n;
    }, s = o(i.VERTEX_SHADER, ce);
    let t = null, r = null;
    try {
      if (t = o(i.FRAGMENT_SHADER, e), r = i.createProgram(), !r) throw new Error("Unable to allocate a shader program.");
      if (i.attachShader(r, s), i.attachShader(r, t), i.linkProgram(r), !i.getProgramParameter(r, i.LINK_STATUS)) throw new Error(i.getProgramInfoLog(r) || "Shader linking failed.");
    } catch (a) {
      throw r && i.deleteProgram(r), a;
    } finally {
      i.deleteShader(s), t && i.deleteShader(t);
    }
    this.program && i.deleteProgram(this.program), this.program = r, this.uniforms.clear(), this.wake();
  }
  setMask(e) {
    this.mask = e;
    const { canvas: i, gl: o } = this;
    i.width = e.width, i.height = e.height, Object.assign(i.style, {
      width: `${e.cssWidth}px`,
      height: `${e.cssHeight}px`,
      left: "0px",
      top: "0px"
    });
    const s = this.host.getBoundingClientRect(), t = i.getBoundingClientRect(), r = t.width / e.cssWidth || 1, a = t.height / e.cssHeight || 1;
    if (i.style.left = `${(s.left + e.left * e.scaleX - t.left) / r}px`, i.style.top = `${(s.top + e.top * e.scaleY - t.top) / a}px`, o.bindTexture(o.TEXTURE_2D, this.texture), o.texImage2D(o.TEXTURE_2D, 0, o.RGBA, e.width, e.height, 0, o.RGBA, o.UNSIGNED_BYTE, e.pixels), o.getError() !== o.NO_ERROR) throw new Error("Unable to upload the text mask.");
    this.draw(), this.wake();
  }
  setOptions(e) {
    this.options = e, this.wake();
  }
  location(e) {
    return this.uniforms.has(e) || this.uniforms.set(e, this.gl.getUniformLocation(this.program, e)), this.uniforms.get(e);
  }
  draw() {
    if (!this.program || !this.mask || this.disposed || this.gl.isContextLost()) return;
    const { gl: e, mask: i, options: o } = this;
    e.viewport(0, 0, i.width, i.height), e.useProgram(this.program), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.texture), e.uniform1i(this.location("u_mask"), 0), e.uniform2f(this.location("u_resolution"), i.width, i.height), e.uniform2f(this.location("u_cssSize"), i.cssWidth, i.cssHeight), e.uniform1f(this.location("u_fontSize"), i.fontSize), e.uniform1f(this.location("u_distanceRange"), i.distanceRange), e.uniform1f(this.location("u_time"), o.time ?? (this.reduced.matches ? 0 : this.elapsed)), e.uniform1f(this.location("u_intensity"), o.intensity), e.uniform1f(this.location("u_textureScale"), o.textureScale), e.uniform1f(this.location("u_seed"), o.seed);
    const s = o.puffiness ?? 0.5;
    e.uniform1f(this.location("u_puffiness"), Number.isFinite(s) ? Math.max(0, Math.min(1, s)) : 0.5);
    const t = Number.parseInt((o.puffColor ?? "#111111").slice(1), 16);
    e.uniform3f(this.location("u_puffColor"), (t >> 16 & 255) / 255, (t >> 8 & 255) / 255, (t & 255) / 255);
    const r = Number.parseInt((o.shadowColor ?? "#000000").slice(1), 16);
    e.uniform3f(this.location("u_puffShadowColor"), (r >> 16 & 255) / 255, (r >> 8 & 255) / 255, (r & 255) / 255);
    const a = Number.parseInt((o.secondaryShadowColor ?? "#000000").slice(1), 16);
    e.uniform3f(this.location("u_puffSecondaryShadowColor"), (a >> 16 & 255) / 255, (a >> 8 & 255) / 255, (a & 255) / 255);
    const l = Number.parseInt((o.highlightColor ?? "#ffffff").slice(1), 16);
    e.uniform3f(this.location("u_puffHighlightColor"), (l >> 16 & 255) / 255, (l >> 8 & 255) / 255, (l & 255) / 255);
    const n = {
      ...de,
      ...Object.fromEntries(Object.entries(o.puffSettings ?? {}).filter(([, h]) => h !== void 0))
    };
    e.uniform1f(this.location("u_puffCornerRoundness"), Math.max(0, Math.min(1, n.cornerRoundness))), e.uniform1f(this.location("u_puffExpansion"), n.expansion), e.uniform1f(this.location("u_puffRadius"), n.radius), e.uniform1f(this.location("u_puffNormalSmoothing"), n.normalSmoothing), e.uniform1f(this.location("u_puffGrainStrength"), n.grainStrength), e.uniform3f(this.location("u_puffKeyLight"), n.keyLightX, n.keyLightY, n.keyLightZ), e.uniform1f(this.location("u_puffHighlightSize"), n.highlightSize), e.uniform1f(this.location("u_puffRimStrength"), n.rimStrength), e.uniform1f(this.location("u_puffGlossStrength"), n.glossStrength), e.uniform1f(this.location("u_puffAmbient"), n.ambient), e.uniform1f(this.location("u_puffSecondaryShadowStrength"), Math.max(0, Math.min(1, n.secondaryShadowStrength))), e.drawArrays(e.TRIANGLES, 0, 3);
  }
  dispose() {
    this.disposed = !0, cancelAnimationFrame(this.frame), this.observer.disconnect(), this.reduced.removeEventListener("change", this.wake), document.removeEventListener("visibilitychange", this.wake), this.gl.deleteTexture(this.texture), this.program && this.gl.deleteProgram(this.program);
  }
}
function Y(u, e, i, o, s) {
  let t = 0;
  o[0] = 0, s[0] = -1 / 0, s[1] = 1 / 0;
  for (let r = 1; r < i; r++) {
    let a = (u[r] + r * r - (u[o[t]] + o[t] * o[t])) / (2 * r - 2 * o[t]);
    for (; a <= s[t]; )
      t--, a = (u[r] + r * r - (u[o[t]] + o[t] * o[t])) / (2 * r - 2 * o[t]);
    t++, o[t] = r, s[t] = a, s[t + 1] = 1 / 0;
  }
  t = 0;
  for (let r = 0; r < i; r++) {
    for (; s[t + 1] < r; ) t++;
    e[r] = (r - o[t]) ** 2 + u[o[t]];
  }
}
function Z(u, e, i) {
  const o = Math.max(e, i), s = new Float64Array(o), t = new Float64Array(o), r = new Int32Array(o), a = new Float64Array(o + 1);
  for (let l = 0; l < e; l++) {
    for (let n = 0; n < i; n++) s[n] = u[n * e + l];
    Y(s, t, i, r, a);
    for (let n = 0; n < i; n++) u[n * e + l] = t[n];
  }
  for (let l = 0; l < i; l++) {
    for (let n = 0; n < e; n++) s[n] = u[l * e + n];
    Y(s, t, e, r, a);
    for (let n = 0; n < e; n++) u[l * e + n] = t[n];
  }
}
function ge(u, e, i) {
  const { width: o, height: s, data: t } = u, r = new Float64Array(o * s), a = new Float64Array(o * s);
  for (let n = 0; n < o * s; n++) {
    const h = t[n * 4 + 3] / 255;
    if (h === 1)
      r[n] = 1e12, a[n] = 0;
    else if (h === 0)
      r[n] = 0, a[n] = 1e12;
    else {
      const d = h - 0.5;
      r[n] = Math.max(0, d) ** 2, a[n] = Math.max(0, -d) ** 2;
    }
  }
  Z(r, o, s), Z(a, o, s);
  const l = new Uint8Array(o * s * 4);
  for (let n = 0; n < s; n++) for (let h = 0; h < o; h++) {
    const d = n * o + h, w = ((s - 1 - n) * o + h) * 4, M = (Math.sqrt(r[d]) - Math.sqrt(a[d])) / e;
    l[w] = t[d * 4 + 3], l[w + 1] = Math.round(Math.max(0, Math.min(1, 0.5 + M / (2 * i))) * 255), l[w + 3] = 255;
  }
  return l;
}
const O = (u) => Number.parseFloat(u) || 0;
function J(u) {
  const e = getComputedStyle(u);
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
function me(u, e) {
  var L;
  const i = getComputedStyle(u), o = Array.from(u.childNodes).filter((g) => g.nodeType === Node.TEXT_NODE);
  if (!o.length || !((L = u.textContent) != null && L.trim())) return null;
  const s = o.map((g) => g.textContent).join("");
  if (o.length !== 1) throw new Error("ShaderText expects one plain text child.");
  if (i.writingMode !== "horizontal-tb" || i.direction !== "ltr" || /[\u0590-\u08ff\u0900-\u109f\u1780-\u17ff\u200e-\u200f\u202a-\u202e\u2066-\u2069]/u.test(s) || !["normal", "pre-wrap"].includes(i.whiteSpace) || i.textAlign === "justify" || i.textTransform !== "none" || i.fontFeatureSettings !== "normal" || i.fontVariationSettings !== "normal" || i.fontVariant !== "normal" || i.fontStretch !== "100%" && i.fontStretch !== "normal" || i.textDecorationLine !== "none" || i.textShadow !== "none" || i.hyphens === "auto" || s.includes("­") || s.includes("	"))
    throw new Error("This typography is outside the initial ShaderText support; displaying HTML text.");
  const t = o[0], r = O(i.fontSize), a = u.getBoundingClientRect(), l = u.offsetWidth, n = a.width / (l || a.width || 1), h = a.height / (u.offsetHeight || a.height || 1);
  if (!a.width || !a.height || !r) return null;
  const d = document.createRange(), w = [], M = new Intl.Segmenter(void 0, { granularity: "grapheme" });
  for (const g of M.segment(s)) {
    const m = g.index, S = m + g.segment.length;
    d.setStart(t, m), d.setEnd(t, S);
    const R = d.getBoundingClientRect();
    if (!R.height || g.segment === `
`) continue;
    const _ = w.at(-1);
    _ && Math.abs(R.top - _.top) < 1 ? _.end = S : w.push({ start: m, end: S, top: R.top });
  }
  const b = Math.ceil(r * 0.25 + 2), k = a.width / n + b * 2, A = a.height / h + b * 2, x = Math.min(
    devicePixelRatio || 1,
    2,
    e / k,
    e / A,
    Math.sqrt(3e6 / (k * A))
  );
  if (x < 0.25) throw new Error("Text surface is too large; displaying HTML text.");
  const y = document.createElement("canvas");
  y.width = Math.max(1, Math.ceil(k * x)), y.height = Math.max(1, Math.ceil(A * x));
  const p = y.getContext("2d", { willReadFrequently: !0 });
  if (!p) throw new Error("Canvas 2D is unavailable.");
  if (p.scale(x, x), p.font = `${i.fontStyle} ${i.fontWeight} ${i.fontSize} ${i.fontFamily}`, p.textBaseline = "alphabetic", p.fillStyle = "#fff", p.direction = "ltr", p.fontKerning = i.fontKerning, O(i.letterSpacing) && !("letterSpacing" in p)) throw new Error("Canvas letter spacing is unavailable.");
  if (O(i.wordSpacing) && !("wordSpacing" in p)) throw new Error("Canvas word spacing is unavailable.");
  p.letterSpacing = i.letterSpacing === "normal" ? "0px" : i.letterSpacing, p.wordSpacing = i.wordSpacing === "normal" ? "0px" : i.wordSpacing;
  const F = p.measureText("Hg"), c = F.fontBoundingBoxAscent, E = F.fontBoundingBoxDescent;
  if (!Number.isFinite(c) || !Number.isFinite(E)) throw new Error("Font bounds are unavailable.");
  for (const g of w) {
    let { start: m, end: S } = g;
    if (i.whiteSpace === "normal") {
      for (; m < S && /\s/.test(s[m]); ) m++;
      for (; S > m && /\s/.test(s[S - 1]); ) S--;
    }
    if (m === S) continue;
    d.setStart(t, m), d.setEnd(t, S);
    const R = d.getBoundingClientRect(), _ = i.whiteSpace === "normal" ? s.slice(m, S).replace(/\s+/g, " ") : s.slice(m, S), P = (R.left - a.left) / n + b, U = R.height / h, D = (R.top - a.top) / h + (U - c - E) / 2 + c + b;
    p.fillText(_, P, D);
  }
  const C = Math.max(8, r * 0.12);
  return {
    pixels: ge(p.getImageData(0, 0, y.width, y.height), x, C),
    width: y.width,
    height: y.height,
    cssWidth: k,
    cssHeight: A,
    // Canvas placement is anchored to the host's border-box rectangle. The
    // renderer translates that viewport-space target into the canvas's actual
    // absolute-positioning context, which may differ for fragmented inlines.
    left: -b,
    top: -b,
    scaleX: n,
    scaleY: h,
    fontSize: r,
    distanceRange: C
  };
}
const I = (u, e, i, o) => Number.isFinite(u) ? Math.max(i, Math.min(o, u)) : e;
function _e(u) {
  var F;
  const { children: e, shader: i = "puff", animated: o = !0, onError: s, ...t } = u, r = z(null), a = z(null), l = z(null), n = z(null), [h, d] = ae(!1), w = z({ onError: s });
  w.current = { onError: s };
  const M = {
    animated: o,
    speed: I(t.speed ?? 0.6, 0.6, 0, 5),
    intensity: I(t.intensity ?? 0.8, 0.8, 0, 2),
    textureScale: I(t.textureScale ?? 1, 1, 0.1, 6),
    seed: I(t.seed ?? 1, 1, -1e4, 1e4),
    puffiness: I(t.puffiness ?? 0.5, 0.5, 0, 1),
    puffColor: /^#[0-9a-f]{6}$/i.test(t.puffColor ?? "") ? t.puffColor : "#111111",
    shadowColor: /^#[0-9a-f]{6}$/i.test(t.shadowColor ?? "") ? t.shadowColor : "#000000",
    secondaryShadowColor: /^#[0-9a-f]{6}$/i.test(t.secondaryShadowColor ?? "") ? t.secondaryShadowColor : "#000000",
    highlightColor: /^#[0-9a-f]{6}$/i.test(t.highlightColor ?? "") ? t.highlightColor : "#ffffff",
    puffSettings: {
      cornerRoundness: t.cornerRoundness,
      expansion: t.expansion,
      radius: t.radius,
      normalSmoothing: t.normalSmoothing,
      grainStrength: t.grainStrength,
      keyLightX: t.keyLightX,
      keyLightY: t.keyLightY,
      keyLightZ: t.keyLightZ,
      highlightSize: t.highlightSize,
      rimStrength: t.rimStrength,
      glossStrength: t.glossStrength,
      ambient: t.ambient,
      secondaryShadowStrength: t.secondaryShadowStrength
    },
    time: t.time === void 0 ? void 0 : I(t.time, 0, 0, 1e7)
  }, b = z(M);
  b.current = M;
  const k = j(e) && typeof e.type == "string" && /^(h[1-6]|p|span)$/.test(e.type), A = k && (typeof e.props.children == "string" || typeof e.props.children == "number"), x = j(e) ? Number.parseInt(ue) >= 19 ? e.props.ref : e.ref : void 0, y = z(void 0), p = le((c) => {
    r.current = c, y.current ? (y.current(), y.current = void 0) : !c && typeof x == "function" && x(null), c && typeof x == "function" ? y.current = x(c) : x && typeof x != "function" && (x.current = c);
  }, [x]);
  return $(() => {
    const c = r.current, E = a.current;
    if (!c || !E || !A) return;
    let C = !1, L = 0, g = 0, m = "", S = !1, R = "", _ = !1, P = !1;
    const U = () => {
      cancelAnimationFrame(g), g = 0, P = !1, E.style.visibility = "hidden", d(!1);
    }, D = (f) => {
      var T, q;
      C || (U(), (q = (T = w.current).onError) == null || q.call(T, f));
    }, ee = () => Array.from(c.getClientRects(), (f) => `${f.left},${f.top},${f.width},${f.height}`).join(";"), te = () => {
      if (L = 0, !(C || !S || !l.current || l.current.gl.isContextLost()))
        try {
          m = J(c);
          const f = m + "|" + ee() + "|" + c.textContent;
          if (f !== R || !_) {
            const T = me(c, l.current.maxTextureSize);
            if (!T) {
              _ = !1, U();
              return;
            }
            l.current.setMask(T), _ = !0, R = f;
          }
          !P && !g && (g = requestAnimationFrame(() => {
            var T;
            g = 0, !(C || !_ || (T = l.current) != null && T.gl.isContextLost()) && (P = !0, d(!0));
          }));
        } catch (f) {
          D(f);
        }
    }, H = () => {
      C || L || (L = requestAnimationFrame(te));
    };
    n.current = H;
    const W = () => {
      try {
        if (i !== "puff") throw new Error("Only the Puff shader is supported.");
        l.current = new pe(E, c, b.current, D), H();
      } catch (f) {
        D(f);
      }
    }, G = (f) => {
      f.preventDefault(), D(new Error("WebGL context lost; displaying HTML text."));
    }, V = () => {
      var f;
      (f = l.current) == null || f.dispose(), l.current = null, _ = !1, W();
    };
    E.addEventListener("webglcontextlost", G), E.addEventListener("webglcontextrestored", V), W();
    const N = new ResizeObserver(H);
    N.observe(c);
    const B = new MutationObserver(H), K = getComputedStyle(c).display.startsWith("inline"), ie = K && c.parentElement ? c.parentElement : c;
    if (B.observe(ie, { characterData: !0, childList: !0, subtree: !0 }), K) {
      let f = c.parentElement;
      for (; f != null && f.parentElement && getComputedStyle(f).display.startsWith("inline"); )
        f = f.parentElement;
      f && N.observe(f);
    }
    const X = () => {
      S = !0, _ = !1, H();
    };
    document.fonts.ready.then(X), document.fonts.addEventListener("loadingdone", X);
    const ne = window.setInterval(() => {
      !document.hidden && J(c) !== m && H();
    }, 400);
    return () => {
      var f;
      C = !0, cancelAnimationFrame(L), cancelAnimationFrame(g), clearInterval(ne), n.current = null, N.disconnect(), B.disconnect(), document.fonts.removeEventListener("loadingdone", X), E.removeEventListener("webglcontextlost", G), E.removeEventListener("webglcontextrestored", V), (f = l.current) == null || f.dispose(), l.current = null;
    };
  }, [A, e.type, i]), $(() => {
    var c;
    (c = l.current) == null || c.setOptions(b.current);
  }), $(() => {
    var c;
    (c = n.current) == null || c.call(n);
  }, [e.props.children, e.props.className, e.props.style]), !k || !A ? e : fe(
    e,
    {
      ref: p,
      "data-shader-state": h ? "ready" : "fallback",
      style: {
        ...e.props.style,
        position: (F = e.props.style) != null && F.position && e.props.style.position !== "static" ? e.props.style.position : "relative",
        ...h ? { WebkitTextFillColor: "transparent" } : {}
      }
    },
    String(e.props.children),
    /* @__PURE__ */ se("canvas", { ref: a, "aria-hidden": "true", style: {
      position: "absolute",
      background: "transparent",
      pointerEvents: "none",
      visibility: h ? "visible" : "hidden",
      display: "block",
      maxWidth: "none",
      userSelect: "none"
    } }, "shader-canvas")
  );
}
export {
  _e as TextRender,
  Q as puff,
  ye as skins
};
