import type { FastifyInstance } from 'fastify';
import { studentAssignmentParamsSchema } from '@logiclab/contracts';
import { savedStudentAssignmentResponseSchema } from '@logiclab/contracts/saved-student-work';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { getStudentAssignmentHandler } from './handler';

export const getStudentAssignmentSchema = {
  summary: 'Read assigned work and saved attempt',
  description: 'Enrollment-scoped student work; feedback and solutions are enforced server-side.',
  params: studentAssignmentParamsSchema,
  response: { 200: savedStudentAssignmentResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function getStudentAssignmentRoute(app: FastifyInstance, context: StudentWorkContext) {
  app.route({
    method: 'GET',
    url: '/api/student/assignments/:assignmentId',
    schema: getStudentAssignmentSchema,
    handler: getStudentAssignmentHandler(context),
  });
}
