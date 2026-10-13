import { buildApp } from './app';
import { createDependencies } from './bootstrap/dependencies';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | undefined;
let closeDependencies: (() => Promise<void>) | undefined;
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

async function start() {
  try {
    const dependencies = await createDependencies(process.env);
    closeDependencies = dependencies?.close;
    app = buildApp({ logger: true, ...(dependencies ? { auth: dependencies.auth, classroom: dependencies.classroom } : {}) });
    app.addHook('onClose', async () => { await closeDependencies?.(); });
    await app.listen({ port, host });
  } catch (error) {
    console.error(error instanceof Error && error.message.startsWith('Invalid auth configuration:') ? error.message : 'API startup failed. Check configuration and database connectivity.');
    if (app) await app.close(); else await closeDependencies?.();
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
