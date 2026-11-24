import { createShutdownHandler } from './bootstrap/shutdown';
import { createDemoDependencies } from './bootstrap/demo';
import { buildApp } from './app';
import { createDependencies } from './bootstrap/dependencies';
import type { FastifyInstance } from 'fastify';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { readProductExposureConfig } from './config/product-exposure';

let app: FastifyInstance | undefined;

let closeDependencies: (() => Promise<void>) | undefined;

const port = Number(process.env.PORT ?? 3000);

const host = process.env.HOST ?? '0.0.0.0';

let stopping = false;

const closeOnShutdown = createShutdownHandler({
  close: async () => {
    // A signal during dependency initialization must not strand resources or start a new listener.
    await startup;

    if (app) await app.close();
    else await closeDependencies?.();
  },
  onError: () => {
    console.error('API shutdown failed.');
    process.exitCode = 1;
  },
  onTimeout: () => console.error('API shutdown exceeded 10 seconds; forcing exit.'),
  forceExit: (code) => process.exit(code),
});

function shutdown() {
  stopping = true;
  closeOnShutdown();
}

/** Connects application startup/shutdown to dependency creation and shared-resource cleanup. */
async function start() {
  try {
    const productExposure = readProductExposureConfig(process.env);
    const fullProduct = productExposure === ProductExposure.Full;
    const dependencies = fullProduct ? await createDependencies(process.env) : null;
    let demo: Awaited<ReturnType<typeof createDemoDependencies>> = null;

    closeDependencies = async () => {
      try {
        await demo?.close();
      } finally {
        await dependencies?.close();
      }
    };

    if (stopping) return;

    demo = fullProduct ? await createDemoDependencies(process.env) : null;

    if (stopping) return;

    app = buildApp({
      logger: true,
      productExposure,
      ...(demo ? { demo: demo.runtime } : {}),
      ...(dependencies
        ? {
            billing: dependencies.billing,
            auth: dependencies.auth,
            classroom: dependencies.classroom,
            problem: dependencies.problem,
            assignment: dependencies.assignment,
            studentWork: dependencies.studentWork,
          }
        : {}),
    });

    app.addHook('onClose', async () => {
      await closeDependencies?.();
    });
    await app.listen({ port, host });
  } catch (error) {
    console.error(
      error instanceof Error &&
        (error.message.startsWith('Invalid auth configuration:') ||
          error.message.startsWith('Invalid product exposure configuration:'))
        ? error.message
        : 'API startup failed. Check configuration and database connectivity.',
    );
    process.exitCode = 1;
    shutdown();
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, shutdown);
}

const startup = start();
