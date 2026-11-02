import type { FastifyInstance } from 'fastify';
import { studentAssignmentParamsSchema } from '@logiclab/contracts';
import {
  savedStudentAttemptResponseSchema,
  savedStudentAnswersSchema,
} from '@logiclab/contracts/saved-student-work';
import type { RouteSchema } from '../../setup';
import type { StudentWorkContext } from '../context';
import { studentWorkErrorResponses } from '../../error-responses';
import { patchStudentAttemptHandler } from './handler';

export const patchStudentAttemptSchema = {
  summary: 'Save answers for one assigned occurrence',
  description: 'Enrollment-scoped student work; feedback and solutions are enforced server-side.',
  params: studentAssignmentParamsSchema,
  body: savedStudentAnswersSchema,
  response: { 200: savedStudentAttemptResponseSchema, ...studentWorkErrorResponses },
} satisfies RouteSchema;

export async function patchStudentAttemptRoute(app: FastifyInstance, context: StudentWorkContext) {
  app.route({
    method: 'PATCH',
    url: '/api/student/assignments/:assignmentId/attempt',
    schema: patchStudentAttemptSchema,
    handler: patchStudentAttemptHandler(context),
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  });
}
