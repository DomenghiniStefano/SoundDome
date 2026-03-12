import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'electron/index.ts')
      },
      rollupOptions: {
        external: ['adm-zip', 'fluent-ffmpeg', 'ffmpeg-static', 'electron-log', 'electron-log/main', 'electron-log/renderer', 'electron-updater', 'node-hid', 'sharp', 'koffi', 'uiohook-napi']
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
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    define: {
      APP_VERSION: JSON.stringify(pkg.version)
    }
  }
});
