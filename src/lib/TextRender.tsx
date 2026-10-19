import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState, version } from 'react';
import type { Ref } from 'react';
import { TextRenderer } from './renderer';
import { resin } from './skins';
import { createTextMask, typographySignature } from './typography';
import type { ResinOptions, TextElementProps, TextRenderProps } from './types';

const finite = (n: number, fallback: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;

const compatibilityError = (): Error | null => {
  const missing: string[] = [];
  if (typeof ResizeObserver !== 'function') missing.push('ResizeObserver');
  if (typeof IntersectionObserver !== 'function') missing.push('IntersectionObserver');
  if (typeof MutationObserver !== 'function') missing.push('MutationObserver');
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') missing.push('Intl.Segmenter');
  if (!document.fonts || typeof document.fonts.addEventListener !== 'function' || !document.fonts.ready) {
    missing.push('the Font Loading API');
  }
  return missing.length ? new Error(`TextRender requires ${missing.join(', ')}; displaying HTML text.`) : null;
};

export function TextRender(props: TextRenderProps) {
  const { children, shader = 'resin', onError, ...settings } = props;
  // Server Component transport can defer even a plain HTML child. Let React
  // resolve its opaque children representation (and suspend when necessary).
  const nodes = Children.toArray(children);
  const child = nodes.length === 1 && isValidElement<TextElementProps>(nodes[0]) ? nodes[0] : null;
  const hostRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TextRenderer | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const [renderState, setRenderState] = useState<'pending' | 'ready' | 'fallback'>('pending');
  const [fadeComplete, setFadeComplete] = useState(false);
  const handoffActive = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const latest = useRef({ onError }); latest.current = { onError };
  const renderOptions: ResinOptions = {
    puff: finite(settings.puff ?? resin.defaults.puff, resin.defaults.puff, 0, 1),
    baseColor: /^#[0-9a-f]{6}$/i.test(settings.baseColor ?? '') ? settings.baseColor : resin.defaults.baseColor,
    shadowColor: /^#[0-9a-f]{6}$/i.test(settings.shadowColor ?? '') ? settings.shadowColor : resin.defaults.shadowColor,
    bounceShadowColor: /^#[0-9a-f]{6}$/i.test(settings.bounceShadowColor ?? '') ? settings.bounceShadowColor : resin.defaults.bounceShadowColor,
    highlightColor: /^#[0-9a-f]{6}$/i.test(settings.highlightColor ?? '') ? settings.highlightColor : resin.defaults.highlightColor,
    roundness: settings.roundness,
    depth: settings.depth,
    smoothing: settings.smoothing,
    lightX: settings.lightX,
    lightY: settings.lightY,
    lightZ: settings.lightZ,
    highlightSize: settings.highlightSize,
    gloss: settings.gloss,
    brightness: settings.brightness,
    bounceStrength: settings.bounceStrength,
  };
  const optionsRef = useRef(renderOptions); optionsRef.current = renderOptions;
  const supportedElement = child !== null && typeof child.type === 'string' && /^(h[1-6]|p|span)$/.test(child.type);
  const plain = supportedElement && (typeof child.props.children === 'string' || typeof child.props.children === 'number');
  const childRef = child ? (Number.parseInt(version) >= 19 ? child.props.ref : (child as unknown as { ref?: Ref<HTMLElement> }).ref) : undefined;
  const refCleanup = useRef<(() => void) | void>(undefined);
  const mergedRef = useCallback((element: HTMLElement | null) => {
    hostRef.current = element;
    if (refCleanup.current) { refCleanup.current(); refCleanup.current = undefined; }
    else if (!element && typeof childRef === 'function') childRef(null);
    if (element && typeof childRef === 'function') refCleanup.current = childRef(element) as (() => void) | void;
    else if (childRef && typeof childRef !== 'function') (childRef as { current: HTMLElement | null }).current = element;
  }, [childRef]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (renderState !== 'ready' || fadeComplete) return;
    if (reducedMotion) { setFadeComplete(true); return; }
    // Transition events can be absent (for example when CSS disables motion).
    // Completing the fade also removes the transition, forcing full opacity.
    fadeTimer.current = setTimeout(() => {
      if (handoffActive.current) setFadeComplete(true);
    }, 200);
    return () => clearTimeout(fadeTimer.current);
  }, [renderState, reducedMotion, fadeComplete]);

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current;
    if (!host || !canvas || !plain) return;
    let disposed = false, pending = 0, revealPending = 0, signature = '', fontsReady = false, maskKey = '';
    let hasMask = false, revealed = false;
    let failedMaskKey: string | undefined;
    let resize: ResizeObserver | null = null;
    let mutation: MutationObserver | null = null;
    let fontChange: (() => void) | null = null;
    const hide = () => {
      handoffActive.current = false;
      clearTimeout(fadeTimer.current);
      setFadeComplete(false);
      cancelAnimationFrame(revealPending); revealPending = 0; revealed = false;
      canvas.style.visibility = 'hidden'; canvas.style.opacity = '0'; setRenderState('pending');
    };
    const fail = (error: Error) => {
      if (disposed) return;
      hide();
      setRenderState('fallback');
      latest.current.onError?.(error);
    };
    const layoutSignature = (relative = false) => {
      const rects = Array.from(host.getClientRects());
      const left = relative ? rects[0]?.left ?? 0 : 0;
      const top = relative ? rects[0]?.top ?? 0 : 0;
      return rects.map(rect => `${rect.left - left},${rect.top - top},${rect.width},${rect.height}`).join(';');
    };
    const rebuild = () => {
      pending = 0;
      if (disposed || !fontsReady || !rendererRef.current || rendererRef.current.gl.isContextLost()) return;
      let attemptKey: string | undefined;
      try {
        signature = typographySignature(host);
        // Moving the host (e.g. to display an error) does not change its typography.
        attemptKey = signature + '|' + layoutSignature(true) + '|' + host.textContent;
        if (attemptKey === failedMaskKey) return;
        failedMaskKey = undefined;
        const nextKey = signature + '|' + layoutSignature() + '|' + host.textContent;
        if (nextKey !== maskKey || !hasMask) {
          const mask = createTextMask(host, rendererRef.current.maxTextureSize);
          if (!mask) { hasMask = false; hide(); return; }
          rendererRef.current.setMask(mask);
          hasMask = true;
          maskKey = nextKey;
        }
        // Keep the HTML fallback in place until the browser has had a paint
        // opportunity with a fully drawn backing buffer. Keep the text beneath
        // the canvas until its fade-in is complete.
        if (!revealed && !revealPending) revealPending = requestAnimationFrame(() => {
          revealPending = 0;
          if (disposed || !hasMask || rendererRef.current?.gl.isContextLost()) return;
          revealed = true; handoffActive.current = true; setRenderState('ready');
        });
      } catch (error) {
        failedMaskKey = attemptKey;
        hasMask = false;
        fail(error as Error);
      }
    };
    const schedule = () => {
      if (disposed) return;
      if (!pending) pending = requestAnimationFrame(rebuild);
    };
    refreshRef.current = schedule;
    const init = () => {
      try {
        if ((shader as string) !== 'resin') throw new Error('Only the Resin shader is supported.');
        rendererRef.current = new TextRenderer(canvas, host, optionsRef.current, fail);
        schedule();
      } catch (error) { fail(error as Error); }
    };
    const lost = (event: Event) => { event.preventDefault(); fail(new Error('WebGL context lost; displaying HTML text.')); };
    const restored = () => { hide(); rendererRef.current?.dispose(); rendererRef.current = null; hasMask = false; failedMaskKey = undefined; init(); };
    try {
      hide();
      const unsupported = compatibilityError();
      if (unsupported) throw unsupported;
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      init();
      resize = new ResizeObserver(schedule); resize.observe(host);
      mutation = new MutationObserver(schedule);
      const inline = getComputedStyle(host).display.startsWith('inline');
      const mutationTarget = inline && host.parentElement ? host.parentElement : host;
      mutation.observe(mutationTarget, { characterData: true, childList: true, subtree: true });
      if (inline) {
        let layoutContainer = host.parentElement;
        while (layoutContainer?.parentElement && getComputedStyle(layoutContainer).display.startsWith('inline')) {
          layoutContainer = layoutContainer.parentElement;
        }
        if (layoutContainer) resize.observe(layoutContainer);
      }
      fontChange = () => { fontsReady = true; hasMask = false; failedMaskKey = undefined; schedule(); };
      document.fonts.ready.then(fontChange);
      document.fonts.addEventListener('loadingdone', fontChange);
    } catch (error) { fail(error as Error); }
    // CSS can change without a React render or a resize (e.g. inherited font/spacing).
    const interval = window.setInterval(() => {
      if (!document.hidden && typographySignature(host) !== signature) schedule();
    }, 400);
    return () => {
      handoffActive.current = false;
      clearTimeout(fadeTimer.current);
      disposed = true; cancelAnimationFrame(pending); cancelAnimationFrame(revealPending); clearInterval(interval);
      refreshRef.current = null;
      resize?.disconnect(); mutation?.disconnect();
      if (fontChange) document.fonts.removeEventListener('loadingdone', fontChange);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      rendererRef.current?.dispose(); rendererRef.current = null;
    };
  }, [plain, child?.type, child?.key, shader]);

  useEffect(() => {
    rendererRef.current?.setOptions(optionsRef.current);
  });
  useEffect(() => { refreshRef.current?.(); }, [child?.props.children, child?.props.className, child?.props.style]);

  if (!child || !supportedElement || !plain) return children;
  return cloneElement(child, {
    ref: mergedRef,
    'data-shader-state': renderState,
    style: {
      ...child.props.style,
      position: child.props.style?.position && child.props.style.position !== 'static' ? child.props.style.position : 'relative',
      ...(renderState === 'ready' && (reducedMotion || fadeComplete) ? { color: 'transparent', WebkitTextFillColor: 'transparent' } : {}),
    },
  } as Partial<typeof child.props>, String(child.props.children),
    <canvas key="shader-canvas" ref={canvasRef} aria-hidden="true" onTransitionEnd={event => {
      if (event.target === event.currentTarget && event.propertyName === 'opacity'
        && handoffActive.current && renderState === 'ready'
        && getComputedStyle(event.currentTarget).opacity === '1') setFadeComplete(true);
    }} style={{
      position: 'absolute', background: 'transparent', pointerEvents: 'none', visibility: renderState === 'ready' ? 'visible' : 'hidden',
      opacity: renderState === 'ready' ? 1 : 0, transition: reducedMotion || fadeComplete ? 'none' : 'opacity 150ms ease', display: 'block',
      maxWidth: 'none', userSelect: 'none',
    }} />);
}
