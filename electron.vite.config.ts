import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'electron/index.ts')
      },
      rollupOptions: {
        external: ['adm-zip']
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts')
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    plugins: [vue()]
  }
});
