import type { FastifyInstance } from 'fastify';
import { FormulaParseError } from '@logiclab/logic-engine';
import { badRequest } from './errors';
import { postExerciseRoute } from './postExercise/route';
import { postSolutionRoute } from './postSolution/route';
import { postCheckRoute } from './postCheck/route';

/** Public, stateless independent-practice routes. Assignment access will be separate. */
export async function truthTableRoutes(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof FormulaParseError) {
      return badRequest(reply, error.code, error.message, error.position);
    }
    if (error instanceof Error && 'code' in error &&
      (error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY')) {
      return badRequest(reply, 'INVALID_REQUEST', 'Provide a valid JSON request body.');
    }
    // Preserve Fastify's normal handling of unexpected/server errors.
    throw error;
  });

  app.register(postExerciseRoute);
  app.register(postSolutionRoute);
  app.register(postCheckRoute);
}
