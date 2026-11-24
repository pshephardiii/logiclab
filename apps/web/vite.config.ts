import { defineConfig } from 'vite';
import { loadWebProductExposure } from './src/config/product-exposure.ts';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const exposure = loadWebProductExposure(new URL('../../.env', import.meta.url), command);

  return {
    define: { 'import.meta.env.PRODUCT_EXPOSURE': JSON.stringify(exposure) },
    plugins: [react()],
    // Prebundle linked workspace CommonJS entry points for browser development.
    // Rebuild on startup so new workspace exports cannot reuse an old prebundle.
    optimizeDeps: {
      force: true,
      include: [
        '@logiclab/contracts',
        '@logiclab/logic-engine',
        '@logiclab/logic-engine/proof',
        '@logiclab/logic-engine/proof/rules',
        '@logiclab/logic-engine/proof/completion',
        '@logiclab/logic-engine/truth-tree',
      ],
    },
    server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  };
});
