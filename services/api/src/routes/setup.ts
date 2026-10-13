import type { FastifyInstance, FastifySchema } from 'fastify';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';

export type RouteSchema = FastifySchema & { summary: string; description: string };
export function installZodSchemas(app: FastifyInstance) {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
}
/** Install before @fastify/rate-limit so its onRoute hook sees the final config. */
export function installRateLimitDefaults(app: FastifyInstance) {
  app.addHook('onRoute', route => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const readOnly = methods.every(method => method === 'GET' || method === 'HEAD');
    const defaults = readOnly ? { max: 60, timeWindow: '1 minute' } : { max: 10, timeWindow: '15 minutes' };
    const override = route.config?.rateLimit;
    if (override === false) return;
    route.config = { ...route.config, rateLimit: { ...defaults, ...override } };
  });
}
