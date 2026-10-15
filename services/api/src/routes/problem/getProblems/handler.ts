import type { FastifyRequest, FastifyReply } from 'fastify';
import { problemListQuerySchema, problemListResponseSchema } from '@logiclab/contracts';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function getProblemsHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const { limit, offset } = parseRequest(problemListQuerySchema, request.query);
    const rows = await context.problems.list(user.id, limit + 1, offset);
    return problemListResponseSchema.parse({
      problems: rows.slice(0, limit),
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  };
}
