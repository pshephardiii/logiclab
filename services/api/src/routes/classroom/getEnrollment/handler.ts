import type { FastifyRequest } from 'fastify';
import { classroomParamsSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { student, ClassroomError } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getEnrollmentHandler(context: ClassroomContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { classId } = parseRequest(classroomParamsSchema, request.params);
    const classroom = await context.classrooms.findEnrolled(user.id, classId);
    if (!classroom) throw new ClassroomError(404, 'CLASS_NOT_FOUND', 'Class not found.');
    return classroomResponseSchema.parse({ classroom });
  };
}
