import { postProblemReferenceCheckRoute } from './postProblemReferenceCheck/route';
import { postProblemVersionRoute } from './postProblemVersion/route';
import { getProblemVersionsRoute } from './getProblemVersions/route';
import { getProblemVersionRoute } from './getProblemVersion/route';
import { postProblemArchiveRoute } from './postProblemArchive/route';
import { postProblemRestoreRoute } from './postProblemRestore/route';
import type { FastifyInstance } from 'fastify';
import { problemErrorResponseSchema } from '@logiclab/contracts';
import { installAccountHttpPolicy } from '../account-http';
import { clearRejectedSessionCookie } from '../auth/cookies';
import type { ProblemContext } from './context';
import { instructor } from './helpers';
import { mapProblemError } from './errors';
import { postProblemRoute } from './postProblem/route';
import { getProblemsRoute } from './getProblems/route';
import { getProblemRoute } from './getProblem/route';
import { patchProblemRoute } from './patchProblem/route';

/** Private instructor scope; authorization precedes field validation. */
export async function problemRoutes(app: FastifyInstance, context: ProblemContext) {
  app.decorateRequest('problemUser', null);
  await installAccountHttpPolicy(app, context.config);
  app.addHook('preValidation', async (request) => {
    await instructor(request, context);
  });
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapProblemError(error);
    if (mapped.status === 401) clearRejectedSessionCookie(reply, context.config);
    if (mapped.status === 503)
      request.log.warn({ code: mapped.code }, 'Problem operation unavailable');
    const { status, ...publicError } = mapped;
    // Keep auth's internal logging classification out of public responses.
    return reply.code(status).send(
      problemErrorResponseSchema.parse({
        error: {
          code: publicError.code,
          message: publicError.message,
          ...('position' in publicError ? { position: publicError.position } : {}),
        },
      }),
    );
  });
  app.register(postProblemReferenceCheckRoute, context);
  app.register(postProblemRoute, context);
  app.register(getProblemsRoute, context);
  app.register(getProblemRoute, context);
  app.register(patchProblemRoute, context);
  app.register(postProblemVersionRoute, context);
  app.register(getProblemVersionsRoute, context);
  app.register(getProblemVersionRoute, context);
  app.register(postProblemArchiveRoute, context);
  app.register(postProblemRestoreRoute, context);
}
