import { buildApp } from './app';

const app = buildApp({ logger: true });
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

async function start() {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    try { await app.close(); }
    catch (error) { app.log.error(error); process.exitCode = 1; }
  });
}
void start();
