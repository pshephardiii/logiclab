import { errorName } from '../helpers/errors';
import { installAccountHttpPolicy } from '../account-http';
import { instructor, student } from './helpers';
import { getEnrollmentRoute } from './getEnrollment/route';
import { getEnrollmentsRoute } from './getEnrollments/route';
import { postEnrollmentRoute } from './postEnrollment/route';
import type { FastifyInstance } from 'fastify';
import { authErrorResponseSchema } from '@logiclab/contracts';
import { AuthError } from '../../application/auth/service';
import { clearSessionCookie } from '../auth/cookies';
import { ClassroomError } from './helpers';
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
  app.addHook('preValidation', async request => {
    const authorize = request.routeOptions.url?.startsWith('/api/enrollments') ? student : instructor;
    await authorize(request, context);
  });
  app.setErrorHandler((error, request, reply) => {
    let status = 503, code = 'CLASSROOM_UNAVAILABLE', message = 'Classes are temporarily unavailable. Please try again.';
    if (error instanceof ClassroomError) { status = error.status; code = error.code; message = error.message; }
    else if ((error instanceof AuthError && error.code === 'INVALID_REQUEST') || (error instanceof Error && 'validation' in error)) { status = 400; code = 'INVALID_REQUEST'; message = 'Check the supplied fields and try again.'; }
    else if (error instanceof AuthError && error.code.startsWith('SESSION_')) { status = 401; code = 'AUTH_REQUIRED'; message = 'Please sign in again.'; }
    else if (error instanceof Error && error.message === 'AUTH_ORIGIN_REJECTED') { status = 403; code = 'ORIGIN_REJECTED'; message = 'This request origin is not allowed.'; }
    else if (error instanceof Error && ['NotAuthorizedException', 'UserNotFoundException'].includes(errorName(error)) || error instanceof AuthError && ['EMAIL_NOT_VERIFIED', 'ACCOUNT_NOT_PROVISIONED'].includes(error.code)) { status = 401; code = 'AUTH_REQUIRED'; message = 'Please sign in again.'; }
    else if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && [400, 413, 415, 429].includes(error.statusCode)) { status = error.statusCode; code = status === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST'; message = status === 429 ? 'Too many requests. Please try again later.' : 'Provide a valid, bounded JSON request.'; }
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
