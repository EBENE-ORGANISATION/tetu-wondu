import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Séparer les gros morceaux qui ne changent jamais : ils restent en cache
    // du navigateur d'une visite à l'autre. Sur 3G instable, c'est ce qui évite
    // de retélécharger 120 Ko à chaque mise à jour du catalogue.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
        },
      },
    },
    // Alerte si un morceau dépasse 150 Ko non compressé (~50 Ko gzip).
    chunkSizeWarningLimit: 150,
  },
})
