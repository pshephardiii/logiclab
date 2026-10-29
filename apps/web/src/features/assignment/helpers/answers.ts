import type {
  StudentAssignment,
  StudentAttempt,
  AssignmentResponseValue,
} from '@logiclab/contracts';
import { cellKey, type Answers } from '../../truthTable/types';
import { submittedAnswers } from '../../truthTable/helpers/submitted-answers';

export function answerMap(answers: AssignmentResponseValue): Answers {
  if (!Array.isArray(answers)) return {};
  return Object.fromEntries(
    answers.map((answer) => [cellKey(answer.rowId, answer.columnId), answer.value]),
  );
}

/** Normalize omitted cells to blanks so reverting an input clears its dirty state. */
export function savedAnswerMaps(
  assignment: StudentAssignment,
  attempt: StudentAttempt | null,
): Record<string, Answers> {
  return Object.fromEntries(
    assignment.items.map((item) => [
      item.id,
      'exercise' in item
        ? answerMap(submittedAnswers(item.exercise, answerMap(attempt?.answers[item.id] ?? [])))
        : {},
    ]),
  );
}
export function sameAnswers(left: Answers, right: Answers | undefined): boolean {
  if (left === right) return true;
  if (!right) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}
