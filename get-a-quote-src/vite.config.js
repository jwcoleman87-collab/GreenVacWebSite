import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/get-a-quote/',
  build: {
    outDir: '../get-a-quote',
    emptyOutDir: true,
  },
})
