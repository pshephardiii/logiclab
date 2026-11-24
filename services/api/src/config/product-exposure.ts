import { resolveProductExposure } from '@logiclab/contracts/product-exposure';

/** Resolve exposure before opening application resources or registering resource routes. */
export function readProductExposureConfig(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== undefined && !['development', 'test', 'production'].includes(env.NODE_ENV))
    throw new Error(
      'Invalid product exposure configuration: NODE_ENV must be development, test or production.',
    );

  return resolveProductExposure(env.PRODUCT_EXPOSURE, {
    production: env.NODE_ENV === 'production',
    settingName: 'PRODUCT_EXPOSURE',
  });
}
