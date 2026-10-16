import type { FastifyRequest } from 'fastify';
import type { AppUser } from '../../application/auth/types';
import { AuthError } from '../../application/auth/service';
import { SESSION_COOKIE } from '../auth/cookies';
import type { AssignmentContext } from './context';
import { AssignmentError } from './errors';

/** Reuse group authorization within one request; never accept client-provided ownership. */
export async function instructor(
  request: FastifyRequest,
  context: AssignmentContext,
): Promise<AppUser> {
  const scoped = request as FastifyRequest & { assignmentUser?: AppUser | null };
  if (scoped.assignmentUser) return scoped.assignmentUser;
  const id = request.cookies[SESSION_COOKIE];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'instructor')
    throw new AssignmentError(403, 'INSTRUCTOR_REQUIRED', 'An instructor account is required.');
  scoped.assignmentUser = user;
  return user;
}
