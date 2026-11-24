import { productExposureResponseSchema } from '@logiclab/contracts/product-exposure';
import { requestValidatedJson } from '../validated-request';

export function loadProductExposure(signal: AbortSignal) {
  return requestValidatedJson('/api/product-exposure', {
    signal,
    schema: productExposureResponseSchema,
    error: () => new Error('Unable to verify product exposure.'),
  });
}
