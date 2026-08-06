import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// Dev: Vite on 5173, API calls are proxied to the local Node server on 5180.
// Production: `npm run build`, then the Node server serves dist/ itself on 5180.
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5180',
      '/media': 'http://127.0.0.1:5180',
      '/uploads': 'http://127.0.0.1:5180',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
