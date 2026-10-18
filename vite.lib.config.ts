import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: { entry: 'src/lib/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
});
