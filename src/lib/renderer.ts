import { vertex, fragment } from './shader';
import { puff } from './skins';
import type { RenderOptions } from './types';
import type { TextMask } from './typography';

const defaultPuffSettings = {
  cornerRoundness: 0, expansion: 0.065, radius: 0.1, normalSmoothing: 0.022, grainStrength: 0.055,
  keyLightX: -0.65, keyLightY: 0.85, keyLightZ: 0.85, highlightSize: 22,
  rimStrength: 0.55, glossStrength: 0.16, ambient: 0.4, secondaryShadowStrength: 0,
};

export class TextRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private mask: TextMask | null = null;
  private frame = 0;
  private elapsed = 0;
  private last = 0;
  private visible = true;
  private options: RenderOptions;
  private reduced: MediaQueryList;
  private disposed = false;
  private observer: IntersectionObserver;

  constructor(private canvas: HTMLCanvasElement, private host: HTMLElement,
    options: RenderOptions, private fail: (error: Error) => void) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is unavailable.');
    this.gl = gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate a text texture.');
    this.texture = texture;
    this.options = options;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced.addEventListener('change', this.wake);
    document.addEventListener('visibilitychange', this.wake);
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.wake();
    });
    this.observer.observe(this.host);
    this.initializeProgram();
  }
  get maxTextureSize(): number { return Math.min(8192, this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)); }
  private initializeProgram() {
    const source = fragment(puff.fragment, true);
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate a shader.');
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
        throw new Error(`Puff shader: ${message}`);
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    let fs: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    try {
      fs = compile(gl.FRAGMENT_SHADER, source);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate a shader program.');
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Shader linking failed.');
    } catch (error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally { gl.deleteShader(vs); if (fs) gl.deleteShader(fs); }
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    this.uniforms.clear();
    this.wake();
  }
  setMask(mask: TextMask) {
    this.mask = mask;
    const { canvas, gl } = this;
    canvas.width = mask.width; canvas.height = mask.height;
    Object.assign(canvas.style, {
      width: `${mask.cssWidth}px`, height: `${mask.cssHeight}px`, left: '0px', top: '0px',
    });
    // For a multi-line inline element, the absolute-positioning containing
    // block begins at the first fragment while getBoundingClientRect() is the
    // union of every fragment. Measure both coordinate systems and bridge the
    // difference so the mask remains aligned with all wrapped lines.
    const hostRect = this.host.getBoundingClientRect();
    const origin = canvas.getBoundingClientRect();
    const canvasScaleX = origin.width / mask.cssWidth || 1;
    const canvasScaleY = origin.height / mask.cssHeight || 1;
    canvas.style.left = `${(hostRect.left + mask.left * mask.scaleX - origin.left) / canvasScaleX}px`;
    canvas.style.top = `${(hostRect.top + mask.top * mask.scaleY - origin.top) / canvasScaleY}px`;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mask.width, mask.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask.pixels);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Unable to upload the text mask.');
    this.draw();
    this.wake();
  }
  setOptions(options: RenderOptions) {
    this.options = options;
    this.wake();
  }
  private location(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.program!, name));
    return this.uniforms.get(name)!;
  }
  private draw() {
    if (!this.program || !this.mask || this.disposed || this.gl.isContextLost()) return;
    const { gl, mask: m, options: o } = this;
    gl.viewport(0, 0, m.width, m.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.location('u_mask'), 0);
    gl.uniform2f(this.location('u_resolution'), m.width, m.height);
    gl.uniform2f(this.location('u_cssSize'), m.cssWidth, m.cssHeight);
    gl.uniform1f(this.location('u_fontSize'), m.fontSize);
    gl.uniform1f(this.location('u_distanceRange'), m.distanceRange);
    gl.uniform1f(this.location('u_time'), o.time ?? (this.reduced.matches ? 0 : this.elapsed));
    gl.uniform1f(this.location('u_intensity'), o.intensity);
    gl.uniform1f(this.location('u_textureScale'), o.textureScale);
    gl.uniform1f(this.location('u_seed'), o.seed);
    const puffiness = o.puffiness ?? 0.5;
    gl.uniform1f(this.location('u_puffiness'), Number.isFinite(puffiness) ? Math.max(0, Math.min(1, puffiness)) : 0.5);
    const puffColor = Number.parseInt((o.puffColor ?? '#111111').slice(1), 16);
    gl.uniform3f(this.location('u_puffColor'), ((puffColor >> 16) & 255) / 255, ((puffColor >> 8) & 255) / 255, (puffColor & 255) / 255);
    const shadowColor = Number.parseInt((o.shadowColor ?? '#000000').slice(1), 16);
    gl.uniform3f(this.location('u_puffShadowColor'), ((shadowColor >> 16) & 255) / 255, ((shadowColor >> 8) & 255) / 255, (shadowColor & 255) / 255);
    const secondaryShadowColor = Number.parseInt((o.secondaryShadowColor ?? '#000000').slice(1), 16);
    gl.uniform3f(this.location('u_puffSecondaryShadowColor'), ((secondaryShadowColor >> 16) & 255) / 255, ((secondaryShadowColor >> 8) & 255) / 255, (secondaryShadowColor & 255) / 255);
    const highlightColor = Number.parseInt((o.highlightColor ?? '#ffffff').slice(1), 16);
    gl.uniform3f(this.location('u_puffHighlightColor'), ((highlightColor >> 16) & 255) / 255, ((highlightColor >> 8) & 255) / 255, (highlightColor & 255) / 255);
    const puff = {
      ...defaultPuffSettings,
      ...Object.fromEntries(Object.entries(o.puffSettings ?? {}).filter(([, value]) => value !== undefined)),
    };
    gl.uniform1f(this.location('u_puffCornerRoundness'), Math.max(0, Math.min(1, puff.cornerRoundness)));
    gl.uniform1f(this.location('u_puffExpansion'), puff.expansion);
    gl.uniform1f(this.location('u_puffRadius'), puff.radius);
    gl.uniform1f(this.location('u_puffNormalSmoothing'), puff.normalSmoothing);
    gl.uniform1f(this.location('u_puffGrainStrength'), puff.grainStrength);
    gl.uniform3f(this.location('u_puffKeyLight'), puff.keyLightX, puff.keyLightY, puff.keyLightZ);
    gl.uniform1f(this.location('u_puffHighlightSize'), puff.highlightSize);
    gl.uniform1f(this.location('u_puffRimStrength'), puff.rimStrength);
    gl.uniform1f(this.location('u_puffGlossStrength'), puff.glossStrength);
    gl.uniform1f(this.location('u_puffAmbient'), puff.ambient);
    gl.uniform1f(this.location('u_puffSecondaryShadowStrength'), Math.max(0, Math.min(1, puff.secondaryShadowStrength)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed || !this.visible || document.hidden) { this.last = 0; return; }
    const delta = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    const moving = !this.reduced.matches && this.options.animated && this.options.time === undefined && this.options.speed > 0;
    if (moving) this.elapsed += delta * this.options.speed;
    try { this.draw(); } catch (error) { this.fail(error as Error); return; }
    if (moving) this.frame = requestAnimationFrame(this.tick);
    else this.last = 0;
  };
  private wake = () => {
    if (this.disposed) return;
    if (!this.visible || document.hidden) {
      cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0;
    } else if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.reduced.removeEventListener('change', this.wake);
    document.removeEventListener('visibilitychange', this.wake);
    this.gl.deleteTexture(this.texture);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}
