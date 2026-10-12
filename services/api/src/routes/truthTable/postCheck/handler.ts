import type { FastifyRequest, FastifyReply } from 'fastify';
import { generateTruthTable } from '@logiclab/logic-engine';
import { truthTableCheckRequestSchema, truthTableCheckResponseSchema } from '@logiclab/schema';
import { badRequest } from '../errors';
import type { TruthTableCheckResponse } from '@logiclab/schema';

export async function postCheckHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableCheckRequestSchema.safeParse(request.body);
  if (!parsed.success) return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);
  const table = generateTruthTable(parsed.data.formula);
  const rowIds = new Set(table.rows.map(row => row.id));
  const answerColumns = table.columns.filter(column => column.kind === 'answer');
  const columnIds = new Set(answerColumns.map(column => column.id));
  const answers = new Map<string, boolean | null>();
  const key = (rowId: string, columnId: string) => JSON.stringify([rowId, columnId]);
  for (const answer of parsed.data.answers) {
    if (!rowIds.has(answer.rowId) || !columnIds.has(answer.columnId)) {
      return badRequest(reply, 'INVALID_CELL', 'Answers must reference an answer cell in this formula’s table.');
    }
    const id = key(answer.rowId, answer.columnId);
    if (answers.has(id)) return badRequest(reply, 'DUPLICATE_CELL', 'Submit each answer cell at most once.');
    answers.set(id, answer.value);
  }
  const cells: TruthTableCheckResponse['cells'] = [];
  const summary = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
  for (const row of table.rows) {
    for (const column of answerColumns) {
      const value = answers.get(key(row.id, column.id));
      const status = value == null ? 'unanswered' : value === row.values[column.id] ? 'correct' : 'incorrect';
      cells.push({ rowId: row.id, columnId: column.id, status });
      summary[status]++;
      summary.total++;
    }
  }
  return truthTableCheckResponseSchema.parse({ cells, summary });
}
