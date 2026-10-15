import type { FastifyRequest, FastifyReply } from 'fastify';
import { problemParamsSchema, problemResponseSchema } from '@logiclab/contracts';
import { ProblemError } from '../errors';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getProblemHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);
    const problem = await context.problems.findOwned(user.id, problemId);
    if (!problem) throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');
    return problemResponseSchema.parse({ problem });
  };
}
