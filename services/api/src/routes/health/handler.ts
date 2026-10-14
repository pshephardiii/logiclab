import { healthResponseSchema } from '@logiclab/contracts';

export async function healthHandler() {
  return healthResponseSchema.parse({ status: 'ok', service: 'logiclab-api' });
}
