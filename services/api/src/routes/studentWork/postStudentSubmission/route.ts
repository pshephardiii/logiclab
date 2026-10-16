import type { FastifyInstance } from 'fastify';
import {
  studentAssignmentParamsSchema,
  studentAttemptResponseSchema,
  submitStudentAttemptSchema,
} from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { postStudentSubmissionHandler } from './handler';

export const postStudentSubmissionSchema = {
  summary: 'Finalize saved work and return official feedback',
  description: 'Enrollment-scoped student work; feedback and solutions are enforced server-side.',
  params: studentAssignmentParamsSchema,
  body: submitStudentAttemptSchema,
  response: { 200: studentAttemptResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function postStudentSubmissionRoute(
  app: FastifyInstance,
  context: StudentWorkContext,
) {
  app.route({
    method: 'POST',
    url: '/api/student/assignments/:assignmentId/submission',
    schema: postStudentSubmissionSchema,
    handler: postStudentSubmissionHandler(context),
  });
}
