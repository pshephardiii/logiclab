import type { FastifyRequest } from 'fastify';
import { classroomParamsSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { instructor, ClassroomError } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getClassroomHandler(context: ClassroomContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { classId } = parseRequest(classroomParamsSchema, request.params);
    const classroom = await context.classrooms.findOwned(user.id, classId);
    if (!classroom) throw new ClassroomError(404, 'CLASS_NOT_FOUND', 'Class not found.');
    return classroomResponseSchema.parse({ classroom });
  };
}
