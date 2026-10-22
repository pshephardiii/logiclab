import type { FastifyInstance } from 'fastify';
import { studentItemParamsSchema, studentSolutionResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { getStudentSolutionHandler } from './handler';

export const getStudentSolutionSchema = {
  summary: 'Read an assigned solution when its release policy permits',
  description: 'Enrollment-scoped student work; feedback and solutions are enforced server-side.',
  params: studentItemParamsSchema,
  response: { 200: studentSolutionResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function getStudentSolutionRoute(app: FastifyInstance, context: StudentWorkContext) {
  app.route({
    method: 'GET',
    url: '/api/student/assignments/:assignmentId/items/:itemId/solution',
    schema: getStudentSolutionSchema,
    handler: getStudentSolutionHandler(context),
  });
}
