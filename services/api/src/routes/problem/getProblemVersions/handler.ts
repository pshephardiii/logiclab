import type { FastifyRequest } from 'fastify';
import {
  problemParamsSchema,
  problemVersionListQuerySchema,
  problemVersionListResponseSchema,
} from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { ProblemError } from '../errors';

export function getProblemVersionsHandler(context: ProblemContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { problemId } = parseRequest(problemParamsSchema, request.params);
    const { limit, offset } = parseRequest(problemVersionListQuerySchema, request.query);
    const rows = await context.problems.listVersions(user.id, problemId, limit + 1, offset);
    if (!rows) throw new ProblemError(404, 'PROBLEM_NOT_FOUND', 'Problem not found.');
    return problemVersionListResponseSchema.parse({
      versions: rows.slice(0, limit),
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  };
}
