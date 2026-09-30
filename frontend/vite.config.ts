import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:5285'
  const siteUrl = new URL(env.VITE_PUBLIC_ORIGIN ?? 'https://deadman.bug.community')
  if (
    !['https:', 'http:'].includes(siteUrl.protocol) ||
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.pathname !== '/' ||
    siteUrl.search ||
    siteUrl.hash
  ) {
    throw new Error('VITE_PUBLIC_ORIGIN must be an HTTP(S) origin without credentials or a path')
  }
  const description =
    "Примешь ли ты вызов Deadman's? Жестокие ладауты, непредсказуемые модификаторы и проверка знаний. Лишь сильнейшие способны пройти этот путь."
  const imageUrl = new URL('/brand/share-card.png', siteUrl).href

  return {
    plugins: [
      react(),
      {
        name: 'site-sharing-metadata',
        transformIndexHtml() {
          const properties = {
            'og:type': 'website',
            'og:site_name': "Deadman's",
            'og:title': "Deadman's - Набор мертвеца",
            'og:description': description,
            'og:url': siteUrl.href,
            'og:locale': 'ru_RU',
            'og:image': imageUrl,
            'og:image:type': 'image/png',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': "Надпись Deadman's на чёрном фоне",
          }
          const names = {
            description,
            'twitter:card': 'summary_large_image',
            'twitter:title': properties['og:title'],
            'twitter:description': description,
            'twitter:image': imageUrl,
            'twitter:image:alt': properties['og:image:alt'],
          }
          return [
            ...Object.entries(properties).map(([property, content]) => ({
              tag: 'meta',
              attrs: { property, content },
              injectTo: 'head' as const,
            })),
            ...Object.entries(names).map(([name, content]) => ({
              tag: 'meta',
              attrs: { name, content },
              injectTo: 'head' as const,
            })),
          ]
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('@mui/') || id.includes('@emotion/')) {
              return 'mui'
            }

            if (id.includes('@tanstack/')) {
              return 'react-query'
            }

            if (id.includes('@microsoft/signalr')) {
              return 'signalr'
            }

            if (id.includes('/zod/') || id.includes('\\zod\\')) {
              return 'zod'
            }

            if (id.includes('react-hook-form') || id.includes('@hookform/')) {
              return 'forms'
            }

            if (
              id.includes('react-router') ||
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('react-dom')
            ) {
              return 'react-vendor'
            }

            if (id.includes('i18next')) {
              return 'i18n'
            }
          },
        },
      },
    },
    server: {
      watch: {
        // Vitest deletes and recreates this generated directory. Ignoring it prevents
        // stale Windows file watchers without affecting source-file HMR.
        ignored: ['**/coverage', '**/coverage/**'],
      },
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
