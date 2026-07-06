import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://pablomatchspace.github.io/p90x-webapp/
export default defineConfig({
  base: '/p90x-webapp/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': the UpdateToast asks before applying a new version so an
      // in-progress workout log is never interrupted (US-005 AC).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'P90X Tracker',
        short_name: 'P90X',
        description: 'P90X workout tracker — offline-first, all data stays on your device.',
        theme_color: '#dc2626',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: '/p90x-webapp/index.html',
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
