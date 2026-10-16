import type { FastifyInstance } from 'fastify';
import {
  studentClassParamsSchema,
  studentAssignmentListResponseSchema,
  studentAssignmentListQuerySchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { getStudentAssignmentsHandler } from './handler';

export const getStudentAssignmentsSchema = {
  summary: 'List published assignments for an enrolled class',
  description: 'Enrollment-scoped student work; feedback and solutions are enforced server-side.',
  params: studentClassParamsSchema,
  querystring: studentAssignmentListQuerySchema,
  response: { 200: studentAssignmentListResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function getStudentAssignmentsRoute(
  app: FastifyInstance,
  context: StudentWorkContext,
) {
  app.route({
    method: 'GET',
    url: '/api/student/classes/:classId/assignments',
    schema: getStudentAssignmentsSchema,
    handler: getStudentAssignmentsHandler(context),
  });
}
