import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), // Asegurarse de que el plugin de React esté presente
      visualizer({
        filename: 'bundle-report.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'assets/web-app-manifest-192x192.png', 'assets/web-app-manifest-512x512.png'],
        manifest: {
          name: 'ASTRA',
          short_name: 'ASTRA',
          description: 'Plataforma definitiva para gestionar reservas, clientes y equipo.',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'assets/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
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
        output: {
          manualChunks: (id) => {
            // Only split heavy vendor libraries to avoid circular dependencies
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // All other node_modules in one chunk
              return 'vendor';
            }
            // Let Vite handle application code splitting automatically
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
