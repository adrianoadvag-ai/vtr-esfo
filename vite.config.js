import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PREVIA=1 gera uma versão sem service worker, para a prévia de demonstração
const previa = process.env.PREVIA === '1'

// Na prévia, o módulo do Firebase vira o de demonstração (página única, sem dependências externas)
const soDemo = {
  name: 'so-demo',
  enforce: 'pre',
  resolveId(fonte, importador) {
    if (previa && fonte === './firebase.js' && importador?.includes('/src/data/')) return this.resolve('./demo.js', importador)
  },
}

export default defineConfig({
  base: './',
  build: previa
    ? { target: 'es2022', assetsInlineLimit: 1e8, cssCodeSplit: false, rolldownOptions: { output: { inlineDynamicImports: true } } }
    : { target: 'es2022' },
  define: {
    'import.meta.env.VITE_PREVIA': JSON.stringify(previa ? '1' : ''),
    ...(previa ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {}),
  },
  plugins: [
    soDemo,
    react(),
    !previa &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Missão Viaturas · EsFO',
          short_name: 'VTR EsFO',
          description: 'Vistoria diária das viaturas da EsFO',
          lang: 'pt-BR',
          // Identidade do app no celular. Trocada em 26/10/2026 porque o Chrome dizia "já instalado" depois de desinstalar.
          id: '/vtr-esfo/?app=2',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#071c40',
          theme_color: '#071c40',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
          navigateFallback: 'index.html',
        },
      }),
  ].filter(Boolean),
})
