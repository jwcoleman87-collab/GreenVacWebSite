import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/get-a-quote/',
  build: {
    outDir: '../get-a-quote',
    emptyOutDir: true,
  },
  // Dev only -- `server` is ignored by `vite build`, so none of this ships.
  // The estimator loads /images, /fonts and /js from the site root, which lives
  // one level above this app, so the dev server borrows them from the static
  // server on 8123 (the `greenvac-static` launch config).
  server: {
    port: 5173,
    proxy: {
      '/images': 'http://localhost:8123',
      '/fonts': 'http://localhost:8123',
      '/js': 'http://localhost:8123',
      '/favicon.ico': 'http://localhost:8123',
    },
  },
})
