import type { FastifyReply } from 'fastify';
import { truthTableErrorResponseSchema } from '@logiclab/contracts';

export function badRequest(reply: FastifyReply, code: string, message: string, position?: number) {
  return reply.code(400).send(truthTableErrorResponseSchema.parse({ error: { code, message, position } }));
}
