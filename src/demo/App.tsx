import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DialRoot, useDialKitController } from 'dialkit';
import { TextRender } from '../lib';
import type { ResinOptions } from '../lib';

export function App() {
  const resinDial = useDialKitController('Resin shader', {
    shape: {
      puff: [0.2614285714, 0, 1, 0.01],
      roundness: [0.41, 0, 1, 0.01],
      depth: [0.655, 0, 1, 0.01],
      smoothing: [0.8285714286, 0, 1, 0.01],
    },
    surface: {
      baseColor: '#ffffff',
      shadowColor: '#ffffff',
      bounceShadowColor: '#001944',
      highlightColor: '#e36200'
    },
    lighting: {
      light: { type: 'pad', x: [-0.9, -1, 1, 0.01], y: [0.93, -1, 1, 0.01], labels: { x: 'horizontal', y: 'vertical' } },
      lightZ: [0.58, 0, 1, 0.01],
      highlightSize: [0.9142857143, 0, 1, 0.01],
      gloss: [0.76, 0, 0.99, 0.01],
      brightness: [0.45, 0, 1, 0.01],
      bounceStrength: [0.56, 0, 1, 0.01],
    },
  }, { id: 'resin-shader-v8-api-v2', persist: true, defaultCollapsed: true });
  const resin = resinDial.values;
  const [textRenderEnabled, setTextRenderEnabled] = useState(true);
  const [light, setLight] = useState(false);
  const [error, setError] = useState('');
  const typeStyle: CSSProperties = {
    fontFamily: 'sans-serif',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
  const resinProps: ResinOptions = {
    puff: resin.shape.puff,
    roundness: resin.shape.roundness,
    baseColor: resin.surface.baseColor,
    shadowColor: resin.surface.shadowColor,
    bounceShadowColor: resin.surface.bounceShadowColor,
    highlightColor: resin.surface.highlightColor,
    depth: resin.shape.depth,
    smoothing: resin.shape.smoothing,
    lightX: resin.lighting.light.x,
    lightY: resin.lighting.light.y,
    lightZ: resin.lighting.lightZ,
    highlightSize: resin.lighting.highlightSize,
    gloss: resin.lighting.gloss,
    brightness: resin.lighting.brightness,
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
                <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight text-white">
                  Dimensional typography for the web
                </h2>
              </TextRender>
            : <h2 data-testid="specimen" style={typeStyle} className="text-9xl font-bold leading-[0.9] tracking-tight">
                Dimensional typography for the web
              </h2>}
          {/* <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...resinProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={typeStyle} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div> */}
          {/* <div className="mt-12">
            {textRenderEnabled
              ? <TextRender {...resinProps} onError={nextError => setError(nextError.message)}>
                  <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>
                </TextRender>
              : <h2 style={{ ...typeStyle, fontFamily: 'serif' }} className="text-8xl font-semibold">Where teams and agents think together</h2>}
          </div> */}
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    </main>
    <DialRoot position="top-left" theme="dark" />
  </div>;
}
