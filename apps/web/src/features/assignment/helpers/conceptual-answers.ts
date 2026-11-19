import { ProblemType } from '@logiclab/contracts/problem-type';
import type { ConceptualAnswer, StudentAssignment } from '@logiclab/contracts';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

type ConceptualItem = Extract<StudentAssignment['items'][number], { content: unknown }>;

export function blankConceptualAnswer(item: Pick<ConceptualItem, 'content'>): ConceptualAnswer {
  return item.content.type === ProblemType.TrueFalse
    ? { type: ProblemType.TrueFalse, answer: null }
    : { type: ProblemType.MultipleChoice, optionId: null };
}

/** Keep false distinct from unanswered, and preserve option identity rather than array position. */
export function savedConceptualAnswers(
  assignment: SavedStudentAssignment,
  attempt: SavedStudentAttempt | null,
) {
  const answers: Record<string, ConceptualAnswer> = {};

  for (const item of assignment.items) {
    if (
      !('content' in item) ||
      (item.content.type !== ProblemType.TrueFalse &&
        item.content.type !== ProblemType.MultipleChoice)
    )
      continue;

    const saved = attempt?.answers[item.id];

    answers[item.id] =
      saved &&
      !Array.isArray(saved) &&
      (saved.type === ProblemType.TrueFalse || saved.type === ProblemType.MultipleChoice)
        ? saved
        : blankConceptualAnswer({ content: item.content });
  }

  return answers;
}

export function sameConceptualAnswer(left: ConceptualAnswer, right?: ConceptualAnswer): boolean {
  if (left.type === ProblemType.TrueFalse)
    return right?.type === left.type && left.answer === right.answer;

  return right?.type === left.type && left.optionId === right.optionId;
}

export function conceptualAnswerFilled(answer?: ConceptualAnswer): boolean {
  return answer?.type === ProblemType.TrueFalse ? answer.answer !== null : answer?.optionId != null;
}
