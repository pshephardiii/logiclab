import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { joinClassroomRequestSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { student, ClassroomError } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postEnrollmentHandler(context: ClassroomContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { code } = parseRequest(joinClassroomRequestSchema, request.body);
    const classroom = await context.classrooms.join(
      user.id,
      createHash('sha256').update(code).digest('hex'),
    );
    if (!classroom) {
      throw new ClassroomError(
        400,
        'INVITATION_INVALID',
        'This invitation is invalid or expired. Ask your instructor for a current code.',
      );
    }
    return classroomResponseSchema.parse({ classroom });
  };
}
