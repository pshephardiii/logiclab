import { randomBytes, createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { classroomParamsSchema, emptyAuthRequestSchema, invitationResponseSchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { instructor, ClassroomError } from '../helpers';
import { parseBody } from '../../auth/helpers';

export function postInvitationHandler(context: ClassroomContext, now = () => Date.now()) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { classId } = parseBody(classroomParamsSchema, request.params);
    parseBody(emptyAuthRequestSchema, request.body ?? {});
    const code = randomBytes(24).toString('base64url');
    const hash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(now() + 7 * 24 * 60 * 60 * 1000);
    if (!await context.classrooms.replaceInvitation(user.id, classId, hash, expiresAt)) {
      throw new ClassroomError(404, 'CLASS_NOT_FOUND', 'Class not found.');
    }
    return invitationResponseSchema.parse({ invitation: { code, expiresAt: expiresAt.toISOString() } });
  };
}
