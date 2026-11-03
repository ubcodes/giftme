import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    nitroV2Plugin({
      compatibilityDate: '2025-10-08',
      preset: process.env.NITRO_PRESET ?? 'node-server',
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
