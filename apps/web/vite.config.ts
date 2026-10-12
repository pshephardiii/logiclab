import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Linked workspace contracts compile to CommonJS; prebundle them for browser development.
  optimizeDeps: { include: ['@logiclab/schema'] },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
