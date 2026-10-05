import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD_ID = Date.now().toString(36)

/**
 * Registers the service worker from index.html with the build in its URL. The hosting's CDN keeps .js files for a
 * week whatever the server says, so a fixed sw.js (or registerSW.js) URL would keep visitors on an old worker, which
 * answers every page, the Ling Library included, with the app. index.html itself is not cached by the CDN.
 */
function registerServiceWorker(): Plugin {
  return {
    name: 'ling:register-sw',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'script',
      injectTo: 'head',
      children: `if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=${BUILD_ID}',{scope:'./'}))`,
    }],
  }
}

/** The dev server answers every page URL with the app; serve the generated Ling Library pages as the site does. */
function servePublicPages(): Plugin {
  return {
    name: 'ling:public-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = (req.url ?? '').split('?')
        if (pathname === '/' || !fs.existsSync(path.join(server.config.publicDir, pathname, 'index.html'))) return next()
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { Location: `${pathname}/${query ? `?${query}` : ''}` }).end()
          return
        }
        req.url = `${pathname}index.html`
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    servePublicPages(),
    registerServiceWorker(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
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
        // A new worker takes over open tabs at once (with injectRegister off the plugin no longer sets this).
        skipWaiting: true,
        clientsClaim: true,
        // The public library pages and book texts are separate static pages: neither precached nor replaced by the app.
        globIgnores: ['library/**', 'uk/**', 'en/**'],
        navigateFallbackDenylist: [/\/library\//, /\/sitemap\.xml$/, /\/robots\.txt$/],
      },
    }),
  ],
})
