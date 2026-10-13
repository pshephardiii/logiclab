import type { AppUser } from '../../auth/types';
import type { FastifyRequest } from 'fastify';
import type { ClassroomContext } from './context';
import { SESSION_COOKIE } from '../../auth/cookies';
import { AuthError } from '../../auth/service';

export class ClassroomError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export async function instructor(request: FastifyRequest, context: ClassroomContext) {
  const user = await classroomUser(request, context);
  if (user.role !== 'instructor') throw new ClassroomError(403, 'INSTRUCTOR_REQUIRED', 'An instructor account is required.');
  return user;
}

export async function student(request: FastifyRequest, context: ClassroomContext) {
  const user = await classroomUser(request, context);
  if (user.role !== 'student') throw new ClassroomError(403, 'STUDENT_REQUIRED', 'A student account is required.');
  return user;
}

async function classroomUser(request: FastifyRequest, context: ClassroomContext): Promise<AppUser> {
  const scoped = request as FastifyRequest & { classroomUser?: AppUser | null };
  if (scoped.classroomUser) return scoped.classroomUser;
  const id = request.cookies[SESSION_COOKIE];
  if (!id) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(id);
  scoped.classroomUser = user;
  return user;
}
