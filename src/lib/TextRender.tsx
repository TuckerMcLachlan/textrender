import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState, version } from 'react';
import type { Ref } from 'react';
import { TextRenderer } from './renderer';
import { createTextMask, typographySignature } from './typography';
import type { ResinOptions, TextRenderProps } from './types';

const finite = (n: number, fallback: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;

export function TextRender(props: TextRenderProps) {
  const { children, shader = 'resin', onError, ...settings } = props;
  const hostRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TextRenderer | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ onError }); latest.current = { onError };
  const renderOptions: ResinOptions = {
    puffiness: finite(settings.puffiness ?? 0.5, 0.5, 0, 1),
    baseColor: /^#[0-9a-f]{6}$/i.test(settings.baseColor ?? '') ? settings.baseColor : '#111111',
    shadowColor: /^#[0-9a-f]{6}$/i.test(settings.shadowColor ?? '') ? settings.shadowColor : '#000000',
    bounceShadowColor: /^#[0-9a-f]{6}$/i.test(settings.bounceShadowColor ?? '') ? settings.bounceShadowColor : '#000000',
    highlightColor: /^#[0-9a-f]{6}$/i.test(settings.highlightColor ?? '') ? settings.highlightColor : '#ffffff',
    cornerRoundness: settings.cornerRoundness,
    radius: settings.radius,
    smoothing: settings.smoothing,
    lightX: settings.lightX,
    lightY: settings.lightY,
    lightZ: settings.lightZ,
    highlightSize: settings.highlightSize,
    glossStrength: settings.glossStrength,
    ambient: settings.ambient,
    bounceStrength: settings.bounceStrength,
  };
  const optionsRef = useRef(renderOptions); optionsRef.current = renderOptions;
  const supportedElement = isValidElement(children) && typeof children.type === 'string' && /^(h[1-6]|p|span)$/.test(children.type);
  const plain = supportedElement && (typeof children.props.children === 'string' || typeof children.props.children === 'number');
  const childRef = isValidElement(children) ? (Number.parseInt(version) >= 19 ? children.props.ref : (children as unknown as { ref?: Ref<HTMLElement> }).ref) : undefined;
  const refCleanup = useRef<(() => void) | void>(undefined);
  const mergedRef = useCallback((element: HTMLElement | null) => {
    hostRef.current = element;
    if (refCleanup.current) { refCleanup.current(); refCleanup.current = undefined; }
    else if (!element && typeof childRef === 'function') childRef(null);
    if (element && typeof childRef === 'function') refCleanup.current = childRef(element) as (() => void) | void;
    else if (childRef && typeof childRef !== 'function') (childRef as { current: HTMLElement | null }).current = element;
  }, [childRef]);

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current;
    if (!host || !canvas || !plain) return;
    let disposed = false, pending = 0, revealPending = 0, signature = '', fontsReady = false, maskKey = '';
    let hasMask = false, revealed = false;
    const hide = () => {
      cancelAnimationFrame(revealPending); revealPending = 0; revealed = false;
      canvas.style.visibility = 'hidden'; setReady(false);
    };
    const fail = (error: Error) => {
      if (disposed) return;
      hide();
      latest.current.onError?.(error);
    };
    const layoutSignature = () => Array.from(host.getClientRects(), rect =>
      `${rect.left},${rect.top},${rect.width},${rect.height}`).join(';');
    const rebuild = () => {
      pending = 0;
      if (disposed || !fontsReady || !rendererRef.current || rendererRef.current.gl.isContextLost()) return;
      try {
        signature = typographySignature(host);
        const nextKey = signature + '|' + layoutSignature() + '|' + host.textContent;
        if (nextKey !== maskKey || !hasMask) {
          const mask = createTextMask(host, rendererRef.current.maxTextureSize);
          if (!mask) { hasMask = false; hide(); return; }
          rendererRef.current.setMask(mask);
          hasMask = true;
          maskKey = nextKey;
        }
        // Keep the HTML fallback in place until the browser has had a paint
        // opportunity with a fully drawn backing buffer. React then reveals
        // the canvas and hides the text in the same commit.
        if (!revealed && !revealPending) revealPending = requestAnimationFrame(() => {
          revealPending = 0;
          if (disposed || !hasMask || rendererRef.current?.gl.isContextLost()) return;
          revealed = true; setReady(true);
        });
      } catch (error) { fail(error as Error); }
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
    const restored = () => { rendererRef.current?.dispose(); rendererRef.current = null; hasMask = false; init(); };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    init();
    const resize = new ResizeObserver(schedule); resize.observe(host);
    const mutation = new MutationObserver(schedule);
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
    const fontChange = () => { fontsReady = true; hasMask = false; schedule(); };
    document.fonts.ready.then(fontChange);
    document.fonts.addEventListener('loadingdone', fontChange);
    // CSS can change without a React render or a resize (e.g. inherited font/spacing).
    const interval = window.setInterval(() => {
      if (!document.hidden && typographySignature(host) !== signature) schedule();
    }, 400);
    return () => {
      disposed = true; cancelAnimationFrame(pending); cancelAnimationFrame(revealPending); clearInterval(interval);
      refreshRef.current = null; resize.disconnect(); mutation.disconnect();
      document.fonts.removeEventListener('loadingdone', fontChange);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      rendererRef.current?.dispose(); rendererRef.current = null;
    };
  }, [plain, children.type, shader]);

  useEffect(() => {
    rendererRef.current?.setOptions(optionsRef.current);
  });
  useEffect(() => { refreshRef.current?.(); }, [children.props.children, children.props.className, children.props.style]);

  if (!supportedElement || !plain) return children;
  return cloneElement(children, {
    ref: mergedRef,
    'data-shader-state': ready ? 'ready' : 'fallback',
    style: {
      ...children.props.style,
      position: children.props.style?.position && children.props.style.position !== 'static' ? children.props.style.position : 'relative',
      ...(ready ? { WebkitTextFillColor: 'transparent' } : {}),
    },
  } as Partial<typeof children.props>, String(children.props.children),
    <canvas key="shader-canvas" ref={canvasRef} aria-hidden="true" style={{
      position: 'absolute', background: 'transparent', pointerEvents: 'none', visibility: ready ? 'visible' : 'hidden', display: 'block',
      maxWidth: 'none', userSelect: 'none',
    }} />);
}
