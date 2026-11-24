import type { FastifyRequest, FastifyReply } from 'fastify';
import { generatePracticeTruthTable } from '../../../application/truth-table/practice-table';
import { truthTableRequestSchema, truthTableSolutionResponseSchema } from '@logiclab/contracts';
import { badRequest } from '../errors';

export async function postSolutionHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableRequestSchema.safeParse(request.body);

  if (!parsed.success) return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);

  return truthTableSolutionResponseSchema.parse(generatePracticeTruthTable(parsed.data.formula));
}
