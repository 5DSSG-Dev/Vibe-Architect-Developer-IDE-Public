import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    // Allow Cloudflare quick-tunnel hostnames to reach the dev server (Vite's
    // host check otherwise rejects the trycloudflare.com Host header).
    allowedHosts: ['.trycloudflare.com']
  }
})
