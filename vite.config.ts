import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ling-icon.svg'],
      manifest: {
        name: 'Ling — читай и учи слова',
        short_name: 'Ling',
        description: 'Читай книги, переводи слова и запоминай новое.',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f8f5',
        theme_color: '#f5f8f5',
        icons: [
          {
            src: 'ling-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,webmanifest}'],
      },
    }),
  ],
})
