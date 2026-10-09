import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    origin: 'http://localhost:5173'
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});