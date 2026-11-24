import type { FastifyInstance } from 'fastify';
import {
  productExposureResponseSchema,
  type ProductExposure,
} from '@logiclab/contracts/product-exposure';
import { installZodSchemas, type RouteSchema } from '../setup';

const schema = {
  summary: 'Read product exposure',
  description:
    'Public exposure metadata for frontend/API mode agreement; no service configuration.',
  response: { 200: productExposureResponseSchema },
} satisfies RouteSchema;

export async function productExposureRoute(
  app: FastifyInstance,
  { productExposure }: { productExposure: ProductExposure },
) {
  installZodSchemas(app);
  app.get('/api/product-exposure', { schema }, (_request, reply) =>
    reply.header('cache-control', 'no-store').send({ productExposure }),
  );
}
