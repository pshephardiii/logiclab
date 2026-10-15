import type { FastifyRequest, FastifyReply } from 'fastify';
import { createProblemRequestSchema, problemResponseSchema } from '@logiclab/contracts';
import { parseFormula } from '@logiclab/logic-engine';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postProblemHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const input = parseRequest(createProblemRequestSchema, request.body);
    parseFormula(input.definition.formula);
    const problem = await context.problems.create(user.id, input);
    return reply.code(201).send(problemResponseSchema.parse({ problem }));
  };
}
