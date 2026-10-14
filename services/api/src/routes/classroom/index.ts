import { mapClassroomError } from './errors';
import { installAccountHttpPolicy } from '../account-http';
import { instructor, student } from './helpers';
import { getEnrollmentRoute } from './getEnrollment/route';
import { getEnrollmentsRoute } from './getEnrollments/route';
import { postEnrollmentRoute } from './postEnrollment/route';
import type { FastifyInstance } from 'fastify';
import { authErrorResponseSchema } from '@logiclab/contracts';
import { clearSessionCookie } from '../auth/cookies';
import type { ClassroomContext } from './context';
import { postInvitationRoute } from './postInvitation/route';
import { postClassroomRoute } from './postClassroom/route';
import { getClassroomsRoute } from './getClassrooms/route';
import { getClassroomRoute } from './getClassroom/route';

/**
 * Registers class/enrollment endpoints with role checks before field validation and scoped error mapping.
 */
export async function classroomRoutes(app: FastifyInstance, context: ClassroomContext) {
  app.decorateRequest('classroomUser', null);
  await installAccountHttpPolicy(app, context.config);
  // Preserve authorization-before-field-validation, without authenticating twice.
  app.addHook('preValidation', async (request) => {
    const authorize = request.routeOptions.url?.startsWith('/api/enrollments')
      ? student
      : instructor;
    await authorize(request, context);
  });
  app.setErrorHandler((error, request, reply) => {
    const { status, code, message } = mapClassroomError(error);
    if (status === 401) clearSessionCookie(reply, context.config);
    if (status === 503) request.log.warn({ code }, 'Classroom operation unavailable');
    return reply.code(status).send(authErrorResponseSchema.parse({ error: { code, message } }));
  });
  app.register(postEnrollmentRoute, context);
  app.register(getEnrollmentsRoute, context);
  app.register(getEnrollmentRoute, context);
  app.register(postInvitationRoute, context);
  app.register(postClassroomRoute, context);
  app.register(getClassroomsRoute, context);
  app.register(getClassroomRoute, context);
}
