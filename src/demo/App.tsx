import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DialRoot, useDialKitController } from 'dialkit';
import { TextRender } from '../lib';
import type { ResinOptions } from '../lib';

export function App() {
  const resinDial = useDialKitController('Resin shader', {
    shape: {
      puffiness: [0.2614285714, 0, 1, 0.01],
      cornerRoundness: [0.41, 0, 1, 0.01],
      radius: [0.131, 0.04, 0.2, 0.001],
      smoothing: [0.054, 0.005, 0.06, 0.001],
    },
    surface: {
      baseColor: '#ffffff',
      shadowColor: '#ffffff',
      bounceShadowColor: '#001944',
    },
    lighting: {
      light: { type: 'pad', x: [-0.9, -1, 1, 0.01], y: [0.93, -1, 1, 0.01], labels: { x: 'horizontal', y: 'vertical' } },
      lightHeight: [0.29, 0.1, 2, 0.01],
      highlightSize: [8, 2, 80, 1],
      glossStrength: [0.76, 0, 0.99, 0.01],
      ambient: [0.45, 0, 1, 0.01],
      bounceStrength: [0.56, 0, 1, 0.01],
      highlightColor: '#e36200',
    },
  }, { id: 'resin-shader-v8-api-v2', persist: true, defaultCollapsed: true });
  const resin = resinDial.values;
  const [textRenderEnabled, setTextRenderEnabled] = useState(true);
  const [light, setLight] = useState(false);
  const [error, setError] = useState('');
  const typeStyle: CSSProperties = {
    fontFamily: '"Inter", sans-serif',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
  const resinProps: ResinOptions = {
    puffiness: resin.shape.puffiness,
    cornerRoundness: resin.shape.cornerRoundness,
    baseColor: resin.surface.baseColor,
    shadowColor: resin.surface.shadowColor,
    bounceShadowColor: resin.surface.bounceShadowColor,
    highlightColor: resin.lighting.highlightColor,
    radius: resin.shape.radius,
    smoothing: resin.shape.smoothing,
    lightX: resin.lighting.light.x,
    lightY: resin.lighting.light.y,
    lightZ: resin.lighting.lightHeight,
    highlightSize: resin.lighting.highlightSize,
    glossStrength: resin.lighting.glossStrength,
    ambient: resin.lighting.ambient,
    bounceStrength: resin.lighting.bounceStrength,
  };
  return <div className="app-shell bg-black">
    <main>
      <div className="preview-column ml-90 py-16">
        <section
          className={`specimen ${light ? 'light' : ''}`}
          aria-label="Live Resin preview"
          style={{ '--material-color': '#929297' } as CSSProperties}
        >
          {textRenderEnabled
            ? <TextRender {...resinProps} onError={nextError => setError(nextError.message)}>
                <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight [filter:drop-shadow(3px_4px_8px_rgba(0,0,0,0.15))]">
                  Dimensional typography for the web
                </h2>
              </TextRender>
            : <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight [filter:drop-shadow(3px_4px_8px_rgba(0,0,0,0.15))]">
                Dimensional typography for the web
              </h2>}
          <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...resinProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div>
          <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...resinProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    </main>
    <DialRoot position="top-left" theme="dark" />
  </div>;
}
