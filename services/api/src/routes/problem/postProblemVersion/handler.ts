import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  problemParamsSchema,
  emptyProblemRequestSchema,
  problemVersionResponseSchema,
} from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { ProblemError } from '../errors';

export function postProblemVersionHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);
    parseRequest(emptyProblemRequestSchema, request.body ?? {});
    const result = await context.problems.publish(user.id, problemId);
    if (result.status === 'not_found')
      throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');
    if (result.status === 'archived')
      throw new ProblemError(409, 'PROBLEM_ARCHIVED', 'Restore this problem before publishing.');
    return reply.code(201).send(problemVersionResponseSchema.parse({ version: result.version }));
  };
}
