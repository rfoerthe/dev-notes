import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
              test: /node_modules[\\/](?:shiki|@shikijs[\\/](?:core|engine-javascript|primitive|themes|types|vscode-textmate))[\\/]/,
              priority: 12,
            },
            {
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/](?!@shikijs[\\/]langs[\\/])/,
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
