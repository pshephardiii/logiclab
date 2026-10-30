import { libraryProblemResponseSchema } from '@logiclab/contracts/problem-library';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { problemParamsSchema, emptyProblemRequestSchema } from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { ProblemError } from '../errors';

export function postProblemRestoreHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);
    parseRequest(emptyProblemRequestSchema, request.body ?? {});
    const problem = await context.problems.setArchived(user.id, problemId, false);
    if (!problem) throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');
    return libraryProblemResponseSchema.parse({ problem });
  };
}
