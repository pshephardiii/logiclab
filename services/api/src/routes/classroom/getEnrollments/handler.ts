import { classroomPage } from '../pagination';
import type { FastifyRequest } from 'fastify';
import { classroomListQuerySchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { student } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';
export function getEnrollmentsHandler(context: ClassroomContext) {
  return async (request: FastifyRequest) => {
    const user = await student(request, context);
    const { limit, offset } = parseRequest(classroomListQuerySchema, request.query);
    const rows = await context.classrooms.listEnrolled(user.id, limit + 1, offset);
    return classroomPage(rows, { limit, offset });
  };
}
