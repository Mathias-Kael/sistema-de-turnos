import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      visualizer({
        filename: 'bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'ASTRA',
          short_name: 'ASTRA',
          description: 'Plataforma definitiva para gestionar reservas, clientes y equipo.',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'assets/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'assets/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'assets/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
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
