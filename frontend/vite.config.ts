import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server binds to loopback only: this app is designed for an air-gapped host.
export default defineConfig({
  plugins: [react()],
  // ignore the backend and network-service folders when nested in this project
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: { ignored: ['**/.venv/**'] },
    proxy: {
      '/api/network': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
});
