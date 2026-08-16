import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { PREVIEW_CHANNEL, resolveAppName } from './src/services/appIdentity.ts'

// `npm run preview:deploy` sets VITE_APP_CHANNEL=preview. A preview channel has
// its own Hosting domain, so Chrome installs it as a second app next to
// production; naming it "DevNotes (Preview)" is what keeps the two apart in
// chrome://apps and in the installed window's title bar.
const appName = resolveAppName(process.env.VITE_APP_CHANNEL === PREVIEW_CHANNEL)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The update toast is rendered by <PwaUpdatePrompt />, which registers
      // the worker itself through `virtual:pwa-register/react`.
      registerType: 'prompt',
      injectRegister: null,
      // The `*.png` glob below already precaches every icon; leaving this on
      // would list the manifest icons a second time.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        // Installed app windows are titled `<name> - <document.title>`. Keeping
        // the tagline here as well would repeat it in every title bar, so the
        // tagline lives in `description` and in the document title instead
        // (see src/services/appIdentity.ts).
        name: appName,
        short_name: appName,
        description:
          'DevNotes ist ein moderner, interaktiver Blog für Softwareentwickler. Teile dein Wissen und lies tiefgehende Artikel zu React, Vite und TypeScript.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Matches <meta name="theme-color"> in index.html and the dark
        // `background.default` from src/theme/theme.ts, so the splash screen
        // does not flash a different colour than the booting app.
        theme_color: '#0a0e1a',
        background_color: '#070a13',
        categories: ['news', 'education', 'productivity'],
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Neuen Beitrag schreiben', short_name: 'Schreiben', url: '/write' },
          { name: 'Meine Beiträge', short_name: 'Beiträge', url: '/my-posts' },
          { name: 'Lesezeichen', short_name: 'Lesezeichen', url: '/bookmarks' },
        ],
      },
      workbox: {
        // The build emits >450 chunks (one per Shiki language, one per Mermaid
        // diagram type), so precaching `**/*.js` would push ~13 MB at install
        // time. Only the app shell — the entry, the CSS and the eagerly
        // preloaded `vendor-*` chunks listed in dist/index.html — is
        // precached; everything else is picked up by the runtime cache below
        // the first time it is actually requested.
        globPatterns: [
          'index.html',
          'favicon.svg',
          '*.png',
          'assets/index-*.{js,css}',
          'assets/rolldown-runtime-*.js',
          'assets/vendor-*.js',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Firebase Auth serves its redirect handler from this path on the
          // hosting domain; it must never be answered from the shell.
          /^\/__\//,
          /^\/translation-edit-prototype\.html$/,
        ],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Lazily imported chunks: Shiki grammars, Mermaid diagram types,
            // KaTeX, Cytoscape. Content-hashed, so a stale hit is impossible.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'devnotes-lazy-assets',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-firebase-firestore',
              test: /node_modules[\\/](?:@firebase[\\/]firestore|firebase[\\/]firestore)/,
              priority: 40,
            },
            {
              name: 'vendor-firebase-auth',
              test: /node_modules[\\/](?:@firebase[\\/]auth|firebase[\\/]auth)/,
              priority: 35,
            },
            {
              name: 'vendor-firebase-core',
              test: /node_modules[\\/](?:@firebase[\\/](?:analytics|app|component|installations|logger|util)|firebase[\\/](?:analytics|app))/,
              priority: 30,
            },
            {
              name: 'vendor-mui',
              test: /node_modules[\\/](?:@mui|@emotion)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-icons',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 15,
            },
            {
              name: 'vendor-shiki-core',
              test: /node_modules[\\/]@shikijs[\\/](?:core|engine-javascript|primitive|themes|types|vscode-textmate)[\\/]/,
              priority: 12,
            },
            {
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 10,
            },
            {
              // Everything else from node_modules, except the two graphs that
              // must keep their own async boundaries:
              //
              // - @shikijs/langs: one chunk per language, loaded on demand.
              // - mermaid and the packages it exclusively pulls in (d3,
              //   cytoscape, katex, roughjs, …). Mermaid is only reached
              //   through the dynamic import in MarkdownRenderer and lazy-loads
              //   its diagram types internally; grouping it here would drag the
              //   whole graph into the eagerly loaded chunk and flatten
              //   Mermaid's own splitting. Rolldown chunks the remainder along
              //   those dynamic imports on its own.
              //
              // `stylis` is deliberately not listed: it is the one package
              // shared with @emotion, so it stays in the eager output.
              name: 'vendor',
              test: new RegExp(
                `node_modules[\\\\/](?!${[
                  '@shikijs[\\\\/]langs[\\\\/]',
                  'mermaid[\\\\/]',
                  '@mermaid-js[\\\\/]',
                  '@chevrotain[\\\\/]',
                  'd3(?:-[a-z-]+)?[\\\\/]',
                  'delaunator[\\\\/]',
                  'internmap[\\\\/]',
                  'robust-predicates[\\\\/]',
                  'cytoscape(?:-[a-z-]+)?[\\\\/]',
                  'cose-base[\\\\/]',
                  'layout-base[\\\\/]',
                  'dagre-d3-es[\\\\/]',
                  'katex[\\\\/]',
                  'roughjs[\\\\/]',
                  'points-on-curve[\\\\/]',
                  'points-on-path[\\\\/]',
                  'path-data-parser[\\\\/]',
                  'hachure-fill[\\\\/]',
                  '@upsetjs[\\\\/]',
                  '@braintree[\\\\/]',
                  '@iconify[\\\\/]',
                  'dompurify[\\\\/]',
                  'marked[\\\\/]',
                  'dayjs[\\\\/]',
                  'es-toolkit[\\\\/]',
                  'khroma[\\\\/]',
                  'ts-dedent[\\\\/]',
                  'lodash-es[\\\\/]',
                  'uuid[\\\\/]',
                  'commander[\\\\/]',
                ].join('|')})`
              ),
            },
          ],
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: 5173,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    env: {
      VITE_USE_FIREBASE_EMULATOR: 'false',
    },
  },
})
