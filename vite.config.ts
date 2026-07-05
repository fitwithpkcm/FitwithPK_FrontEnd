import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'FitwithPK',
        short_name: 'FitwithPK',
        description: 'Your fitness application',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icons/icon-48x48.png',   sizes: '48x48',   type: 'image/png' },
          { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
     
    })
  ],
  server: {
    port: 5173,
    open: true,
    allowedHosts: ['fitapp.mazhaundo.com', 'localhost', '127.0.0.1'],
  },
  preview: {
    allowedHosts: ['fitwithpk.com', 'www.fitwithpk.com', 'localhost'],
  }
})
