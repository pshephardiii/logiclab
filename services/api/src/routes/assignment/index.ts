import { postAssignmentRoute } from './postAssignment/route';
import { getAssignmentsRoute } from './getAssignments/route';
import { getAssignmentRoute } from './getAssignment/route';
import { patchAssignmentRoute } from './patchAssignment/route';
import { postAssignmentPublishRoute } from './postAssignmentPublish/route';
import { postAssignmentArchiveRoute } from './postAssignmentArchive/route';
import { postAssignmentRestoreRoute } from './postAssignmentRestore/route';
import type { FastifyInstance } from 'fastify';
import { assignmentErrorResponseSchema } from '@logiclab/contracts';
import type { AssignmentContext } from './context';
import { installAccountHttpPolicy } from '../account-http';
import { clearSessionCookie } from '../auth/cookies';
import { instructor } from './helpers';
import { mapAssignmentError } from './errors';

/** Instructor-only scope; authentication and role checks precede field validation. */
export async function assignmentRoutes(app: FastifyInstance, context: AssignmentContext) {
  app.decorateRequest('assignmentUser', null);
  await installAccountHttpPolicy(app, context.config);
  app.addHook('preValidation', async (request) => {
    await instructor(request, context);
  });
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapAssignmentError(error);
    if (mapped.status === 401) clearSessionCookie(reply, context.config);
    if (mapped.status === 503)
      request.log.warn({ code: mapped.code }, 'Assignment operation unavailable');
    return reply.code(mapped.status).send(
      assignmentErrorResponseSchema.parse({
        error: { code: mapped.code, message: mapped.message },
      }),
    );
  });
  app.register(postAssignmentRoute, context);
  app.register(getAssignmentsRoute, context);
  app.register(getAssignmentRoute, context);
  app.register(patchAssignmentRoute, context);
  app.register(postAssignmentPublishRoute, context);
  app.register(postAssignmentArchiveRoute, context);
  app.register(postAssignmentRestoreRoute, context);
}
