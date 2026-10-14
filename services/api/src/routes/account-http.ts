import type { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit, { type RateLimitPluginOptions } from '@fastify/rate-limit';
import type { AuthConfig } from '../config/auth';
import { assertAuthOrigin } from './auth/cookies';
import { installZodSchemas, installRateLimitDefaults } from './setup';

/** Apply directly to the existing group scope, so child endpoints inherit its policies. */
export async function installAccountHttpPolicy(
  app: FastifyInstance,
  config: AuthConfig,
  rateLimitOptions: RateLimitPluginOptions = {},
) {
  installZodSchemas(app);
  await app.register(cookie);
  installRateLimitDefaults(app);
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    ...rateLimitOptions,
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (request.method !== 'GET') assertAuthOrigin(request, config);
  });
}
