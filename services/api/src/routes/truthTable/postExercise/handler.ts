import type { FastifyRequest, FastifyReply } from 'fastify';
import { generateTruthTable } from '@logiclab/logic-engine';
import { truthTableRequestSchema, truthTableExerciseResponseSchema } from '@logiclab/contracts';
import { badRequest } from '../errors';

/**
 * Generates an independent-practice exercise and strips expected answers from editable columns.
 */
export async function postExerciseHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableRequestSchema.safeParse(request.body);
  if (!parsed.success) return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);
  const table = generateTruthTable(parsed.data.formula);
  const givenIds = new Set(
    table.columns.filter((column) => column.kind === 'given').map((column) => column.id),
  );
  return truthTableExerciseResponseSchema.parse({
    ...table,
    rows: table.rows.map((row) => ({
      id: row.id,
      values: Object.fromEntries(Object.entries(row.values).filter(([id]) => givenIds.has(id))),
    })),
  });
}
