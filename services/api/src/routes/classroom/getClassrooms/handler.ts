import { classroomPage } from '../pagination';
import type { FastifyRequest } from 'fastify';
import { classroomListQuerySchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { instructor } from '../helpers';
import { parseBody } from '../../auth/helpers';

export function getClassroomsHandler(context: ClassroomContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { limit, offset } = parseBody(classroomListQuerySchema, request.query);
    const rows = await context.classrooms.list(user.id, limit + 1, offset);
    return classroomPage(rows, { limit, offset });
  };
}
