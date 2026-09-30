import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Convenience only: the API allowlists localhost:3100/5173 for CORS, so
    // setting VITE_API_URL to the API origin directly also works in dev.
    proxy: {
      '/api': {
        target: 'https://api-operator.gilab.rs',
        changeOrigin: true,
      },
    },
  },
})
