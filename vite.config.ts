import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      visualizer({
        filename: 'bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true
      })
    ],
    build: {
      rollupOptions: {
        // Podemos extender aquí en el futuro reglas de chunking
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
