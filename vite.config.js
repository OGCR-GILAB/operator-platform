import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env files merged with process.env (process.env wins, e.g. a Docker build-arg)
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (!env.VITE_API_URL) {
    throw new Error('VITE_API_URL is not set. Copy .env.example to .env and set the operator API URL.')
  }

  return {
    plugins: [react(), tailwindcss()],
  }
})
