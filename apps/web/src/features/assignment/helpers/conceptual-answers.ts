import type { ConceptualAnswer, StudentAssignment } from '@logiclab/contracts';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

type ConceptualItem = Extract<StudentAssignment['items'][number], { content: unknown }>;

export function blankConceptualAnswer(item: Pick<ConceptualItem, 'content'>): ConceptualAnswer {
  return item.content.type === 'true_false'
    ? { type: 'true_false', answer: null }
    : { type: 'multiple_choice', optionId: null };
}

/** Keep false distinct from unanswered, and preserve option identity rather than array position. */
export function savedConceptualAnswers(
  assignment: SavedStudentAssignment,
  attempt: SavedStudentAttempt | null,
) {
  const answers: Record<string, ConceptualAnswer> = {};
  for (const item of assignment.items) {
    if (!('content' in item) || item.content.type === 'derivation') continue;
    const saved = attempt?.answers[item.id];
    answers[item.id] =
      saved && !Array.isArray(saved) && saved.type !== 'derivation'
        ? saved
        : blankConceptualAnswer({ content: item.content });
  }
  return answers;
}

export function sameConceptualAnswer(left: ConceptualAnswer, right?: ConceptualAnswer): boolean {
  if (left.type === 'true_false') return right?.type === left.type && left.answer === right.answer;
  return right?.type === left.type && left.optionId === right.optionId;
}

export function conceptualAnswerFilled(answer?: ConceptualAnswer): boolean {
  return answer?.type === 'true_false' ? answer.answer !== null : answer?.optionId != null;
}
