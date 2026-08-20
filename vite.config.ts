import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin, type Rolldown } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { PREVIEW_CHANNEL, resolveAppName } from './src/services/appIdentity.ts'

// The dev server keeps 5173 by default, so the documented URL stays the one it is started on.
// `PORT` overrides it for a second checkout of this repo — two worktrees cannot both have 5173,
// and `strictPort` turns that into a hard failure rather than a silent move to another port.
// Firebase authorises `localhost` as a domain, without a port, so nothing depends on this number.
const DEV_SERVER_PORT = Number(process.env.PORT) || 5173

// Same URL the App Check SDK would inject itself (`?render=explicit` is what
// its `loadReCAPTCHAEnterpriseScript` appends).
const RECAPTCHA_ENTERPRISE_SCRIPT_URL = 'https://www.google.com/recaptcha/enterprise.js?render=explicit'

// App Check is enforced for Firestore, so no data request can leave the
// browser before Firebase App Check has exchanged a reCAPTCHA Enterprise token
// — and Auth waits for that token as well. Left to itself the App Check SDK
// only starts loading reCAPTCHA once the app bundle has been downloaded *and*
// executed, which put the whole reCAPTCHA chain (loader → 340 KB release
// script → widget iframe → token exchange) strictly behind the bundle on the
// critical path.
//
// This plugin moves the start of that chain to the top of <head>: the loader
// is a `defer` script, so it downloads in parallel with the bundle and is
// guaranteed to execute before the module entry (defer and module scripts
// share one in-order queue). The loader synchronously defines
// `grecaptcha.enterprise`, which is exactly what the App Check SDK checks
// before injecting its own script tag, so the SDK reuses it instead of
// loading a second copy. The tags are only emitted when App Check is actually
// configured, so emulator and site-key-less builds do not talk to Google.
function recaptchaBootstrap(env: Record<string, string>): Plugin {
  const enabled =
    Boolean(env.VITE_FIREBASE_APPCHECK_SITE_KEY) &&
    env.VITE_USE_FIREBASE_EMULATOR !== 'true'

  return {
    name: 'devnotes:recaptcha-bootstrap',
    transformIndexHtml() {
      if (!enabled) {
        return []
      }
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://www.google.com' }, injectTo: 'head-prepend' },
        // The release script is fetched with crossorigin="anonymous", so the
        // preconnect has to be a CORS connection to be reused.
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://www.gstatic.com', crossorigin: '' }, injectTo: 'head-prepend' },
        { tag: 'script', attrs: { defer: '', src: RECAPTCHA_ENTERPRISE_SCRIPT_URL }, injectTo: 'head-prepend' },
      ]
    },
  }
}

// `npm run preview:deploy` sets VITE_APP_CHANNEL=preview. A preview channel has
// its own Hosting domain, so Chrome installs it as a second app next to
// production; naming it "DevNotes (Preview)" is what keeps the two apart in
// chrome://apps and in the installed window's title bar.
const appName = resolveAppName(process.env.VITE_APP_CHANNEL === PREVIEW_CHANNEL)

