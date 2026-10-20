import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// VITE_BASE is set in the GitHub Pages workflow (e.g. "/food-passport-bangladesh/").
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
})
