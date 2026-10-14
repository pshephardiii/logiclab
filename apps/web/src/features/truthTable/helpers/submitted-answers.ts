import type { TruthTableExerciseResponse, TruthTableCheckRequest } from '@logiclab/contracts';
import { cellKey, type Answers } from '../types';

/**
 * Serializes every editable exercise cell, treating missing entries as blank answers.
 */
export function submittedAnswers(
  exercise: TruthTableExerciseResponse,
  answers: Answers,
): TruthTableCheckRequest['answers'] {
  const answerColumns = exercise.columns.filter((column) => column.kind === 'answer');
  return exercise.rows.flatMap((row) =>
    answerColumns.map((column) => ({
      rowId: row.id,
      columnId: column.id,
      value: answers[cellKey(row.id, column.id)] ?? null,
    })),
  );
}
