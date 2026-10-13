import type { FastifyRequest, FastifyReply } from 'fastify';
import { createClassroomRequestSchema, classroomResponseSchema } from '@logiclab/contracts';
import type { ClassroomContext } from '../context';
import { instructor } from '../helpers';
import { parseBody } from '../../auth/helpers';

export function postClassroomHandler(context: ClassroomContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { name } = parseBody(createClassroomRequestSchema, request.body);
    const classroom = await context.classrooms.create(user.id, name);
    return reply.code(201).send(classroomResponseSchema.parse({ classroom }));
  };
}
