import { useState, useRef } from 'react';
import { TextRender } from '../lib';

export function TestFixture() {
  const [text, setText] = useState('AV office — café\nStay curious.');
  const [size, setSize] = useState(80);
  const [width, setWidth] = useState(600);
  const [font, setFont] = useState('Space Grotesk');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [spacing, setSpacing] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const ref = useRef<HTMLHeadingElement>(null);
  return <main style={{ padding: 40 }}>
    <textarea aria-label="Text" value={text} onChange={e => setText(e.target.value)} />
    <input aria-label="Size" type="number" value={size} onChange={e => setSize(+e.target.value)} />
    <input aria-label="Width" type="number" value={width} onChange={e => setWidth(+e.target.value)} />
    <input aria-label="Spacing" type="number" value={spacing} onChange={e => setSpacing(+e.target.value)} />
    <select aria-label="Font" value={font} onChange={e => setFont(e.target.value)}><option>Space Grotesk</option><option>Inter</option><option>DM Sans</option><option>Bodoni Moda</option><option>Times New Roman</option></select>
    <select aria-label="Align" onChange={e => setAlign(e.target.value as typeof align)}><option>left</option><option>center</option><option>right</option></select>
    <button onClick={() => setMounted(!mounted)}>Mount</button>
    <button onClick={() => ref.current?.setAttribute('data-ref-working', 'yes')}>Check ref</button>
    <p data-testid="errors">{errors.join('\n')}</p>
    <div style={{ width, maxWidth: '100%' }}>
      {mounted && <TextRender onError={e => setErrors(prev => [...prev, e.message])}><h1 ref={ref} id="fixture-text" style={{ fontFamily: font === 'Times New Roman' ? '"Times New Roman", Times, serif' : font, fontSize: size, fontWeight: 700, lineHeight: 1.2, margin: 0, whiteSpace: 'pre-wrap', letterSpacing: spacing, textAlign: align, overflowWrap: 'anywhere' }}>{text}</h1></TextRender>}
    </div>
    <TextRender><p id="unsupported"><strong>Rich</strong> text stays readable.</p></TextRender>
    <TextRender shader={'unsupported' as 'resin'}><span id="shader-fallback">Shader fallback text.</span></TextRender>
    <div id="inline-fixture" style={{ width: 620 }}>
      <p style={{ fontFamily: 'Space Grotesk', fontSize: 64, fontWeight: 800, lineHeight: 1.05, margin: 0 }}>
        <TextRender shader="resin" baseColor="#999555">
          <span id="inline-first">The</span>
        </TextRender>{' '}
        <TextRender shader="resin" baseColor="#ffff00">
          <span id="inline-second">quick brown fox jumps over the lazy dog</span>
        </TextRender>
      </p>
    </div>
  </main>;
}
