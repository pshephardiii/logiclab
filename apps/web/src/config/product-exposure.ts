import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolveProductExposure } from '@logiclab/contracts/product-exposure';

/** Build commands require a choice even when Vite uses a custom mode such as staging. */
export function readWebProductExposure(
  env: { PRODUCT_EXPOSURE?: unknown },
  command: 'serve' | 'build',
) {
  return resolveProductExposure(env.PRODUCT_EXPOSURE, {
    production: command === 'build',
    settingName: 'PRODUCT_EXPOSURE',
  });
}

/** Read only the shared choice; never copy root credentials into Vite's public environment. */
export function loadWebProductExposure(
  rootEnvFile: URL,
  command: 'serve' | 'build',
  env: NodeJS.ProcessEnv = process.env,
) {
  const fileEnv = existsSync(rootEnvFile) ? parseEnv(readFileSync(rootEnvFile, 'utf8')) : {};

  return readWebProductExposure(
    { PRODUCT_EXPOSURE: env.PRODUCT_EXPOSURE ?? fileEnv.PRODUCT_EXPOSURE },
    command,
  );
}
