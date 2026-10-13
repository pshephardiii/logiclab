import { emptyAuthRequestSchema, classroomParamsSchema, invitationResponseSchema } from '@logiclab/contracts';
import type { RouteSchema } from '../../setup';
import { classroomErrorResponses } from '../schemas';
import type { FastifyInstance } from 'fastify';
import type { ClassroomContext } from '../context';
import { postInvitationHandler } from './handler';
export const postInvitationSchema = {
  summary: 'Replace a class invitation',
  description: 'Issue a seven-day invitation, invalidating its predecessor.',
  body: emptyAuthRequestSchema.nullish().transform(value => value ?? {}),
  params: classroomParamsSchema,
  response: { 200: invitationResponseSchema, ...classroomErrorResponses },
} satisfies RouteSchema;

export async function postInvitationRoute(app: FastifyInstance, context: ClassroomContext) {
  app.route({ method: 'POST', url: '/api/classes/:classId/invitation', schema: postInvitationSchema, handler: postInvitationHandler(context) });
}
