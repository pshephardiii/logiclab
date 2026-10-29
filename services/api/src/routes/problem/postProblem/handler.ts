import type { FastifyRequest, FastifyReply } from 'fastify';
import { createProblemRequestSchema, problemResponseSchema } from '@logiclab/contracts';
import { supportedProblemDefinition } from '../../../application/problem/definition-support';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postProblemHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const input = parseRequest(createProblemRequestSchema, request.body);
    supportedProblemDefinition(input.definition);
    const problem = await context.problems.create(user.id, input);
    reply.code(201);
    return problemResponseSchema.parse({ problem });
  };
}
