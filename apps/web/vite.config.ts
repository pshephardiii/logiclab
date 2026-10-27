import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Prebundle linked workspace contracts for browser development.
  // Rebuild on startup so new workspace exports cannot reuse an old prebundle.
  optimizeDeps: { force: true, include: ['@logiclab/contracts', '@logiclab/logic-engine'] },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
