import { TextRender } from '../src/lib';
import type { SkinName } from '../src/lib';

const child = <span>Shader text</span>;

<TextRender shader="puff" puffiness={0.8} cornerRoundness={0.6} puffColor="#112233"
  shadowColor="#080018" secondaryShadowColor="#240018" secondaryShadowStrength={0.4}
  highlightColor="#ffd8f5" expansion={0.06}>{child}</TextRender>;
<TextRender intensity={1.2} puffiness={0.8}>{child}</TextRender>;

// @ts-expect-error Puff controls are direct props; there is no nested options object.
<TextRender options={{ puffiness: 0.8 }}>{child}</TextRender>;
// @ts-expect-error Puff is the only supported shader.
<TextRender shader="overgrown-grass">{child}</TextRender>;
// @ts-expect-error Removed shader options are not accepted.
<TextRender shader="puff" grassLength={1.5}>{child}</TextRender>;
// @ts-expect-error Pointer interactivity is not part of TextRender options.
<TextRender interactive={false}>{child}</TextRender>;
// @ts-expect-error Custom shader objects are no longer supported.
<TextRender shader={{ id: 'custom', label: 'Custom', fragment: '' }}>{child}</TextRender>;

declare const dynamicShader: SkinName;
<TextRender shader={dynamicShader} speed={1}>{child}</TextRender>;
