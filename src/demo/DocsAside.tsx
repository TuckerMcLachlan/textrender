import { useEffect, useRef } from 'react';

type PropDoc = {
  name: string;
  type: string;
  defaultValue?: string;
  description: string;
  detail?: string;
  required?: boolean;
  inherited?: string;
};

const commonOptions: PropDoc[] = [
  { name: 'speed', type: 'number', defaultValue: '0.6', description: 'Controls animation speed.', detail: 'Clamped from 0 to 5. A value of 0 produces a still frame.', inherited: 'CommonShaderOptions' },
  { name: 'intensity', type: 'number', defaultValue: '0.8', description: 'Controls the strength of the material effect.', detail: 'Clamped from 0 to 2.', inherited: 'CommonShaderOptions' },
  { name: 'textureScale', type: 'number', defaultValue: '1', description: 'Scales the shader texture across the glyphs.', detail: 'Clamped from 0.1 to 6.', inherited: 'CommonShaderOptions' },
  { name: 'seed', type: 'number', defaultValue: '1', description: 'Changes the procedural variation without changing other settings.', detail: 'Clamped from −10,000 to 10,000.', inherited: 'CommonShaderOptions' },
  { name: 'time', type: 'number', description: 'Fixes shader time at a specific value in seconds.', detail: 'Useful for still images and reproducible captures. Supplying it stops time-based animation.', inherited: 'CommonShaderOptions' },
];

const puffOptions: PropDoc[] = [
  ...commonOptions,
  { name: 'puffiness', type: 'number', defaultValue: '0.5', description: 'Controls outline expansion and rounding.', detail: 'Clamped from 0 to 1. A value of 0 preserves the original glyph outline.' },
  { name: 'puffColor', type: 'string', defaultValue: '"#111111"', description: 'Sets the six-digit hexadecimal base colour.' },
  { name: 'shadowColor', type: 'string', defaultValue: '"#000000"', description: 'Sets the six-digit hexadecimal colour of the darkest unlit areas.' },
  { name: 'secondaryShadowColor', type: 'string', defaultValue: '"#000000"', description: 'Sets the six-digit hexadecimal colour of the opposing-light shadow.' },
  { name: 'highlightColor', type: 'string', defaultValue: '"#ffffff"', description: 'Sets the six-digit hexadecimal colour of glossy highlights.' },
  { name: 'cornerRoundness', type: 'number', defaultValue: '0', description: 'Controls two-dimensional glyph-corner rounding.', detail: 'Clamped from 0 to 1.' },
  { name: 'expansion', type: 'number', defaultValue: '0.065', description: 'Sets glyph expansion as a fraction of font size.' },
  { name: 'radius', type: 'number', defaultValue: '0.1', description: 'Sets crown radius as a fraction of font size.' },
  { name: 'normalSmoothing', type: 'number', defaultValue: '0.022', description: 'Sets the normal-sampling distance as a fraction of font size.' },
  { name: 'grainStrength', type: 'number', defaultValue: '0.055', description: 'Controls the amount of fine surface variation.' },
  { name: 'keyLightX', type: 'number', defaultValue: '−0.65', description: 'Sets the horizontal direction of the primary light.' },
  { name: 'keyLightY', type: 'number', defaultValue: '0.85', description: 'Sets the vertical direction of the primary light.' },
  { name: 'keyLightZ', type: 'number', defaultValue: '0.85', description: 'Sets the height of the primary light.' },
  { name: 'highlightSize', type: 'number', defaultValue: '22', description: 'Sets the primary highlight exponent.', detail: 'Lower values produce a broader highlight.' },
  { name: 'rimStrength', type: 'number', defaultValue: '0.55', description: 'Controls grazing-angle rim lighting.' },
  { name: 'glossStrength', type: 'number', defaultValue: '0.16', description: 'Controls the base specular contribution.' },
  { name: 'ambient', type: 'number', defaultValue: '0.4', description: 'Controls the base diffuse brightness.' },
  { name: 'secondaryShadowStrength', type: 'number', defaultValue: '0', description: 'Controls the strength of the opposing-light shadow.', detail: 'Clamped from 0 to 1.' },
];

function PropsTable({ properties, label }: { properties: PropDoc[]; label: string }) {
  return <table className="docs-props-table" aria-label={label}>
    <thead><tr><th scope="col">Props</th><th scope="col">Description</th></tr></thead>
    <tbody>{properties.map(prop => <tr key={prop.name}>
      <th scope="row"><code className="docs-prop-name">{prop.name}</code></th>
      <td>
        <div className="docs-type-line">
          <code>{prop.type}</code>
          {prop.defaultValue && <><span aria-hidden="true"> = </span><code className="docs-default">{prop.defaultValue}</code></>}
          {prop.required && <span className="docs-required">Required</span>}
        </div>
        <p>{prop.description}</p>
        {prop.detail && <p className="docs-detail">{prop.detail}</p>}
        {prop.inherited && <div className="docs-inherited">Inherited from <code>{prop.inherited}</code></div>}
      </td>
    </tr>)}</tbody>
  </table>;
}

function OptionSection({ id, title, signature, description, properties }: {
  id: string;
  title: string;
  signature: string;
  description: string;
  properties: PropDoc[];
}) {
  return <section className="docs-option-section" aria-labelledby={id}>
    <h3 id={id}><a href={`#${id}`} aria-label={`Link to ${title}`}>#</a>{title}</h3>
    <div className="docs-signature"><code>{signature}</code></div>
    <p className="docs-summary">{description}</p>
    <PropsTable properties={properties} label={`${title} properties`} />
  </section>;
}

export function DocsAside({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="docs-layer">
    <button className="docs-backdrop" type="button" aria-label="Close documentation" onClick={onClose} />
    <aside className="docs-aside" role="dialog" aria-modal="true" aria-labelledby="docs-title">
      <header className="docs-header">
        <div>
          <span className="docs-kicker">API reference</span>
          <h2 id="docs-title">TextRender</h2>
        </div>
        <button ref={closeRef} className="docs-close" type="button" onClick={onClose} aria-label="Close documentation">×</button>
      </header>
      <div className="docs-content">
        <OptionSection id="puff-options" title="TextRender props" signature="interface TextRenderProps extends PuffOptions" description="All motion, shape, surface, and lighting controls are passed directly to TextRender as props." properties={puffOptions} />
      </div>
    </aside>
  </div>;
}
