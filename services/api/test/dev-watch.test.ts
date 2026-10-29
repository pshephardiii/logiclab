import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Regression for a watcher waiting forever on a child that already exited by signal. */
test('the API dev watcher exits after its child has already terminated by signal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'logiclab-dev-watch-'));
  const fixture = join(directory, 'exit.ts');
  await writeFile(
    fixture,
    "const marker: string = 'DEV_WATCH_READY'; console.log(marker); setTimeout(() => process.kill(process.pid, 'SIGKILL'), 50);\n",
  );
  const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
  // Exercise the actual dev watcher/loader, with neither application startup nor .env access.
  const arguments_ = manifest.scripts.dev
    .split(' ')
    .slice(1)
    .filter((argument: string) => !argument.startsWith('--env-file'))
    .map((argument: string) => (argument === 'src/server.ts' ? fixture : argument));
  const watcher = spawn(process.execPath, arguments_, { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let exited = false;
  watcher.stdout.on('data', (chunk) => {
    output += chunk;
  });
  watcher.stderr.on('data', (chunk) => {
    output += chunk;
  });
  watcher.on('exit', () => {
    exited = true;
  });
  try {
    const readyDeadline = Date.now() + 8000;
    while (
      (!output.includes('DEV_WATCH_READY') || !output.includes('Failed running')) &&
      !exited &&
      Date.now() < readyDeadline
    )
      await pause(50);
    expect(output).toContain('DEV_WATCH_READY');
    // Confirm the child has actually exited before signaling its surviving watcher.
    expect(output).toContain('Failed running');
    expect(exited).toBe(false);
    watcher.kill('SIGTERM');
    const shutdownDeadline = Date.now() + 4000;
    while (!exited && Date.now() < shutdownDeadline) await pause(50);
    expect(exited).toBe(true);
  } finally {
    if (!exited) {
      const finished = new Promise((resolve) => watcher.once('exit', resolve));
      watcher.kill('SIGKILL');
      await finished;
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 15000);
