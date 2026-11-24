import { spawn } from 'node:child_process';
import { join } from 'node:path';

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Run real startup without loading .env or inheriting credentials from the test runner. */
async function serverProcess(
  env: NodeJS.ProcessEnv,
  check: (state: {
    output: () => string;
    exited: () => boolean;
    code: () => number | null;
  }) => Promise<void>,
) {
  const child = spawn(process.execPath, ['--import', 'tsx', join(process.cwd(), 'src/server.ts')], {
    env: { PATH: process.env.PATH, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '',
    exited = false,
    code: number | null = null;
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  child.on('exit', (value) => {
    exited = true;
    code = value;
  });
  try {
    await check({ output: () => output, exited: () => exited, code: () => code });
  } finally {
    if (!exited) child.kill('SIGTERM');
    const deadline = Date.now() + 3000;
    while (!exited && Date.now() < deadline) await pause(25);
    if (!exited) {
      const finished = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGKILL');
      await finished;
      throw new Error('Temporary API failed to shut down after SIGTERM.');
    }
  }
}

test('production practice-only starts and serves real HTTP without valid full-product configuration or a database', async () => {
  await serverProcess(
    {
      PRODUCT_EXPOSURE: 'practice-only',
      AUTH_ENABLED: 'true',
      DEMO_ENABLED: 'true',
      BILLING_ENABLED: 'true',
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
      COGNITO_CLIENT_SECRET: 'UNUSED_PRIVATE_VALUE',
    },
    async (state) => {
      const deadline = Date.now() + 8000;
      while (
        !/Server listening at http:\/\/127\.0\.0\.1:\d+/.test(state.output()) &&
        !state.exited() &&
        Date.now() < deadline
      )
        await pause(25);
      const match = state.output().match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/);
      expect(match).not.toBeNull();
      const base = match![1];
      const metadata = await fetch(`${base}/api/product-exposure`);
      expect(metadata.status).toBe(200);
      expect(await metadata.json()).toEqual({ productExposure: 'practice-only' });
      expect((await fetch(`${base}/api/health`)).status).toBe(200);
      const exercise = await fetch(`${base}/api/truth-tables/exercise`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'P & Q' }),
      });
      expect(exercise.status).toBe(200);
      expect((await fetch(`${base}/api/demo/session`)).status).toBe(404);
      expect((await fetch(`${base}/api/auth/session`)).status).toBe(404);
      expect(state.output()).not.toContain('UNUSED_PRIVATE_VALUE');
      expect(state.output()).not.toContain('API startup failed');
    },
  );
}, 15000);

test.each([
  [{}, 'PRODUCT_EXPOSURE must be explicitly set'],
  [{ PRODUCT_EXPOSURE: 'PRIVATE_INVALID_VALUE' }, 'PRODUCT_EXPOSURE must be explicitly set'],
  [{ PRODUCT_EXPOSURE: 'full', AUTH_ENABLED: 'true' }, 'Invalid auth configuration:'],
])(
  'production startup rejects missing/invalid exposure and full mode retains its dependency validation %#',
  async (env, message) => {
    await serverProcess(env, async (state) => {
      const deadline = Date.now() + 8000;
      while (!state.exited() && Date.now() < deadline) await pause(25);
      expect(state.exited()).toBe(true);
      expect(state.code()).toBe(1);
      expect(state.output()).toContain(message);
      expect(state.output()).not.toContain('Server listening');
      expect(state.output()).not.toContain('PRIVATE_INVALID_VALUE');
      expect(state.output()).not.toContain('API shutdown failed');
    });
  },
  15000,
);
