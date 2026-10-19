import { maskWithDistance } from './distance';

export interface TextMask {
  pixels: Uint8Array;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  fontSize: number;
  distanceRange: number;
}
interface Line { start: number; end: number; top: number }
const px = (value: string) => Number.parseFloat(value) || 0;

export function typographySignature(element: HTMLElement): string {
  const s = getComputedStyle(element);
  return [s.font, s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.fontStretch,
    s.lineHeight, s.letterSpacing, s.wordSpacing, s.textAlign, s.whiteSpace,
    s.direction, s.writingMode, s.textTransform, s.fontFeatureSettings,
    s.fontVariationSettings, s.fontVariant, s.fontKerning, s.textIndent,
    s.textDecorationLine, s.textShadow, s.wordBreak, s.overflowWrap, s.hyphens,
    s.width, s.height, s.padding, s.borderWidth, devicePixelRatio].join('|');
}

export function createTextMask(element: HTMLElement, maxTextureSize: number): TextMask | null {
  const s = getComputedStyle(element);
  const textNodes = Array.from(element.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
  if (!textNodes.length || !element.textContent?.trim()) return null;
  const text = textNodes.map(n => n.textContent).join('');
  if (textNodes.length !== 1) throw new Error('ShaderText expects one plain text child.');
  if (s.writingMode !== 'horizontal-tb' || s.direction !== 'ltr' ||
    /[\u0590-\u08ff\u0900-\u109f\u1780-\u17ff\u200e-\u200f\u202a-\u202e\u2066-\u2069]/u.test(text) ||
    !['normal', 'pre-wrap'].includes(s.whiteSpace) || s.textAlign === 'justify' ||
    s.textTransform !== 'none' || s.fontFeatureSettings !== 'normal' ||
    s.fontVariationSettings !== 'normal' || s.fontVariant !== 'normal' ||
    s.fontStretch !== '100%' && s.fontStretch !== 'normal' ||
    s.textDecorationLine !== 'none' || s.textShadow !== 'none' ||
    s.hyphens === 'auto' || text.includes('\u00ad') || text.includes('\t')) {
    throw new Error('This typography is outside the initial ShaderText support; displaying HTML text.');
  }
  const node = textNodes[0];
  const fontSize = px(s.fontSize);
  const rect = element.getBoundingClientRect();
  // Range rects are in viewport coordinates. Undo ordinary axis-aligned CSS scaling.
  const layoutWidth = element.offsetWidth;
  const scaleX = rect.width / (layoutWidth || rect.width || 1);
  const scaleY = rect.height / (element.offsetHeight || rect.height || 1);
  if (!rect.width || !rect.height || !fontSize) return null;
  const range = document.createRange();
  const lines: Line[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const segment of segmenter.segment(text)) {
    const start = segment.index, end = start + segment.segment.length;
    range.setStart(node, start); range.setEnd(node, end);
    const r = range.getBoundingClientRect();
    if (!r.height || segment.segment === '\n') continue;
    const previous = lines.at(-1);
    if (previous && Math.abs(r.top - previous.top) < 1) previous.end = end;
    else lines.push({ start, end, top: r.top });
  }
  const pad = Math.ceil(fontSize * 0.25 + 2);
  const cssWidth = rect.width / scaleX + pad * 2;
  const cssHeight = rect.height / scaleY + pad * 2;
  // Bound CPU transform work as well as GPU size for unusually large text blocks.
  const ratio = Math.min(devicePixelRatio || 1, 2, maxTextureSize / cssWidth, maxTextureSize / cssHeight,
    Math.sqrt(3_000_000 / (cssWidth * cssHeight)));
  if (ratio < 0.25) throw new Error('Text surface is too large; displaying HTML text.');
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(cssWidth * ratio));
  canvas.height = Math.max(1, Math.ceil(cssHeight * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.scale(ratio, ratio);
  ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.direction = 'ltr';
  ctx.fontKerning = s.fontKerning as CanvasFontKerning;
  if (px(s.letterSpacing) && !('letterSpacing' in ctx)) throw new Error('Canvas letter spacing is unavailable.');
  if (px(s.wordSpacing) && !('wordSpacing' in ctx)) throw new Error('Canvas word spacing is unavailable.');
  ctx.letterSpacing = s.letterSpacing === 'normal' ? '0px' : s.letterSpacing;
  ctx.wordSpacing = s.wordSpacing === 'normal' ? '0px' : s.wordSpacing;
  const metrics = ctx.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) throw new Error('Font bounds are unavailable.');
  for (const line of lines) {
    let { start, end } = line;
    if (s.whiteSpace === 'normal') {
      while (start < end && /\s/.test(text[start])) start++;
      while (end > start && /\s/.test(text[end - 1])) end--;
    }
    if (start === end) continue;
    range.setStart(node, start); range.setEnd(node, end);
    const lineRect = range.getBoundingClientRect();
    const value = s.whiteSpace === 'normal' ? text.slice(start, end).replace(/\s+/g, ' ') : text.slice(start, end);
    const x = (lineRect.left - rect.left) / scaleX + pad;
    // Browser text ranges include the font em box, independent of CSS line-height.
    const height = lineRect.height / scaleY;
    const baseline = (lineRect.top - rect.top) / scaleY + (height - ascent - descent) / 2 + ascent + pad;
    ctx.fillText(value, x, baseline);
  }
  const distanceRange = Math.max(8, fontSize * 0.12);
  return {
    pixels: maskWithDistance(ctx.getImageData(0, 0, canvas.width, canvas.height), ratio, distanceRange),
    width: canvas.width, height: canvas.height, cssWidth, cssHeight,
    // Canvas placement is anchored to the host's border-box rectangle. The
    // renderer translates that viewport-space target into the canvas's actual
    // absolute-positioning context, which may differ for fragmented inlines.
    left: -pad, top: -pad, scaleX, scaleY, fontSize, distanceRange,
  };
}
