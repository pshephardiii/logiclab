import type { FastifyRequest, FastifyReply } from 'fastify';
import { generateTruthTable } from '@logiclab/logic-engine';
import { truthTableRequestSchema, truthTableSolutionResponseSchema } from '@logiclab/schema';
import { badRequest } from '../errors';

export async function postSolutionHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableRequestSchema.safeParse(request.body);
  if (!parsed.success) return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);
  return truthTableSolutionResponseSchema.parse(generateTruthTable(parsed.data.formula));
}
