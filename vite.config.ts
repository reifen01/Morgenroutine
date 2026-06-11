import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function resolveBuildVersion(): string {
  // On Vercel, VERCEL_GIT_COMMIT_SHA is set automatically for every deploy.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(() => {
  const buildVersion = resolveBuildVersion();
  return {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: 'Morgenroutine & Handels-Wächter',
          short_name: 'Morgenroutine',
          description: 'Tägliche Handels-Morgenroutine, Portfolio-Tracking und KI-Coach.',
          theme_color: '#1e293b',
          background_color: '#F4F4F7',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'de',
          icons: [
            { src: '/icon-16x16.png',   sizes: '16x16',   type: 'image/png' },
            { src: '/icon-32x32.png',   sizes: '32x32',   type: 'image/png' },
            { src: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icon-167x167.png', sizes: '167x167', type: 'image/png' },
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
