import type { FastifyRequest } from 'fastify';
import {
  problemParamsSchema,
  problemVersionParamsSchema,
  problemVersionResponseSchema,
} from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { ProblemError } from '../errors';

export function getProblemVersionHandler(context: ProblemContext) {
  return async (request: FastifyRequest) => {
    const user = await instructor(request, context);
    const { problemId, version } = parseRequest(problemVersionParamsSchema, request.params);
    const published = await context.problems.findVersion(user.id, problemId, version);
    if (!published)
      throw new ProblemError(404, 'PROBLEM_VERSION_NOT_FOUND', 'Problem version not found.');
    return problemVersionResponseSchema.parse({ version: published });
  };
}
