import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, relative /api calls are proxied to the Express server.
// In Docker/Kubernetes, nginx does the same job (see nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
});
