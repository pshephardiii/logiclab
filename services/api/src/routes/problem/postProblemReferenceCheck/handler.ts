import type { FastifyRequest } from 'fastify';
import { emptyProblemRequestSchema, problemParamsSchema } from '@logiclab/contracts';
import { libraryReferenceCheckResponseSchema } from '@logiclab/contracts/problem-library';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { ProblemError } from '../errors';
import { parseRequest } from '../../helpers/parse-request';

export function postProblemReferenceCheckHandler(context: ProblemContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);

    parseRequest(emptyProblemRequestSchema, request.body ?? {});

    const result = await context.problems.previewReference(user.id, problemId);

    if (!result) throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');

    return libraryReferenceCheckResponseSchema.parse(result);
  };
}