// Pages that src/App.tsx loads with React.lazy get chunk files with a fixed
// `route-*` prefix so the service worker has a stable glob to precache them by
// (see `globPatterns` below); without that, a shell served from the precache
// after a deploy would request chunk hashes that no longer exist on Hosting
// the first time a page is opened. This only renames the files Rolldown
// produces anyway — it is deliberately not a `codeSplitting` group: a group
// takes the matched modules together with every dependency no higher-priority
// group claims, so it would re-home the modules the pages share with the
// entry (contexts, services, MUI) into the page chunks and thereby turn them
// back into eager imports. Home and Login are imported statically and stay in
// the entry chunk.
const ROUTE_CHUNK_FACADES = /[\\/]src[\\/]pages[\\/](?!Home\.tsx|Login\.tsx)[A-Za-z]+\.tsx$/
const chunkFileNames = (chunk: Rolldown.PreRenderedChunk) => {
  if (chunk.facadeModuleId) {
    return ROUTE_CHUNK_FACADES.test(chunk.facadeModuleId)
      ? 'assets/route-[name]-[hash].js'
      : 'assets/[name]-[hash].js'
  }
  // A chunk without a facade is either a `codeSplitting` group (named
  // `vendor-*` below) or one Rolldown carved out itself for modules that
  // several other chunks share. Of the latter, only chunks made of the app's
  // own modules — the auth service used by the entry and by several pages,
  // the article renderer (MarkdownRenderer.tsx) shared by the article, editor
  // and revision pages, small helpers two pages have in common — are named
  // `shared-*` and thereby precached; the shared pieces Rolldown splits out
  // of the Mermaid and Shiki graphs are node_modules code and stay on the
  // runtime cache.
  const isAppCode =
    chunk.name !== 'rolldown-runtime' &&
    chunk.moduleIds.length > 0 &&
    chunk.moduleIds.every((id) => !id.includes('node_modules'))
  return isAppCode ? 'assets/shared-[name]-[hash].js' : 'assets/[name]-[hash].js'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `loadEnv` reads the same .env files Vite exposes as import.meta.env, so
    // the bootstrap tags follow the same switch as `initializeAppCheck` in
    // src/services/firebase.ts.
    recaptchaBootstrap(loadEnv(mode, process.cwd(), 'VITE_')),
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
        // time. Only the app shell — the entry, the CSS, the eagerly
        // preloaded `vendor-*` chunks listed in dist/index.html and the
        // lazily routed pages and Rolldown's shared chunks (`route-*` and
        // `shared-*`, named by `chunkFileNames` above) —
        // is precached; everything else is picked up by the runtime cache
        // below the first time it is actually requested.
        globPatterns: [
          'index.html',
          'favicon.svg',
          '*.png',
          'assets/index-*.{js,css}',
          'assets/rolldown-runtime-*.js',
          'assets/vendor-*.{js,css}',
          'assets/route-*.{js,css}',
          'assets/shared-*.{js,css}',
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
        chunkFileNames,
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
              // react-markdown and the unified/remark/rehype/hast toolchain.
              // The inline renderer for titles and teasers needs it on the
              // start page, so it is an eager chunk. It has to rank *above*
              // vendor-shiki-core: a Rolldown group takes the matched
              // modules together with every dependency no higher-priority
              // group claims, and Shiki's `hast-util-to-html` shares
              // `property-information` & co. with react-markdown — left to
              // the Shiki group, those utilities would make the entry import
              // the Shiki chunk and drag it back into the start path.
              name: 'vendor-markdown',
              test: /node_modules[\\/](?:react-markdown|remark-[a-z-]+|rehype-[a-z-]+|unified|micromark(?:-[a-z-]+)?|mdast-util-[a-z-]+|hast-util-[a-z-]+|hastscript|unist-util-[a-z-]+|vfile(?:-message)?|property-information|space-separated-tokens|comma-separated-tokens|character-entities(?:-[a-z0-9-]+)?|character-reference-invalid|decode-named-character-reference|stringify-entities|ccount|zwitch|html-void-elements|html-url-attributes|bail|trough|devlop|extend|is-plain-obj|longest-streak|markdown-table|trim-lines|web-namespaces|style-to-js|style-to-object|inline-style-parser|estree-util-is-identifier-name|@ungap[\\/]structured-clone)[\\/]/,
              priority: 13,
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
              // KaTeX is imported eagerly by the inline renderer (via
              // rehype-katex) and shared with Mermaid, so it gets its own
              // long-lived chunk instead of riding along with either graph.
              // Ranked above vendor-markdown, whose rehype-katex would
              // otherwise pull it in (see the note on that group).
              name: 'vendor-katex',
              test: /node_modules[\\/]katex[\\/]/,
              priority: 14,
            },
            {
              // Everything else from node_modules, except the two graphs that
              // must keep their own async boundaries:
              //
              // - @shikijs/langs: one chunk per language, loaded on demand.
              // - mermaid and the packages it exclusively pulls in (d3,
              //   cytoscape, roughjs, …). Mermaid is only reached
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
    port: DEV_SERVER_PORT,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      clientPort: DEV_SERVER_PORT,
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
}))
