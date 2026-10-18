export const vertex = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const fragment = (material: string, extendsGlyph = false) => `#version 300 es
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
${material}
void main() {
  float alpha = texture(u_mask, v_uv).r;
  ${extendsGlyph ? '' : 'if (alpha < 0.005) { outColor = vec4(0.0); return; }'}
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
  ${extendsGlyph ? 'vec4 result = material(s); alpha = clamp(result.a, 0.0, 1.0); vec3 col = max(result.rgb, vec3(0.0));' : 'vec3 col = max(material(s), vec3(0.0));'}
  outColor = vec4(col * alpha, alpha);
}`;
