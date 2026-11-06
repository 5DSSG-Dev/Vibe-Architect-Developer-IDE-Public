import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Optional loopback bridge for a separate local UI preview; model credentials stay in the gateway.
const gatewayUrl = process.env.LUMINARY_GATEWAY_URL;
if (gatewayUrl) {
  const gateway = new URL(gatewayUrl);
  if (!['http:', 'https:'].includes(gateway.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(gateway.hostname) || gateway.username || gateway.password || gateway.pathname !== '/' || gateway.search || gateway.hash) throw new Error('LUMINARY_GATEWAY_URL must name a loopback gateway origin.');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Generated app source/build HTML must not reload the IDE during generation.
    watch: { ignored: ['**/output/**', '**/.luminary/**'] },
    ...(gatewayUrl ? { proxy: { '/api/luminary': { target: gatewayUrl, changeOrigin: true } } } : {}),
    port: 3002,
    host: true,
    // Allow Cloudflare quick-tunnel hostnames to reach the dev server (Vite's
    // host check otherwise rejects the trycloudflare.com Host header).
    allowedHosts: ['.trycloudflare.com']
  }
})
