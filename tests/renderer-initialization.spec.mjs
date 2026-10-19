import assert from 'node:assert/strict';
import { test } from '@playwright/test';

for (const stage of ['texture setup', 'observer construction', 'observer observation', 'vertex compilation', 'fragment compilation', 'program linking', 'success']) {
  test(`renderer releases resources after ${stage}`, async ({ page }) => {
    await page.goto('/test');
    const result = await page.evaluate(async stage => {
      const { TextRenderer } = await import('/src/lib/renderer.ts');
      const allocated = { textures: [], shaders: [], programs: [] };
      const deleted = { textures: [], shaders: [], programs: [] };
      let nextId = 0;
      const allocate = kind => {
        const resource = { id: nextId++ };
        allocated[kind].push(resource.id);
        return resource;
      };
      const release = (kind, resource) => deleted[kind].push(resource.id);
      const forcedError = new Error(`Forced ${stage}`);
      const gl = {
        VERTEX_SHADER: 1, FRAGMENT_SHADER: 2,
        createTexture: () => allocate('textures'),
        deleteTexture: texture => release('textures', texture),
        bindTexture() { if (stage === 'texture setup') throw forcedError; },
        texParameteri() {},
        createShader: type => ({ ...allocate('shaders'), type }),
        deleteShader: shader => release('shaders', shader),
        shaderSource() {}, compileShader() {},
        getShaderParameter: shader => !(stage === 'vertex compilation' && shader.type === 1
          || stage === 'fragment compilation' && shader.type === 2),
        getShaderInfoLog: () => forcedError.message,
        createProgram: () => allocate('programs'),
        deleteProgram: program => release('programs', program),
        attachShader() {}, linkProgram() {},
        getProgramParameter: () => stage !== 'program linking',
        getProgramInfoLog: () => forcedError.message,
      };
      const originalObserver = window.IntersectionObserver;
      const originalAdd = document.addEventListener;
      const originalRemove = document.removeEventListener;
      const listeners = new Set();
      let listenerAdds = 0, listenerRemoves = 0, observers = 0, disconnects = 0;
      window.IntersectionObserver = class {
        constructor() {
          if (stage === 'observer construction') throw forcedError;
          observers++;
        }
        observe() { if (stage === 'observer observation') throw forcedError; }
        disconnect() { disconnects++; }
      };
      document.addEventListener = function (type, listener, options) {
        if (type === 'visibilitychange') { listeners.add(listener); listenerAdds++; }
        return originalAdd.call(this, type, listener, options);
      };
      document.removeEventListener = function (type, listener, options) {
        if (type === 'visibilitychange' && listeners.delete(listener)) listenerRemoves++;
        return originalRemove.call(this, type, listener, options);
      };
      let renderer, error, callbackErrors = 0;
      try {
        const canvas = document.createElement('canvas');
        canvas.getContext = () => gl;
        try {
          renderer = new TextRenderer(canvas, document.createElement('span'), {}, () => callbackErrors++);
        } catch (caught) { error = caught; }
        renderer?.dispose();
        renderer?.dispose();
        return {
          allocated, deleted, observers, disconnects, listenerAdds, listenerRemoves,
          remainingListeners: listeners.size, callbackErrors,
          constructed: !!renderer, message: error?.message, originalError: error === forcedError,
        };
      } finally {
        renderer?.dispose();
        for (const listener of listeners) originalRemove.call(document, 'visibilitychange', listener);
        document.addEventListener = originalAdd;
        document.removeEventListener = originalRemove;
        window.IntersectionObserver = originalObserver;
      }
    }, stage);

    for (const kind of ['textures', 'shaders', 'programs']) {
      assert.deepEqual([...result.deleted[kind]].sort(), [...result.allocated[kind]].sort(),
        `Every allocated ${kind} resource is released exactly once.`);
    }
    const registered = stage !== 'texture setup';
    const observed = registered && stage !== 'observer construction';
    assert.equal(result.listenerAdds, Number(registered));
    assert.equal(result.listenerRemoves, result.listenerAdds);
    assert.equal(result.remainingListeners, 0);
    assert.equal(result.observers, Number(observed));
    assert.equal(result.disconnects, result.observers);
    assert.equal(result.callbackErrors, 0, 'Constructor failures propagate by throwing.');
    assert.equal(result.constructed, stage === 'success');
    if (stage !== 'success') {
      assert.equal(result.message, `${stage.includes('compilation') ? 'Resin shader: ' : ''}Forced ${stage}`);
      if (!stage.includes('compilation') && stage !== 'program linking') {
        assert.equal(result.originalError, true, 'Cleanup preserves the original thrown error.');
      }
    }
  });
}
