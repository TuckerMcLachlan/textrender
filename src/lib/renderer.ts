import { vertex, fragment } from './shader';
import { resin } from './skins';
import type { ResinOptions, ResolvedResinOptions } from './types';
import type { TextMask } from './typography';

const resolveResinOptions = (options: ResinOptions): ResolvedResinOptions => ({
  puff: options.puff ?? resin.defaults.puff,
  baseColor: options.baseColor ?? resin.defaults.baseColor,
  shadowColor: options.shadowColor ?? resin.defaults.shadowColor,
  bounceShadowColor: options.bounceShadowColor ?? resin.defaults.bounceShadowColor,
  highlightColor: options.highlightColor ?? resin.defaults.highlightColor,
  roundness: options.roundness ?? resin.defaults.roundness,
  depth: options.depth ?? resin.defaults.depth,
  smoothing: options.smoothing ?? resin.defaults.smoothing,
  lightX: options.lightX ?? resin.defaults.lightX,
  lightY: options.lightY ?? resin.defaults.lightY,
  lightZ: options.lightZ ?? resin.defaults.lightZ,
  highlightSize: options.highlightSize ?? resin.defaults.highlightSize,
  gloss: options.gloss ?? resin.defaults.gloss,
  brightness: options.brightness ?? resin.defaults.brightness,
  bounceStrength: options.bounceStrength ?? resin.defaults.bounceStrength,
});

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const normalized = (value: number, fallback = 0.5) => clamp(value, 0, 1, fallback);

export class TextRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private mask: TextMask | null = null;
  private frame = 0;
  private dirty = true;
  private visible = true;
  private options: ResolvedResinOptions;
  private disposed = false;
  private observer: IntersectionObserver | null = null;

  constructor(private canvas: HTMLCanvasElement, private host: HTMLElement,
    options: ResinOptions, private fail: (error: Error) => void) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is unavailable.');
    this.gl = gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate a text texture.');
    this.texture = texture;
    try {
      this.options = resolveResinOptions(options);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      document.addEventListener('visibilitychange', this.wake);
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        this.wake();
      });
      this.observer.observe(this.host);
      this.initializeProgram();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  get maxTextureSize(): number { return Math.min(8192, this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)); }
  private initializeProgram() {
    const source = fragment(resin.fragment, true);
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate a shader.');
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
        throw new Error(`Resin shader: ${message}`);
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
    if (this.disposed) return;
    this.dirty = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
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
    // Draw before the component reveals the canvas; this also satisfies any
    // option update that was waiting for the next frame.
    this.draw();
  }
  setOptions(options: ResinOptions) {
    if (this.disposed) return;
    const resolved = resolveResinOptions(options);
    if ((Object.keys(resolved) as (keyof ResolvedResinOptions)[])
      .every(key => Object.is(resolved[key], this.options[key]))) return;
    this.options = resolved;
    this.dirty = true;
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
    const puff = o.puff;
    const normalizedPuff = normalized(puff, resin.defaults.puff);
    const shapePuff = Math.min(1, normalizedPuff * 7 / 3);
    const expansionScale = shapePuff > 0 ? normalizedPuff * 0.035 / shapePuff : 0.015;
    gl.uniform1f(this.location('u_puff'), shapePuff);
    const baseColor = Number.parseInt(o.baseColor.slice(1), 16);
    gl.uniform3f(this.location('u_puffColor'), ((baseColor >> 16) & 255) / 255, ((baseColor >> 8) & 255) / 255, (baseColor & 255) / 255);
    const shadowColor = Number.parseInt(o.shadowColor.slice(1), 16);
    gl.uniform3f(this.location('u_puffShadowColor'), ((shadowColor >> 16) & 255) / 255, ((shadowColor >> 8) & 255) / 255, (shadowColor & 255) / 255);
    const bounceShadowColor = Number.parseInt(o.bounceShadowColor.slice(1), 16);
    gl.uniform3f(this.location('u_puffSecondaryShadowColor'), ((bounceShadowColor >> 16) & 255) / 255, ((bounceShadowColor >> 8) & 255) / 255, (bounceShadowColor & 255) / 255);
    const highlightColor = Number.parseInt(o.highlightColor.slice(1), 16);
    gl.uniform3f(this.location('u_puffHighlightColor'), ((highlightColor >> 16) & 255) / 255, ((highlightColor >> 8) & 255) / 255, (highlightColor & 255) / 255);
    gl.uniform1f(this.location('u_puffRoundness'), normalized(o.roundness, resin.defaults.roundness));
    gl.uniform1f(this.location('u_puffExpansion'), expansionScale);
    gl.uniform1f(this.location('u_puffDepth'), normalized(o.depth, resin.defaults.depth) * 0.2);
    gl.uniform1f(this.location('u_puffNormalSmoothing'), 0.025 + normalized(o.smoothing, resin.defaults.smoothing) * 0.035);
    gl.uniform1f(this.location('u_puffGrainStrength'), 0);
    gl.uniform3f(this.location('u_puffKeyLight'), clamp(o.lightX, -1, 1, resin.defaults.lightX), clamp(o.lightY, -1, 1, resin.defaults.lightY), normalized(o.lightZ, resin.defaults.lightZ) * 0.5);
    gl.uniform1f(this.location('u_puffHighlightSize'), 40 - normalized(o.highlightSize, resin.defaults.highlightSize) * 35);
    gl.uniform1f(this.location('u_puffRimStrength'), 0);
    gl.uniform1f(this.location('u_puffGloss'), normalized(o.gloss, resin.defaults.gloss));
    gl.uniform1f(this.location('u_puffBrightness'), normalized(o.brightness, resin.defaults.brightness));
    gl.uniform1f(this.location('u_puffSecondaryShadowStrength'), Math.max(0, Math.min(1, o.bounceStrength)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.dirty = false;
  }
  private tick = () => {
    this.frame = 0;
    if (this.disposed || !this.visible || document.hidden || !this.dirty) return;
    try { this.draw(); } catch (error) { this.fail(error as Error); }
  };
  private wake = () => {
    if (this.disposed) return;
    if (!this.visible || document.hidden) {
      cancelAnimationFrame(this.frame); this.frame = 0;
    } else if (this.dirty && this.mask && !this.frame) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.wake);
    this.gl.deleteTexture(this.texture);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}
