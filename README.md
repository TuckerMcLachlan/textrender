# textrender

Procedural shader materials for React typography.

## Installation

```bash
npm install textrender
```

React and React DOM 18 or later are required peer dependencies.

## Usage

```tsx
import { TextRender } from 'textrender';

export function Heading() {
  return (
    <TextRender puff={0.8} baseColor="#112233">
      <h1>Shader text</h1>
    </TextRender>
  );
}
```

`TextRender` progressively enhances a plain text `h1`–`h6`, `p`, or `span`
element. Rich children are returned as ordinary HTML and are not sent through the shader renderer.

### Next.js App Router

The published entry includes `"use client"`, so a Server Component can import
and render `TextRender` directly without a client wrapper:

```tsx
// app/page.tsx
import { TextRender } from 'textrender';

export default function Page() {
  return (
    <TextRender puff={0.8} baseColor="#112233">
      <h1>Shader text</h1>
    </TextRender>
  );
}
```

Props passed across the server-to-client boundary must be serializable. To use
callbacks such as `onError`, create a component with `"use client"` and define
the callback there. The shared entry also makes `resin` and `skins` client
exports; read their values within client code. Type-only imports remain usable
in server code.

See the [Next.js guidance for library authors](https://nextjs.org/docs/app/getting-started/server-and-client-components#third-party-components).

## API

### `TextRender`

```ts
type TextRenderProps = BaseTextRenderProps & {
  shader?: 'resin';
  // ResinOptions
};
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `shader` | `'resin'` | `'resin'` | Selects the supported shader skin. |
| `onError` | `(error: Error) => void` | — | Called when rendering falls back to ordinary HTML text. |

### Resin options

All numeric controls are normalized unless noted otherwise. Values outside a
documented range are clamped by the renderer.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `puff` | `number` (`0`–`1`) | `0.5` | Outline expansion and rounding intensity; maps to at most `0.035em` expansion. |
| `baseColor` | six-digit hex string | `'#111111'` | Main material color. |
| `shadowColor` | six-digit hex string | `'#000000'` | Color of the darkest unlit areas. |
| `bounceShadowColor` | six-digit hex string | `'#000000'` | Color of the opposing-light shadow. |
| `highlightColor` | six-digit hex string | `'#ffffff'` | Glossy highlight color. |
| `roundness` | `number` (`0`–`1`) | `0` | Rounds glyph corners and the expanded outline. |
| `depth` | `number` (`0`–`1`) | `0.5` | Crown depth; maps to `0`–`0.2` of the font size. |
| `smoothing` | `number` (`0`–`1`) | `0` | Normal smoothing; maps to `0.025`–`0.060`. |
| `lightX` | `number` (`-1`–`1`) | `-0.65` | Horizontal primary-light direction. |
| `lightY` | `number` (`-1`–`1`) | `0.85` | Vertical primary-light direction. |
| `lightZ` | `number` (`0`–`1`) | `1` | Primary-light height; maps to `0`–`0.5`. |
| `highlightSize` | `number` (`0`–`1`) | `18 / 35` | Highlight sharpness; maps from exponent `40` to `5`. |
| `gloss` | `number` (`0`–`1`) | `0.16` | Base specular contribution. |
| `brightness` | `number` (`0`–`1`) | `0.4` | Base diffuse brightness. |
| `bounceStrength` | `number` (`0`–`1`) | `0` | Strength of the opposing-light shadow. |

Example with the full Resin control surface:

```tsx
<TextRender
  shader="resin"
  puff={0.8}
  baseColor="#112233"
  shadowColor="#080018"
  bounceShadowColor="#240018"
  highlightColor="#ffd8f5"
  roundness={0.6}
  depth={0.1}
  smoothing={0.03}
  lightX={-0.7}
  lightY={0.8}
  lightZ={0.9}
  highlightSize={0.5}
  gloss={0.2}
  brightness={0.4}
  bounceStrength={0.4}
>
  <span>Resin text</span>
</TextRender>
```

### Exports

The package exports:

- `TextRender` — the React component.
- `resin` — the Resin skin definition and default values.
- `skins` — the map of supported skin definitions.
- `TextRenderProps`, `BaseTextRenderProps`, `ResinOptions`, and
  `ResolvedResinOptions`.
- `SkinName`, `SkinOptions`, `SkinOptionsMap`, `SkinProps`, `OptionsFor`, and
  `SkinDefinition`.

## Compatibility

`TextRender` is designed for modern evergreen browsers. The supported browser
families are Chromium, Firefox, and WebKit; these are exercised in CI with the
Playwright browser matrix. Capability detection is authoritative, so a browser
version is supported only when it provides the APIs below.

The component requires:

- React and React DOM 18 or later.
- WebGL2 for the shader canvas.
- Canvas 2D text rendering with `ImageData`, `getImageData()`, font metrics,
  and the text spacing properties used by the element.
- `ResizeObserver`, `IntersectionObserver`, and `MutationObserver`.
- `Intl.Segmenter` with grapheme segmentation.
- The Font Loading API, including `document.fonts.ready` and the
  `loadingdone` event.

Legacy browsers, server-side environments without a browser mount, and
browser contexts missing one of these capabilities are not shader-rendering
targets. No polyfills are bundled.

## Fallback behavior

The component progressively enhances supported plain text elements. If the
child shape or typography is outside the supported subset, or if a required
browser capability, WebGL context, shader program, canvas operation, font
metric, or text surface allocation fails:

- The original HTML text remains visible and readable.
- The shader canvas remains hidden and is never revealed as a partial render.
- The element exposes `data-shader-state="fallback"`.
- The optional `onError` callback receives an `Error` describing the reason.

If a WebGL context is lost, the component falls back to HTML text and attempts
to initialize the renderer again when the context is restored. Applications
can use `onError` for diagnostics or telemetry; fallback is intentionally
non-fatal to the surrounding React tree.

Only plain string or numeric children inside `h1`–`h6`, `p`, and `span`
elements are enhanced. Rich children are returned as ordinary HTML.

## Development

```bash
npm ci
npm run dev
```

Run the typecheck, build, and Playwright browser suite with:

```bash
npm run typecheck
npm run build
npm test
```

Run the packed-package consumer checks against React 18 and React 19 with:

```bash
npm run test:consumer
```

Each version uses an isolated installation with matching React DOM and React
type packages, and checks TypeScript usage, server rendering, WebGL output,
and child refs. To check one version, use `npm run test:consumer -- --react=18`
or `npm run test:consumer -- --react=19`.
