import type { FastifyInstance } from 'fastify';
import type { DemoRuntime } from '../../bootstrap/demo';
import { AuthError } from '../../application/auth/service';
import { DemoSessionError } from '../../application/demo/service';
import { mapAuthError } from '../auth/errors';
import { authErrorResponseSchema } from '@logiclab/contracts';

export const demoErrorResponses = {
  400: authErrorResponseSchema,
  401: authErrorResponseSchema,
  403: authErrorResponseSchema,
  429: authErrorResponseSchema,
  503: authErrorResponseSchema,
};
export function installDemoErrors(app: FastifyInstance, runtime: DemoRuntime) {
  app.setErrorHandler((error, request, reply) => {
    const invalid = error instanceof DemoSessionError || error instanceof AuthError;
    const mapped = invalid
      ? {
          status: 401,
          code: 'DEMO_SESSION_INVALID',
          message: 'Your demo expired or changed. Start a new demo.',
        }
      : mapAuthError(error);
    if (mapped.status === 503)
      request.log.warn({ code: 'DEMO_UNAVAILABLE' }, 'Demo operation unavailable');
    return reply.code(mapped.status).send({
      error: {
        code: mapped.code,
        message:
          mapped.status === 503
            ? 'Demo is temporarily unavailable or at capacity. Please try again later.'
            : mapped.message,
      },
    });
  });
}
