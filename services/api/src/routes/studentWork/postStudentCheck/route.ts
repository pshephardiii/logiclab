import type { FastifyInstance } from 'fastify';
import {
  studentAssignmentParamsSchema,
  checkStudentAnswersSchema,
  studentCheckResponseSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { postStudentCheckHandler } from './handler';

export const postStudentCheckSchema = {
  summary: 'Check transient answers when assignment policy permits',
  description:
    'Enrollment-scoped feedback only; does not save answers, submit work, or record a grade.',
  params: studentAssignmentParamsSchema,
  body: checkStudentAnswersSchema,
  response: { 200: studentCheckResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function postStudentCheckRoute(app: FastifyInstance, context: StudentWorkContext) {
  app.route({
    method: 'POST',
    url: '/api/student/assignments/:assignmentId/check',
    schema: postStudentCheckSchema,
    handler: postStudentCheckHandler(context),
  });
}
