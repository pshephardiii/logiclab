import type { FastifyRequest, FastifyReply } from 'fastify';
import { generateTruthTable } from '@logiclab/logic-engine';
import type { TruthTable, TruthTableColumn } from '@logiclab/logic-engine';
import {
  truthTableCheckRequestSchema,
  truthTableCheckResponseSchema,
} from '@logiclab/contracts';
import type { TruthTableCheckRequest, TruthTableCheckResponse } from '@logiclab/contracts';
import { badRequest } from '../errors';

type AnswerIndex = Map<string, boolean | null>;
type IndexedAnswers =
  | { success: true; answers: AnswerIndex }
  | { success: false; code: string; message: string };

/**
 * Checks submitted cells against a regenerated table, rejecting invalid/duplicate IDs and distinguishing blanks.
 */
export async function postCheckHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = truthTableCheckRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return badRequest(reply, 'INVALID_REQUEST', parsed.error.message);
  }

  const table = generateTruthTable(parsed.data.formula);
  const answerColumns = table.columns.filter(column => column.kind === 'answer');
  const indexed = indexSubmittedAnswers(table, answerColumns, parsed.data.answers);
  if (!indexed.success) {
    return badRequest(reply, indexed.code, indexed.message);
  }

  const feedback = buildFeedback(table, answerColumns, indexed.answers);
  return truthTableCheckResponseSchema.parse(feedback);
}

function cellKey(rowId: string, columnId: string): string {
  return JSON.stringify([rowId, columnId]);
}

/** Validate cell references before indexing, preserving submission-order error precedence. */
function indexSubmittedAnswers(
  table: TruthTable,
  answerColumns: readonly TruthTableColumn[],
  submitted: TruthTableCheckRequest['answers'],
): IndexedAnswers {
  const rowIds = new Set(table.rows.map(row => row.id));
  const columnIds = new Set(answerColumns.map(column => column.id));
  const answers: AnswerIndex = new Map();

  for (const answer of submitted) {
    if (!rowIds.has(answer.rowId) || !columnIds.has(answer.columnId)) {
      return {
        success: false,
        code: 'INVALID_CELL',
        message: 'Answers must reference an answer cell in this formula’s table.',
      };
    }

    const id = cellKey(answer.rowId, answer.columnId);
    if (answers.has(id)) {
      return {
        success: false,
        code: 'DUPLICATE_CELL',
        message: 'Submit each answer cell at most once.',
      };
    }
    answers.set(id, answer.value);
  }

  return { success: true, answers };
}

function buildFeedback(
  table: TruthTable,
  answerColumns: readonly TruthTableColumn[],
  answers: AnswerIndex,
): TruthTableCheckResponse {
  const cells: TruthTableCheckResponse['cells'] = [];
  const summary = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };

  for (const row of table.rows) {
    for (const column of answerColumns) {
      const value = answers.get(cellKey(row.id, column.id));
      const status = answerStatus(value, row.values[column.id]);
      cells.push({ rowId: row.id, columnId: column.id, status });
      summary[status]++;
      summary.total++;
    }
  }

  return { cells, summary };
}

function answerStatus(
  value: boolean | null | undefined,
  expected: boolean | undefined,
): TruthTableCheckResponse['cells'][number]['status'] {
  if (value == null) return 'unanswered';
  return value === expected ? 'correct' : 'incorrect';
}
