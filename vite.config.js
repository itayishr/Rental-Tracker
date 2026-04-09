import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com', '.ts.net'],
    proxy: {
       '/api': 'http://localhost:3001',
       '/uploads': 'http://localhost:3001'
    }
  }
})
