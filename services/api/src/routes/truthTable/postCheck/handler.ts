import { indexSubmittedAnswers, buildFeedback } from '../../../application/truth-table/checking';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { generateTruthTable } from '@logiclab/logic-engine';
import { truthTableCheckRequestSchema, truthTableCheckResponseSchema } from '@logiclab/contracts';
import { badRequest } from '../errors';

/**
 * Checks submitted cells against a regenerated table, rejecting invalid/duplicate IDs and distinguishing blanks.
 */
export async function postCheckHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableCheckRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);
  }

  const table = generateTruthTable(parsed.data.formula);
  const answerColumns = table.columns.filter((column) => column.kind === 'answer');
  const indexed = indexSubmittedAnswers(table, answerColumns, parsed.data.answers);
  if (!indexed.success) {
    return badRequest(reply, indexed.code, indexed.message);
  }

  const feedback = buildFeedback(table, answerColumns, indexed.answers);
  return truthTableCheckResponseSchema.parse(feedback);
}
