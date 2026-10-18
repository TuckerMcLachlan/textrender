import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DialRoot, useDialKitController } from 'dialkit';
import { TextRender } from '../lib';
import type { PuffOptions } from '../lib';
import { DocsAside } from './DocsAside';

export function App() {
  const puffDial = useDialKitController('Puff shader', {
    shape: {
      puffiness: [0.61, 0, 1, 0.01],
      cornerRoundness: [0.41, 0, 1, 0.01],
      expansion: [0.015, 0, 0.12, 0.001],
      radius: [0.131, 0.04, 0.2, 0.001],
      normalSmoothing: [0.054, 0.005, 0.06, 0.001],
    },
    surface: {
      baseColor: '#ffffff',
      shadowColor: '#ffffff',
      secondaryShadowColor: '#001944',
      grainStrength: [0, 0, 0.2, 0.005],
    },
    lighting: {
      keyLight: { type: 'pad', x: [-0.9, -1, 1, 0.01], y: [0.93, -1, 1, 0.01], labels: { x: 'horizontal', y: 'vertical' } },
      lightHeight: [0.29, 0.1, 2, 0.01],
      highlightSize: [8, 2, 80, 1],
      rimStrength: [0, 0, 1, 0.01],
      glossStrength: [0.76, 0, 0.99, 0.01],
      ambient: [0.45, 0, 1, 0.01],
      secondaryShadowStrength: [0.56, 0, 1, 0.01],
      highlightColor: '#e36200',
    },
  }, { id: 'puff-shader-v8', persist: true, defaultCollapsed: true });
  const puff = puffDial.values;
  const [textRenderEnabled, setTextRenderEnabled] = useState(true);
  const [light, setLight] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [error, setError] = useState('');
  const typeStyle: CSSProperties = {
    fontFamily: '"Inter", sans-serif',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
  const puffProps: PuffOptions = {
    puffiness: puff.shape.puffiness,
    cornerRoundness: puff.shape.cornerRoundness,
    puffColor: puff.surface.baseColor,
    shadowColor: puff.surface.shadowColor,
    secondaryShadowColor: puff.surface.secondaryShadowColor,
    highlightColor: puff.lighting.highlightColor,
    expansion: puff.shape.expansion,
    radius: puff.shape.radius,
    normalSmoothing: puff.shape.normalSmoothing,
    grainStrength: puff.surface.grainStrength,
    keyLightX: puff.lighting.keyLight.x,
    keyLightY: puff.lighting.keyLight.y,
    keyLightZ: puff.lighting.lightHeight,
    highlightSize: puff.lighting.highlightSize,
    rimStrength: puff.lighting.rimStrength,
    glossStrength: puff.lighting.glossStrength,
    ambient: puff.lighting.ambient,
    secondaryShadowStrength: puff.lighting.secondaryShadowStrength,
  };
  return <div className="app-shell bg-black">
    <div className="demo-actions">
      <button className="docs-trigger" type="button" onClick={() => setDocsOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">{ }</span>Docs
      </button>
      <button type="button" onClick={() => setLight(value => !value)} aria-pressed={light}>Light background</button>
      <button
        type="button"
        role="switch"
        aria-checked={textRenderEnabled}
        onClick={() => setTextRenderEnabled(enabled => !enabled)}
      >
        TextRender
      </button>
    </div>
    <main>
      <div className="preview-column ml-90 py-16">
        <section
          className={`specimen ${light ? 'light' : ''}`}
          aria-label="Live Puff preview"
          style={{ '--material-color': '#929297' } as CSSProperties}
        >
          {textRenderEnabled
            ? <TextRender {...puffProps} onError={nextError => setError(nextError.message)}>
                <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight [filter:drop-shadow(3px_4px_8px_rgba(0,0,0,0.15))]">
                  Dimensional typography for the web
                </h2>
              </TextRender>
            : <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight [filter:drop-shadow(3px_4px_8px_rgba(0,0,0,0.15))]">
                Dimensional typography for the web
              </h2>}
          <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...puffProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div>
          <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...puffProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    </main>
    <DialRoot position="top-left" theme="dark" />
    <DocsAside open={docsOpen} onClose={() => setDocsOpen(false)} />
  </div>;
}
