import type { CSSProperties, ReactElement, Ref } from 'react';
export type SkinName = 'puff';
export interface PuffSettings {
    /** Two-dimensional glyph-corner rounding, 0–1. Default: 0. */
    cornerRoundness: number;
    /** Glyph expansion as a fraction of font size. Default: 0.065. */
    expansion: number;
    /** Crown radius as a fraction of font size. Default: 0.1. */
    radius: number;
    /** Normal sampling distance as a fraction of font size. Default: 0.022. */
    normalSmoothing: number;
    /** Amount of fine surface variation. Default: 0.055. */
    grainStrength: number;
    /** Direction and height of the primary light. */
    keyLightX: number;
    keyLightY: number;
    keyLightZ: number;
    /** Primary highlight exponent. Lower values make a broader highlight. Default: 22. */
    highlightSize: number;
    /** Edge-light contribution. Default: 0.55. */
    rimStrength: number;
    /** Base specular contribution. Default: 0.16. */
    glossStrength: number;
    /** Base diffuse brightness. Default: 0.4. */
    ambient: number;
    /** Strength of the shadow cast by the light opposite the key light, 0–1. Default: 0. */
    secondaryShadowStrength: number;
}
export interface TextElementProps {
    children?: React.ReactNode;
    className?: string;
    style?: CSSProperties;
    ref?: Ref<HTMLElement>;
}
export interface CommonShaderOptions {
    speed?: number;
    intensity?: number;
    textureScale?: number;
    seed?: number;
    /** Fix shader time in seconds for stills and reproducible captures. */
    time?: number;
}
export interface PuffOptions extends CommonShaderOptions, Partial<PuffSettings> {
    /** Puff outline expansion and rounding, 0–1. 0 preserves the original glyph. Default: 0.5. */
    puffiness?: number;
    /** Six-digit hex Puff base colour. Default: #111111. */
    puffColor?: string;
    /** Six-digit hex colour used for the darkest unlit areas. Default: #000000. */
    shadowColor?: string;
    /** Six-digit hex colour for the shadow cast by the opposing light. Default: #000000. */
    secondaryShadowColor?: string;
    /** Six-digit hex colour used for glossy specular highlights. Default: #ffffff. */
    highlightColor?: string;
}
export interface TextRenderProps extends PuffOptions {
    children: ReactElement<TextElementProps>;
    shader?: SkinName;
    animated?: boolean;
    /** Called when rendering falls back to ordinary HTML text. */
    onError?: (error: Error) => void;
}
export interface RenderOptions {
    animated: boolean;
    speed: number;
    intensity: number;
    textureScale: number;
    seed: number;
    puffiness?: number;
    puffColor?: string;
    shadowColor?: string;
    secondaryShadowColor?: string;
    highlightColor?: string;
    puffSettings?: Partial<PuffSettings>;
    time?: number;
}
