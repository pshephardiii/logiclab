import { generateTruthTable } from '@logiclab/logic-engine';
import type { TruthTableAnswer, SubmissionResult } from '@logiclab/contracts';
import { indexSubmittedAnswers, buildFeedback } from '../truth-table/checking';
import { StudentWorkError } from './errors';

/** Validate references on save without returning correctness or expected values. */
export function validateAnswers(formula: string, answers: TruthTableAnswer[]) {
  const table = generateTruthTable(formula);
  const columns = table.columns.filter((column) => column.kind === 'answer');
  const indexed = indexSubmittedAnswers(table, columns, answers);
  if (!indexed.success)
    throw new StudentWorkError(
      indexed.code === 'DUPLICATE_CELL' ? 'duplicate_cell' : 'invalid_cell',
    );
  return { table, columns, answers: indexed.answers };
}

/** Grade every assigned occurrence, including untouched items and blank cells. */
export function evaluateSubmission(
  items: { id: string; formula: string }[],
  saved: Record<string, TruthTableAnswer[]>,
): SubmissionResult {
  const summary = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
  const feedback = items.map((item) => {
    const validated = validateAnswers(item.formula, saved[item.id] ?? []);
    const result = buildFeedback(validated.table, validated.columns, validated.answers);
    summary.correct += result.summary.correct;
    summary.incorrect += result.summary.incorrect;
    summary.unanswered += result.summary.unanswered;
    summary.total += result.summary.total;
    return { itemId: item.id, feedback: result };
  });
  return { gradingVersion: 'truth_table_v1', items: feedback, summary };
}

/** Transient feedback shares submission validation but never produces a persisted result. */
export function checkAssignedAnswers(formula: string, answers: TruthTableAnswer[]) {
  const validated = validateAnswers(formula, answers);
  return buildFeedback(validated.table, validated.columns, validated.answers);
}
