import type { FastifyRequest } from 'fastify';
import type { ResourceUser } from '../resource-context';
import { AuthError } from '../../application/auth/service';
import { cookieName } from '../auth/cookies';
import type { AssignmentContext } from './context';
import { AssignmentError } from './errors';

/** Reuse group authorization within one request; never accept client-provided ownership. */
export async function instructor(
  request: FastifyRequest,
  context: AssignmentContext,
): Promise<ResourceUser> {
  const scoped = request as FastifyRequest & { assignmentUser?: ResourceUser | null };
  if (scoped.assignmentUser) return scoped.assignmentUser;
  const id = request.cookies[cookieName(context.config)];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'instructor')
    throw new AssignmentError(403, 'INSTRUCTOR_REQUIRED', 'An instructor account is required.');
  scoped.assignmentUser = user;
  return user;
}
