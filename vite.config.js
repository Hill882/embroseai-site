import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  server: { host: true, port: 5173 },
  build: {
    outDir: 'site',
    emptyOutDir: false,
    sourcemap: false,
    minify: true,
    modulePreload: false,
    rollupOptions: {
      input: 'src/js/main.js',
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis') || id.endsWith('/src/js/motion.js')) return 'motion';
        }
      }
    }
  }
});
