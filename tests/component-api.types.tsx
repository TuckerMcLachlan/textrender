import { TextRender } from '../src/lib';
import type { SkinName } from '../src/lib';

const child = <span>Shader text</span>;

<TextRender shader="resin" puffiness={0.8} cornerRoundness={0.6} baseColor="#112233"
  shadowColor="#080018" bounceShadowColor="#240018" bounceStrength={0.4}
  highlightColor="#ffd8f5" smoothing={0.03} lightX={-0.7} lightY={0.8} lightZ={0.9}>{child}</TextRender>;
<TextRender puffiness={0.8}>{child}</TextRender>;

// @ts-expect-error Resin controls are direct props; there is no nested options object.
<TextRender options={{ puffiness: 0.8 }}>{child}</TextRender>;
// @ts-expect-error Resin is the only supported shader.
<TextRender shader="overgrown-grass">{child}</TextRender>;
// @ts-expect-error Removed shader options are not accepted.
<TextRender shader="resin" grassLength={1.5}>{child}</TextRender>;
// @ts-expect-error Expansion is folded into puffiness.
<TextRender expansion={0.06}>{child}</TextRender>;
// @ts-expect-error Grain and rim strength are fixed internal values.
<TextRender grainStrength={0.1} rimStrength={0.5}>{child}</TextRender>;
// @ts-expect-error Renamed Resin props are not accepted.
<TextRender puffColor="#112233" normalSmoothing={0.03} keyLightX={-0.7}>{child}</TextRender>;
// @ts-expect-error Renamed secondary-shadow props are not accepted.
<TextRender secondaryShadowColor="#240018" secondaryShadowStrength={0.4}>{child}</TextRender>;
// @ts-expect-error Pointer interactivity is not part of TextRender options.
<TextRender interactive={false}>{child}</TextRender>;
// @ts-expect-error Custom shader objects are no longer supported.
<TextRender shader={{ id: 'custom', label: 'Custom', fragment: '' }}>{child}</TextRender>;

declare const dynamicShader: SkinName;
<TextRender shader={dynamicShader}>{child}</TextRender>;
