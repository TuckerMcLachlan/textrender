import type { CSSProperties, ReactElement, Ref } from 'react';

export interface ResinOptions {
  /** Resin outline expansion and rounding, 0–1. Maps to 0–0.035em expansion. Default: 0.5. */
  puff?: number;
  /** Six-digit hex Resin base colour. Default: #111111. */
  baseColor?: string;
  /** Six-digit hex colour used for the darkest unlit areas. Default: #000000. */
  shadowColor?: string;
  /** Six-digit hex colour for the shadow cast by the opposing light. Default: #000000. */
  bounceShadowColor?: string;
  /** Six-digit hex colour used for glossy specular highlights. Default: #ffffff. */
  highlightColor?: string;
  /** Two-dimensional glyph-corner rounding, 0–1. Default: 0. */
  roundness?: number;
  /** Crown depth, normalized from 0–1 to a 0–0.2 font-size fraction. Default: 0.5. */
  depth?: number;
  /** Normal sampling distance, normalized from 0–1 to 0.025–0.060. Default: 0. */
  smoothing?: number;
  /** Horizontal direction of the primary light, -1–1. */
  lightX?: number;
  /** Vertical direction of the primary light, -1–1. */
  lightY?: number;
  /** Height of the primary light, normalized from 0–1 to 0–0.5. Default: 1. */
  lightZ?: number;
  /** Primary highlight exponent, reverse-normalized from 0–1 to 40–5. Default: 18/35. */
  highlightSize?: number;
  /** Base specular contribution. Default: 0.16. */
  gloss?: number;
  /** Base diffuse brightness. Default: 0.4. */
  brightness?: number;
  /** Strength of the shadow cast by the light opposite the key light, 0–1. Default: 0. */
  bounceStrength?: number;
}
export type ResolvedResinOptions = Required<ResinOptions>;

export interface SkinOptionsMap {
  resin: ResinOptions;
}
export type SkinName = keyof SkinOptionsMap;
export type SkinOptions = SkinOptionsMap[SkinName];
export type OptionsFor<S extends SkinName> = SkinOptionsMap[S];

export interface TextElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}
export interface BaseTextRenderProps {
  children: ReactElement<TextElementProps>;
  /** Called when rendering falls back to ordinary HTML text. */
  onError?: (error: Error) => void;
}
export type SkinProps<S extends SkinName = SkinName> = S extends SkinName
  ? (S extends 'resin' ? { shader?: S } : { shader: S }) & OptionsFor<S>
  : never;
export type TextRenderProps = BaseTextRenderProps & SkinProps;
