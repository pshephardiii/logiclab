import { resolveProductExposure } from '@logiclab/contracts/product-exposure';

/** Build commands require a choice even when Vite uses a custom mode such as staging. */
export function readWebProductExposure(
  env: { VITE_PRODUCT_EXPOSURE?: unknown },
  command: 'serve' | 'build',
) {
  return resolveProductExposure(env.VITE_PRODUCT_EXPOSURE, {
    production: command === 'build',
    settingName: 'VITE_PRODUCT_EXPOSURE',
  });
}
