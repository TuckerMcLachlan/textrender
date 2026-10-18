import type { SkinName } from './types';

type PuffSkin = {
  readonly id: SkinName;
  readonly label: string;
  readonly fragment: string;
};

export const puff: PuffSkin = {
  id: 'puff', label: 'Puff',
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
}`,
};

export const skins: Readonly<Record<SkinName, PuffSkin>> = { puff };
