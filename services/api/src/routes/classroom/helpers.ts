import type { FastifyRequest } from 'fastify';
import type { ClassroomContext } from './context';
import { SESSION_COOKIE } from '../../auth/cookies';
import { AuthError } from '../../auth/service';

export class ClassroomError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export async function instructor(request: FastifyRequest, context: ClassroomContext) {
  const id = request.cookies[SESSION_COOKIE];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  if (user.role !== 'instructor') throw new ClassroomError(403, 'INSTRUCTOR_REQUIRED', 'An instructor account is required.');
  return user;
}
