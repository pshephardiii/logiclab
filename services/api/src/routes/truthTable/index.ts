import { installZodSchemas } from '../setup';
import type { ZodType } from 'zod';
import type { FastifyInstance } from 'fastify';
import { FormulaParseError } from '@logiclab/logic-engine';
import { badRequest } from './errors';
import { postExerciseRoute } from './postExercise/route';
import { postSolutionRoute } from './postSolution/route';
import { postCheckRoute } from './postCheck/route';

/** Public, stateless independent-practice routes. Assignment access will be separate. */
export async function truthTableRoutes(app: FastifyInstance) {
  installZodSchemas(app);
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Error && 'validation' in error) {
      // Keep the existing public Zod issue message for invalid practice input.
      const schema = request.routeOptions.schema?.body as ZodType;
      const parsed = schema.safeParse(request.body);
      return badRequest(reply, 'INVALID_REQUEST', parsed.success ? 'Invalid request.' : parsed.error.message);
    }
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
