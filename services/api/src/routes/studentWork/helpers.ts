import type { FastifyRequest } from 'fastify';
import type { ResourceUser } from '../resource-context';
import { AuthError } from '../../application/auth/service';
import { cookieName } from '../auth/cookies';
import type { StudentWorkContext } from './context';
import { StudentWorkRouteError } from './errors';

/** Reuse group authorization within one request; never accept client-provided ownership. */
export async function student(
  request: FastifyRequest,
  context: StudentWorkContext,
): Promise<ResourceUser> {
  const scoped = request as FastifyRequest & { studentWorkUser?: ResourceUser | null };
  if (scoped.studentWorkUser) return scoped.studentWorkUser;
  const id = request.cookies[cookieName(context.config)];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'student')
    throw new StudentWorkRouteError(403, 'STUDENT_REQUIRED', 'A student account is required.');
  scoped.studentWorkUser = user;
  return user;
}
