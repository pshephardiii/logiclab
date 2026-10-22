import { postStudentCheckRoute } from './postStudentCheck/route';
import { getStudentAssignmentsRoute } from './getStudentAssignments/route';
import { getStudentAssignmentRoute } from './getStudentAssignment/route';
import { patchStudentAttemptRoute } from './patchStudentAttempt/route';
import { postStudentSubmissionRoute } from './postStudentSubmission/route';
import { getStudentSolutionRoute } from './getStudentSolution/route';
import type { FastifyInstance } from 'fastify';
import { studentWorkErrorResponseSchema } from '@logiclab/contracts';
import type { StudentWorkContext } from './context';
import { installAccountHttpPolicy } from '../account-http';
import { clearRejectedSessionCookie } from '../auth/cookies';
import { student } from './helpers';
import { mapStudentWorkError } from './errors';

export async function studentWorkRoutes(app: FastifyInstance, context: StudentWorkContext) {
  app.decorateRequest('studentWorkUser', null);
  await installAccountHttpPolicy(app, context.config);
  app.addHook('preValidation', async (request) => {
    await student(request, context);
  });
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapStudentWorkError(error);
    if (mapped.status === 401) clearRejectedSessionCookie(reply, context.config);
    if (mapped.status === 503) request.log.warn({ code: mapped.code }, 'Student work unavailable');
    return reply.code(mapped.status).send(
      studentWorkErrorResponseSchema.parse({
        error: { code: mapped.code, message: mapped.message },
      }),
    );
  });
  app.register(getStudentAssignmentsRoute, context);
  app.register(getStudentAssignmentRoute, context);
  app.register(patchStudentAttemptRoute, context);
  app.register(postStudentSubmissionRoute, context);
  app.register(getStudentSolutionRoute, context);
  app.register(postStudentCheckRoute, context);
}
