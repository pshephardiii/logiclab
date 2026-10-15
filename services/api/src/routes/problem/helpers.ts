import type { FastifyRequest } from 'fastify';
import type { AppUser } from '../../application/auth/types';
import { AuthError } from '../../application/auth/service';
import { SESSION_COOKIE } from '../auth/cookies';
import type { ProblemContext } from './context';
import { ProblemError } from './errors';

/** Reuse group authorization within one request; never accept client-provided ownership. */
export async function instructor(
  request: FastifyRequest,
  context: ProblemContext,
): Promise<AppUser> {
  const scoped = request as FastifyRequest & { problemUser?: AppUser | null };
  if (scoped.problemUser) return scoped.problemUser;
  const id = request.cookies[SESSION_COOKIE];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'instructor')
    throw new ProblemError(403, 'INSTRUCTOR_REQUIRED', 'An instructor account is required.');
  scoped.problemUser = user;
  return user;
}
