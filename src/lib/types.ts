import type { CSSProperties, ReactElement, Ref } from 'react';

export interface ResinOptions {
  /** Resin outline expansion and rounding, 0–1. Maps to 0–0.035em expansion. Default: 0.5. */
  puffiness?: number;
  /** Six-digit hex Resin base colour. Default: #111111. */
  baseColor?: string;
  /** Six-digit hex colour used for the darkest unlit areas. Default: #000000. */
  shadowColor?: string;
  /** Six-digit hex colour for the shadow cast by the opposing light. Default: #000000. */
  bounceShadowColor?: string;
  /** Six-digit hex colour used for glossy specular highlights. Default: #ffffff. */
  highlightColor?: string;
  /** Two-dimensional glyph-corner rounding, 0–1. Default: 0. */
  cornerRoundness?: number;
  /** Crown radius as a fraction of font size. Default: 0.1. */
  radius?: number;
  /** Normal sampling distance as a fraction of font size. Default: 0.022. */
  smoothing?: number;
  /** Direction and height of the primary light. */
  lightX?: number;
  lightY?: number;
  lightZ?: number;
  /** Primary highlight exponent. Lower values make a broader highlight. Default: 22. */
  highlightSize?: number;
  /** Base specular contribution. Default: 0.16. */
  glossStrength?: number;
  /** Base diffuse brightness. Default: 0.4. */
  ambient?: number;
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
