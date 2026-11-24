import { exerciseResponse } from '../../../application/truth-table/exercise';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { generatePracticeTruthTable } from '../../../application/truth-table/practice-table';
import { truthTableRequestSchema } from '@logiclab/contracts';
import { badRequest } from '../errors';

/**
 * Generates an independent-practice exercise and strips expected answers from editable columns.
 */
export async function postExerciseHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableRequestSchema.safeParse(request.body);

  if (!parsed.success) return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);

  const table = generatePracticeTruthTable(parsed.data.formula);

  return exerciseResponse(table);
}
