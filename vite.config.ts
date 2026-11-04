import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

const icon = { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' }

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    nitroV2Plugin({
      compatibilityDate: '2025-10-08',
      preset: process.env.NITRO_PRESET ?? 'node-server',
      // Built files carry a content hash in their name, so browsers can keep them for a year.
      // Everything else in public/ keeps a week, then checks back quietly in the background.
      routeRules: {
        '/assets/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
        '/images/**': { headers: { 'cache-control': 'public, max-age=604800, stale-while-revalidate=86400' } },
        '/video/**': { headers: { 'cache-control': 'public, max-age=604800, stale-while-revalidate=86400' } },
        '/favicon.ico': { headers: icon },
        '/favicon-32.png': { headers: icon },
        '/favicon-96.png': { headers: icon },
        '/apple-touch-icon.png': { headers: icon },
        '/icon-192.png': { headers: icon },
        '/icon-512.png': { headers: icon },
        '/og.jpg': { headers: icon },
      },
    }),
    viteReact(),
  ],
  server: {
    port: 3200,
    strictPort: true,
    host: true,
    // ngrok and other tunnels forward with their own Host header.
    allowedHosts: true,
  },
})
