import {
  updateLibraryProblemRequestSchema,
  libraryProblemResponseSchema,
} from '@logiclab/contracts/problem-library';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { problemParamsSchema } from '@logiclab/contracts';
import { libraryProblemDefinition } from '../../../application/problem/library-definition';
import { ProblemError } from '../errors';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function patchProblemHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);
    const input = parseRequest(updateLibraryProblemRequestSchema, request.body);
    if (input.definition) libraryProblemDefinition(input.definition);
    const result = await context.problems.update(user.id, problemId, input);
    if (result.status === 'not_found')
      throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');
    if (result.status === 'archived')
      throw new ProblemError(
        409,
        'PROBLEM_ARCHIVED',
        'Restore this problem before editing its draft.',
      );
    return libraryProblemResponseSchema.parse({ problem: result.problem });
  };
}
