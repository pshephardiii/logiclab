import {
  createLibraryProblemRequestSchema,
  libraryProblemResponseSchema,
} from '@logiclab/contracts/problem-library';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { libraryProblemDefinition } from '../../../application/problem/library-definition';
import type { ProblemContext } from '../context';
import { instructor } from '../helpers';
import { parseRequest } from '../../helpers/parse-request';

export function postProblemHandler(context: ProblemContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await instructor(request, context);
    const input = parseRequest(createLibraryProblemRequestSchema, request.body);
    libraryProblemDefinition(input.definition);
    const problem = await context.problems.create(user.id, input);
    reply.code(201);
    return libraryProblemResponseSchema.parse({ problem });
  };
}
