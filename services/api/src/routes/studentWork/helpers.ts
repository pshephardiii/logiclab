import type { FastifyRequest } from 'fastify';
import type { AppUser } from '../../application/auth/types';
import { AuthError } from '../../application/auth/service';
import { SESSION_COOKIE } from '../auth/cookies';
import type { StudentWorkContext } from './context';
import { StudentWorkRouteError } from './errors';

/** Reuse group authorization within one request; never accept client-provided ownership. */
export async function student(
  request: FastifyRequest,
  context: StudentWorkContext,
): Promise<AppUser> {
  const scoped = request as FastifyRequest & { studentWorkUser?: AppUser | null };
  if (scoped.studentWorkUser) return scoped.studentWorkUser;
  const id = request.cookies[SESSION_COOKIE];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'student')
    throw new StudentWorkRouteError(403, 'STUDENT_REQUIRED', 'A student account is required.');
  scoped.studentWorkUser = user;
  return user;
}
