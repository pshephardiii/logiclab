import { buildApp } from './app';
import { createAuthFoundation } from './auth/foundation';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | undefined;
let closeAuth: (() => Promise<void>) | undefined;
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

async function start() {
  try {
    const auth = await createAuthFoundation(process.env);
    closeAuth = auth?.close;
    app = buildApp({ logger: true, ...(auth ? { auth } : {}) });
    app.addHook('onClose', async () => { await closeAuth?.(); });
    await app.listen({ port, host });
  } catch (error) {
    console.error(error instanceof Error && error.message.startsWith('Invalid auth configuration:') ? error.message : 'API startup failed. Check configuration and database connectivity.');
    if (app) await app.close(); else await closeAuth?.();
    process.exitCode = 1;
  }
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    try { await app?.close(); }
    catch { console.error('API shutdown failed.'); process.exitCode = 1; }
  });
}
void start();
